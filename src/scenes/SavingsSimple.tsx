import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * Simplest example of Savings (Clarke–Wright) + Nearest Neighbour, without voice.
 * 6 stops whose loads add up to 2 pallets; the vehicle carries 1 pallet per trip.
 * Savings starts with one trip per stop, ranks every pair by saving = d(K,i) + d(K,j) − d(i,j) and merges the two
 * trips when the merged load still fits (≤ 1 pallet) – so it optimises both distance and how full each trip is.
 * Nearest neighbour then orders each trip from the door: closest location first, then the closest to it.
 * The map is laid out so that this order also reads as the stops being picked one by one (A is just closest to
 * the door). Straight-line distances, 1 m = 10 px.
 * Vietnamese is the large line.
 */
type Pt = [number, number];
const dd = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) / 10;
const DEPOT: Pt = [810, 900];
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const P: Pt[] = [[420, 590], [470, 370], [700, 380], [980, 400], [1220, 540], [1350, 700]];
const LOAD = [0.4, 0.3, 0.3, 0.3, 0.4, 0.3]; // share of one pallet
// load gauge above each stop; A's goes below, since its link to B runs straight up
const LBL_Y = [96, -62, -62, -62, -62, -62];
const CAP = 1;
const N = P.length;
const R = (x: number) => Math.round(x);
const fmt = (x: number) => x.toFixed(1);
/** Distance between two stops as shown on screen, in metres. */
const DIST = (a: number, b: number) => R(dd(P[a], P[b]));
/** Saving as shown on screen: built from the rounded distances, so the on-screen arithmetic adds up. */
const SV = (a: number, b: number) => R(dd(DEPOT, P[a])) + R(dd(DEPOT, P[b])) - R(dd(P[a], P[b]));

// ---- Savings with capacity ----
type Step = {a: number; b: number; save: number; kind: 'merge' | 'same' | 'cap'; load: number};
const STEPS: Step[] = [];
const ROUTES_AFTER: number[][][] = []; // routes (as stop lists) after each step
{
  const pairs: {a: number; b: number; save: number}[] = [];
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) pairs.push({a, b, save: dd(DEPOT, P[a]) + dd(DEPOT, P[b]) - dd(P[a], P[b])});
  pairs.sort((p, q) => q.save - p.save);
  let routes: number[][] = P.map((_, i) => [i]);
  for (const p of pairs) {
    const ra = routes.find((r) => r.includes(p.a))!;
    const rb = routes.find((r) => r.includes(p.b))!;
    const load = [...new Set([...ra, ...rb])].reduce((t, i) => t + LOAD[i], 0);
    let kind: Step['kind'];
    if (ra === rb) kind = 'same';
    else if (load > CAP + 1e-9) kind = 'cap';
    else {
      kind = 'merge';
      routes = [...routes.filter((r) => r !== ra && r !== rb), [...ra, ...rb]];
    }
    STEPS.push({...p, kind, load: ra === rb ? ra.reduce((t, i) => t + LOAD[i], 0) : load});
    ROUTES_AFTER.push(routes.map((r) => [...r]));
  }
}
// ---- trips as Savings builds them ----
// Each Savings trip in nearest-neighbour order from the door, grown one stop at a time.
type Trip = {chain: number[]; seed: [number, number]};
const TRIPS: Trip[] = [];
{
  const nnOrder = (r: number[]) => {
    const rest = [...r];
    const order: number[] = [];
    let cur = DEPOT;
    while (rest.length) {
      rest.sort((x, y) => dd(cur, P[x]) - dd(cur, P[y]));
      order.push(rest.shift()!);
      cur = P[order[order.length - 1]];
    }
    return order;
  };
  const chains = ROUTES_AFTER[ROUTES_AFTER.length - 1].map(nnOrder);
  // the trip with the location closest to the door goes first
  chains.sort((x, y) => dd(DEPOT, P[x[0]]) - dd(DEPOT, P[y[0]]));
  for (const chain of chains) TRIPS.push({chain, seed: [chain[0], chain[1]]});
}
const TRIP_COL = [colors.green, '#4dd0e1'];
const loadOf = (r: number[]) => r.reduce((a, i) => a + LOAD[i], 0);

// ---- timeline (seconds) ----
const T = {pts: 1.0, alone: 5.0, build: 9.0, done: 0, result: 0};
const GROW = 0.7; // one green link
const SEED_SHOW = 2.6; // dashed pair + metres before the first links grow
const CAND_SHOW = 2.4; // candidates: which ones fit
const CAND_JUDGE = 3.0; // candidates: metres cut, winner
const FULL_HOLD = 2.6;
type Seg = {a: Pt; b: Pt; at: number; trip: number};
type Cand = {trip: number; at: number; from: number; win: number; rivals: number[]; heavy: number[]; room: number};
const SEGS: Seg[] = [];
const CANDS: Cand[] = [];
const SEED_AT: number[] = [];
const CLOSE_AT: number[] = [];
const FULL_AT: number[] = [];
const JOIN_AT: number[] = P.map(() => Infinity); // when a stop joins a trip (its grey spoke goes)
{
  let at = T.build;
  const used: number[] = [];
  TRIPS.forEach((tr, ti) => {
    const c = tr.chain;
    SEED_AT.push(at);
    at += SEED_SHOW;
    JOIN_AT[c[0]] = JOIN_AT[c[1]] = at;
    SEGS.push({a: DEPOT, b: P[c[0]], at, trip: ti});
    at += GROW;
    SEGS.push({a: P[c[0]], b: P[c[1]], at, trip: ti});
    at += GROW + 0.3;
    for (let j = 2; j < c.length; j++) {
      const inTrip = c.slice(0, j);
      const room = CAP - loadOf(inTrip);
      const out = P.map((_, i) => i).filter((i) => !used.includes(i) && !inTrip.includes(i));
      const fit = out.filter((i) => LOAD[i] <= room + 1e-9);
      const from = c[j - 1];
      CANDS.push({trip: ti, at, from, win: c[j], room, rivals: fit.filter((i) => i !== c[j]).sort((x, y) => dd(P[from], P[x]) - dd(P[from], P[y])), heavy: out.filter((i) => LOAD[i] > room + 1e-9)});
      at += CAND_SHOW + CAND_JUDGE;
      JOIN_AT[c[j]] = at;
      SEGS.push({a: P[from], b: P[c[j]], at, trip: ti});
      at += GROW + 0.3;
    }
    CLOSE_AT.push(at);
    SEGS.push({a: P[c[c.length - 1]], b: DEPOT, at, trip: ti});
    at += GROW;
    FULL_AT.push(at);
    at += FULL_HOLD;
    used.push(...c);
  });
  T.done = at + 0.4;
}
T.result = T.done + 4.5;
export const SAVINGS_SIMPLE_SECONDS = Math.ceil(T.result + 6.0);

const loopPts = (order: number[]): Pt[] => [DEPOT, ...order.map((i) => P[i]), DEPOT];
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
const Loop: React.FC<{order: number[]; color: string; draw?: number; opacity?: number; w?: number; dash?: string}> = ({order, color, draw = 1, opacity = 1, w = 5, dash}) => {
  const pts = loopPts(order);
  const L = plen(pts);
  return draw > 0 && opacity > 0 ? (
    <path d={pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round"
      opacity={opacity} strokeDasharray={dash ?? `${L * draw} ${L + 10}`} />
  ) : null;
};

/** Capacity gauge: how full the vehicle is (1 = one pallet). */
const Gauge: React.FC<{load: number; color: string; w?: number}> = ({load, color, w = 120}) => (
  <span style={{display: 'inline-block', width: w, height: 20, borderRadius: 5, border: `2px solid ${color}`, verticalAlign: 'middle', position: 'relative', overflow: 'hidden'}}>
    <span style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(1, load) * 100}%`, background: color}} />
  </span>
);

export const SavingsSimple: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  const fade = (a: number, b: number) => interpolate(t, [a, b], [0, 1], clamp);
  const pop = (at: number) => spring({frame: frame - at * fps, fps, config: {damping: 14}});

  const done = t >= T.done;
  const result = t >= T.result;
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const tripOf = (i: number) => TRIPS.findIndex((tr) => tr.chain.includes(i));
  // what is happening now
  const seedI = SEED_AT.findIndex((a, ti) => t >= a && t < a + SEED_SHOW + 2 * GROW && ti === SEED_AT.filter((x) => x <= t).length - 1);
  const cand = CANDS.find((c) => t >= c.at && t < c.at + CAND_SHOW + CAND_JUDGE + GROW);
  const cu = cand ? t - cand.at : 0;
  const closeI = CLOSE_AT.findIndex((a) => t >= a && t < a + GROW);
  const fullI = FULL_AT.findIndex((a) => t >= a && t < a + FULL_HOLD);
  const names = (xs: number[]) => xs.map((i) => NAMES[i]).join(', ');

  const cap: [string, string] = (() => {
    if (t < T.alone) return ['6 vị trí lấy hàng, tổng 2 pallet. Mỗi chuyến xe pallet mover chở tối đa 1 pallet ra cửa.', '6 pick locations, 2 pallets of goods in total. The pallet mover carries 1 pallet per trip to the door.'];
    if (t < T.build) return ['Ban đầu: mỗi vị trí một chuyến riêng – 6 chuyến, xe về cửa gần như rỗng', 'Start: one trip per location – 6 trips, the mover returns almost empty'];
    if (fullI >= 0 && !done) {
      const n = fullI + 1;
      return fullI === TRIPS.length - 1
        ? [`Chuyến ${n} đã đầy 1.0 pallet → mọi vị trí đã có chuyến`, `Trip ${n} is full: 1.0 pallet → every location has a trip`]
        : [`Chuyến ${n} đã đầy 1.0 pallet → chốt chuyến, sang chuyến tiếp theo`, `Trip ${n} is full: 1.0 pallet → close it, start the next trip`];
    }
    if (closeI >= 0) return [`Chuyến ${closeI + 1}: lấy xong, mang hàng ra cửa`, `Trip ${closeI + 1}: picking done, back to the door`];
    if (cand) {
      const w = NAMES[cand.win];
      if (cu < CAND_SHOW) {
        const heavy = cand.heavy.length ? `, ${names(cand.heavy)} quá nặng` : '';
        const heavyEn = cand.heavy.length ? `, ${names(cand.heavy)} too heavy` : '';
        const fit = [cand.win, ...cand.rivals];
        return [`Xe còn chỗ cho ${fmt(cand.room)} pallet: ${names(fit)} ${fit.length > 1 ? 'đều vừa' : 'vừa'}${heavy}`, `The mover has room for ${fmt(cand.room)} pallet: ${names(fit)} ${fit.length > 1 ? 'fit' : 'fits'}${heavyEn}`];
      }
      const f = NAMES[cand.from];
      if (!cand.rivals.length) return [`Chỉ còn ${w} vừa → thêm ${w} vào chuyến (cách ${f} ${DIST(cand.from, cand.win)} m)`, `Only ${w} fits → add ${w} to the trip (${DIST(cand.from, cand.win)} m from ${f})`];
      const list = [cand.win, ...cand.rivals].map((i) => `${NAMES[i]} ${DIST(cand.from, i)} m`).join(' < ');
      return [`Chọn ${w} vì gần ${f} nhất: ${list}`, `${w} is the closest to ${f}: ${list}`];
    }
    if (seedI >= 0) {
      const [a, b] = TRIPS[seedI].seed.map((i) => NAMES[i]);
      const d0 = R(dd(DEPOT, P[TRIPS[seedI].seed[0]]));
      const m = DIST(TRIPS[seedI].seed[0], TRIPS[seedI].seed[1]);
      return seedI === 0
        ? [`Chuyến 1 bắt đầu từ ${a}, vị trí gần cửa nhất (${d0} m) → ${b} gần ${a} nhất (${m} m)`, `Trip 1 starts at ${a}, the closest location to the door (${d0} m) → ${b} is the closest to ${a} (${m} m)`]
        : [`Chuyến ${seedI + 1}: trong các vị trí còn lại, ${a} gần cửa nhất (${d0} m) → ${b} gần ${a} nhất (${m} m)`, `Trip ${seedI + 1}: of the rest, ${a} is the closest to the door (${d0} m) → ${b} is the closest to ${a} (${m} m)`];
    }
    if (!done) return ['Lần lượt gộp chuyến, miễn xe còn chở vừa (≤ 1 pallet)', 'Merge trips one by one, as long as the mover can still carry it (≤ 1 pallet)'];
    if (!result) return ['Hai chuyến đều đầy, mọi vị trí đã được lấy: mỗi chuyến đi từ vị trí gần cửa nhất, lấy xong về cửa', 'Both trips are full and every location is picked: each trip starts closest to the door and ends at the door'];
    return ['', ''];
  })();

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 70, top: 40}}>
        <div style={{fontSize: 48, fontWeight: 800}}>
          <span style={{color: colors.green}}>Savings Algorithm</span> <span style={{color: colors.muted, fontWeight: 600}}>+</span> <span style={{color: colors.yellow}}>Nearest Neighbour Algorithm</span>
        </div>
        <div style={{fontSize: 22, color: colors.muted}}>Simulation · Mô phỏng</div>
      </div>
      {/* which algorithm is working now */}
      <div style={{position: 'absolute', left: 70, top: 150, display: 'flex', gap: 14, opacity: fade(T.build - 0.4, T.build) * (1 - fade(T.result - 0.3, T.result))}}>
        {[
          {n: '1', name: 'SAVINGS ALGORITHM', c: colors.green, en: 'decides which locations share a trip (within capacity)', vi: 'quyết định vị trí nào lấy chung một chuyến (trong sức chứa)'},
          {n: '2', name: 'NEAREST NEIGHBOUR ALGORITHM', c: colors.yellow, en: 'orders each trip, nearest location first', vi: 'sắp thứ tự từng chuyến, vị trí gần nhất trước'},
        ].map((a) => (
          <div key={a.n} style={{padding: '10px 18px', borderRadius: 14, border: `3px solid ${a.c}`, background: `${a.c}1f`, boxShadow: `0 0 18px ${a.c}66`, maxWidth: 600}}>
            <div style={{fontSize: 22, fontWeight: 800, color: a.c, whiteSpace: 'nowrap'}}>
              STEP {a.n} · {a.name}
            </div>
            <div style={{fontSize: 19, fontWeight: 600}}>{a.en}</div>
            <div style={{fontSize: 15, color: colors.muted}}>{a.vi}</div>
          </div>
        ))}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {/* one trip per location: grey spokes, each one goes when its stop joins a trip */}
        {P.map((p, i) => (
          <Loop key={`s${i}`} order={[i]} color="#8f9bb5" w={4} draw={fade(T.alone + i * 0.25, T.alone + i * 0.25 + 0.8)}
            opacity={0.85 * (1 - fade(JOIN_AT[i], JOIN_AT[i] + 0.4))} />
        ))}

        {/* the trips, link by link in the order the stops were picked */}
        {SEGS.map((sg, n) => {
          const g = interpolate(t, [sg.at, sg.at + GROW], [0, 1], ease);
          return g > 0 ? (
            <line key={`g${n}`} x1={sg.a[0]} y1={sg.a[1]} x2={sg.a[0] + (sg.b[0] - sg.a[0]) * g} y2={sg.a[1] + (sg.b[1] - sg.a[1]) * g}
              stroke={TRIP_COL[sg.trip]} strokeWidth={done ? 7 : 6} strokeLinecap="round" />
          ) : null;
        })}

        {/* the pair that starts a trip: dashed link + metres cut */}
        {seedI >= 0
          ? (() => {
              const [a, b] = TRIPS[seedI].seed;
              const su = t - SEED_AT[seedI];
              const o = interpolate(su, [0, 0.4, SEED_SHOW + GROW, SEED_SHOW + 2 * GROW], [0, 1, 1, 0], clamp);
              // label on the door side of the dashed link, clear of the pallet labels above the stops
              let nx = -(P[b][1] - P[a][1]);
              let ny = P[b][0] - P[a][0];
              const nl = Math.hypot(nx, ny);
              if (nx * (DEPOT[0] - P[a][0]) + ny * (DEPOT[1] - P[a][1]) < 0) {
                nx = -nx;
                ny = -ny;
              }
              const mx = (P[a][0] + P[b][0]) / 2 + (nx / nl) * 30;
              const my = (P[a][1] + P[b][1]) / 2 + (ny / nl) * 30 + 10;
              const pulse = 1 + 0.12 * Math.sin(t * 7);
              return (
                <g opacity={o}>
                  {/* the start: the location closest to the door */}
                  <line x1={DEPOT[0]} y1={DEPOT[1]} x2={P[a][0]} y2={P[a][1]} stroke={colors.yellow} strokeWidth={5} strokeDasharray="12 9" />
                  <line x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={colors.yellow} strokeWidth={5} strokeDasharray="12 9"
                    opacity={interpolate(su, [0.5, 0.9], [0, 1], clamp)} />
                  {[a, b].map((i) => <circle key={i} cx={P[i][0]} cy={P[i][1]} r={50 * pulse} fill="none" stroke={colors.yellow} strokeWidth={5} />)}
                  <text x={mx} y={my} textAnchor={nx < 0 ? 'end' : 'start'} fontSize={28} fontWeight={800} fill={colors.yellow} stroke="#0b1222" strokeWidth={7} style={{paintOrder: 'stroke'}}
                    opacity={interpolate(su, [0.6, 1.0], [0, 1], clamp)}>
                    {DIST(a, b)} m · closest
                  </text>
                </g>
              );
            })()
          : null}

        {/* the choice: every stop that still fits competes on metres cut, the others are too heavy */}
        {cand && cu < CAND_SHOW + CAND_JUDGE + GROW
          ? [cand.win, ...cand.rivals, ...cand.heavy].map((i, n) => {
              const from = P[cand.from];
              const win = i === cand.win;
              const heavy = cand.heavy.includes(i);
              const judged = cu > CAND_SHOW;
              const col = heavy ? '#8f9bb5' : judged ? (win ? colors.green : colors.red) : colors.yellow;
              const pulse = 1 + 0.12 * Math.sin(t * 7);
              const sh = interpolate(cu, [0.3 + n * 0.35, 0.8 + n * 0.35], [0, 1], clamp) * (1 - interpolate(cu, [CAND_SHOW + CAND_JUDGE, CAND_SHOW + CAND_JUDGE + GROW], [0, 1], clamp));
              // rivals low on the map bend under the heavy stop so the arc never crosses it
              const under = !win && !heavy && P[i][1] > 450;
              const ctrlY = win ? Math.min(from[1], P[i][1]) : under ? Math.max(from[1], P[i][1]) + 100 : Math.min(from[1], P[i][1]) - 60 - 40 * n;
              const lx = heavy ? P[i][0] - 62 : win ? P[i][0] - 30 : under ? P[i][0] + 50 : P[i][0] + 62;
              const ly = heavy ? P[i][1] + 10 : win || under ? P[i][1] + 100 : P[i][1] + 10;
              const anchor = heavy || under ? 'end' : win ? 'middle' : 'start';
              const label = heavy
                ? `+${fmt(LOAD[i])} → ${fmt(CAP - cand.room + LOAD[i])} too heavy`
                : judged
                  ? win
                    ? `✓ ${DIST(cand.from, i)} m${cand.rivals.length ? ' · closest' : ''}`
                    : `✗ ${DIST(cand.from, i)} m`
                  : `+${fmt(LOAD[i])} → ${fmt(CAP - cand.room + LOAD[i])} fits`;
              return (
                <g key={i} opacity={sh * (heavy ? 0.85 : 1)}>
                  {heavy ? null : (
                    <path d={`M${from[0]} ${from[1]} Q${(from[0] + P[i][0]) / 2} ${ctrlY} ${P[i][0]} ${P[i][1]}`} fill="none" stroke={col} strokeWidth={5}
                      strokeDasharray="12 9" opacity={judged && !win ? 0.6 : 1} />
                  )}
                  <circle cx={P[i][0]} cy={P[i][1]} r={50 * pulse} fill="none" stroke={col} strokeWidth={5} strokeDasharray={heavy ? '6 6' : undefined} />
                  <text x={lx} y={ly} textAnchor={anchor} fontSize={26} fontWeight={800} fill={col}
                    stroke="#0b1222" strokeWidth={7} style={{paintOrder: 'stroke'}}>
                    {label}
                  </text>
                </g>
              );
            })
          : null}

        {/* FULL badge beside each trip once it is back at the door with 1.0 pallet */}
        {TRIPS.map((tr, ti) => {
          if (t < FULL_AT[ti] || result) return null;
          // on the open side of the map, so it never sits on a line
          const left = tr.chain.reduce((a, i) => a + P[i][0], 0) / tr.chain.length < DEPOT[0];
          const [cx, cy] = left ? [250, 790] : [1590, 790];
          const col = TRIP_COL[ti];
          const sc = spring({frame: frame - FULL_AT[ti] * fps, fps, config: {damping: 12}});
          return (
            <g key={`full${ti}`} transform={`translate(${cx} ${cy}) scale(${sc})`}>
              <rect x={-150} y={-44} width={300} height={88} rx={16} fill="#0b1222" stroke={col} strokeWidth={4} />
              <text y={-6} textAnchor="middle" fontSize={30} fontWeight={800} fill={col}>
                ✓ TRIP {ti + 1} FULL
              </text>
              <text y={28} textAnchor="middle" fontSize={22} fontWeight={700} fill={colors.text}>
                {fmt(loadOf(tr.chain))} pallet · đầy xe
              </text>
            </g>
          );
        })}

        {/* depot + stops */}
        <g transform={`translate(${DEPOT[0]} ${DEPOT[1]}) scale(${pop(0.5)})`}>
          <rect x={-60} y={-30} width={120} height={60} rx={10} fill={colors.amber} />
          <text y={9} textAnchor="middle" fontSize={24} fontWeight={800} fill="#0b1222">
            DOOR
          </text>
        </g>
        {P.map((p, i) => {
          const ti = tripOf(i);
          const pos = TRIPS[ti].chain.indexOf(i);
          const joined = t >= JOIN_AT[i] + (pos === 0 ? GROW : pos === 1 ? 2 * GROW : GROW);
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${pop(T.pts + i * 0.2)})`}>
              <circle r={34} fill={joined ? TRIP_COL[ti] : colors.amber} stroke="#0b1222" strokeWidth={4} />
              <text y={11} textAnchor="middle" fontSize={32} fontWeight={800} fill="#0b1222">
                {NAMES[i]}
              </text>
              <rect x={-30} y={LBL_Y[i]} width={60} height={14} rx={4} fill="none" stroke={colors.muted} strokeWidth={2} />
              <rect x={-30} y={LBL_Y[i]} width={60 * LOAD[i]} height={14} rx={4} fill={colors.amber} />
              <text y={LBL_Y[i] - 8} textAnchor="middle" fontSize={20} fontWeight={700} fill={colors.muted}>
                {fmt(LOAD[i])} pallet
              </text>
              {done ? (
                <g transform="translate(32 26)">
                  <circle r={16} fill="#fff" stroke="#0b1222" strokeWidth={3} />
                  <text y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0b1222">
                    {pos + 1}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* trip cards once both trips are built */}
      {done && !result ? (
        <div style={{position: 'absolute', left: 1440, top: 330, width: 460}}>
          {TRIPS.map((tr, ti) => (
            <div key={ti} style={{marginBottom: 22, opacity: fade(T.done + ti * 0.4, T.done + ti * 0.4 + 0.4)}}>
              <div style={{fontSize: 26, fontWeight: 800, color: TRIP_COL[ti]}}>
                Trip {ti + 1}: Door → {tr.chain.map((i) => NAMES[i]).join(' → ')} → Door
              </div>
              <div style={{fontSize: 22, marginTop: 4}}>
                Load {fmt(loadOf(tr.chain))} pallet <Gauge load={loadOf(tr.chain)} color={TRIP_COL[ti]} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* result */}
      {result ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res * 0.92, background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)'}} />
          <div style={{position: 'absolute', left: 960, top: 450, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res,
            width: 1100, padding: '40px 56px', borderRadius: 26, background: '#0e1628', border: `3px solid ${colors.green}`, boxShadow: `0 0 40px ${colors.green}44`}}>
            <div style={{fontSize: 44, fontWeight: 800}}>The algorithm, on every trip</div>
            <div style={{fontSize: 24, color: colors.muted, marginBottom: 26}}>Thuật toán, trên mỗi chuyến</div>
            {[
              {n: '1', en: 'Route optimization', vi: 'Tối ưu lộ trình', sub: 'Pick nearby locations together', subVi: 'Lấy chung các vị trí gần nhau'},
              {n: '2', en: 'Capacity optimization', vi: 'Tối ưu sức chứa', sub: 'Fill the mover before going to the door', subVi: 'Chất đầy xe rồi mới ra cửa'},
            ].map((it, n) => {
              const o = fade(T.result + 0.6 + n * 0.6, T.result + 1.0 + n * 0.6);
              return (
                <div key={it.n} style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: n ? 22 : 0, opacity: o, transform: `translateX(${(1 - o) * 30}px)`}}>
                  <div style={{width: 76, height: 76, flex: 'none', borderRadius: 38, background: colors.green, color: '#0b1222', fontSize: 42, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {it.n}
                  </div>
                  <div>
                    <div style={{fontSize: 40, fontWeight: 800, color: colors.green, lineHeight: 1.15}}>{it.en}</div>
                    <div style={{fontSize: 24, color: colors.muted, fontWeight: 600}}>{it.vi}</div>
                    <div style={{fontSize: 24, fontWeight: 600, marginTop: 4}}>
                      {it.sub} <span style={{fontSize: 19, color: colors.muted}}>· {it.subVi}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', zIndex: 5, opacity: 1 - fade(T.result, T.result + 0.4)}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 33, fontWeight: 700}}>{cap[1]}</div>
          <div style={{fontSize: 21, color: colors.muted}}>{cap[0]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
