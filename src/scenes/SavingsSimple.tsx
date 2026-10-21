import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * Simplest example of Savings (Clarke–Wright) + Nearest Neighbour, without voice.
 * 6 stops whose loads add up to 2 pallets; the vehicle carries 1 pallet per trip.
 * Savings starts with one trip per stop, ranks every pair by saving = d(K,i) + d(K,j) − d(i,j) and merges the two
 * trips when the merged load still fits (≤ 1 pallet) – so it optimises both distance and how full each trip is.
 * Nearest neighbour then gives the visit order of each trip. Straight-line distances, 1 m = 10 px.
 * Vietnamese is the large line.
 */
type Pt = [number, number];
const dd = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) / 10;
const DEPOT: Pt = [810, 900];
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const P: Pt[] = [[290, 480], [470, 370], [700, 380], [840, 370], [1220, 540], [1350, 700]];
const LOAD = [0.4, 0.3, 0.3, 0.3, 0.4, 0.3]; // share of one pallet
const CAP = 1;
const N = P.length;
const R = (x: number) => Math.round(x);
const fmt = (x: number) => x.toFixed(1);
/** Saving as shown on screen: built from the rounded distances, so the on-screen arithmetic adds up. */
const SV = (a: number, b: number) => R(dd(DEPOT, P[a])) + R(dd(DEPOT, P[b])) - R(dd(P[a], P[b]));

function nn(items: number[]) {
  let cur = DEPOT;
  const rest = [...items];
  const order: number[] = [];
  let len = 0;
  while (rest.length) {
    rest.sort((a, b) => dd(cur, P[a]) - dd(cur, P[b]));
    const n = rest.shift()!;
    len += dd(cur, P[n]);
    cur = P[n];
    order.push(n);
  }
  return {order, len: len + dd(cur, DEPOT)};
}

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
const FINAL = ROUTES_AFTER[ROUTES_AFTER.length - 1]
  .map((r) => nn(r))
  .sort((x, y) => P[x.order[0]][0] - P[y.order[0]][0]);
/** Length of a trip driven in the order Savings built it (Door → chain → Door). */
const chainLen = (r: number[]) => {
  const pts: Pt[] = [DEPOT, ...r.map((i) => P[i]), DEPOT];
  return pts.slice(1).reduce((t, q, k) => t + dd(pts[k], q), 0);
};
const ALONE_TOTAL = R(P.reduce((t, p) => t + 2 * dd(DEPOT, p), 0));
const SAV_TOTAL = R(FINAL.reduce((t, r) => t + r.len, 0));
const TRIP_COL = [colors.green, '#4dd0e1'];
const EX = STEPS[0];
const CAP_STEP = STEPS.findIndex((s) => s.kind === 'cap');
// The moment to highlight: the first trip has room for one more 0,3 pallet and two stops (both 0,3) would fit;
// savings takes the one that saves more, i.e. the closer one.
const CHOICE = 1;
const CH = STEPS[CHOICE];
const CH_TRIP = ROUTES_AFTER[CHOICE - 1].find((r) => r.length > 1 && (r.includes(CH.a) || r.includes(CH.b)))!;
const CH_WIN = CH_TRIP.includes(CH.a) ? CH.b : CH.a;
const CH_RIVAL = P.map((_, i) => i).find((i) => i !== CH_WIN && !CH_TRIP.includes(i) && LOAD[i] === LOAD[CH_WIN])!;
const linkSave = (i: number) => Math.max(...CH_TRIP.map((j) => SV(i, j)));
const linkFrom = (i: number) => CH_TRIP.reduce((b, j) => (dd(DEPOT, P[i]) + dd(DEPOT, P[j]) - dd(P[i], P[j]) > dd(DEPOT, P[i]) + dd(DEPOT, P[b]) - dd(P[i], P[b]) ? j : b), CH_TRIP[0]);
const HOLD = 6.0; // extra seconds on the choice

// ---- timeline (seconds) ----
const T = {pts: 1.0, alone: 5.0, ex: 9.0, rank: 17.0, step0: 18.5, nn: 0, result: 0};
const SLOW = 2.6; // first steps, up to the first capacity refusal
const FAST = 0.45;
const STEP_AT: number[] = [];
{
  let at = T.step0;
  STEPS.forEach((_, k) => {
    STEP_AT.push(at);
    at += (k <= CAP_STEP + 1 ? SLOW : FAST) + (k === CHOICE ? HOLD : 0);
  });
  T.nn = at + 0.6;
}
const NN_LEG = 1.1;
const NN_AT = FINAL.map((_, k) => T.nn + 0.6 + FINAL.slice(0, k).reduce((t, r) => t + (r.order.length + 1) * NN_LEG + 0.5, 0));
T.result = NN_AT[NN_AT.length - 1] + (FINAL[FINAL.length - 1].order.length + 1) * NN_LEG + 1.0;
export const SAVINGS_SIMPLE_SECONDS = Math.ceil(T.result + 6.5);

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

  // savings progress
  let k = -1;
  for (let n = 0; n < STEPS.length && STEP_AT[n] <= t; n++) k = n;
  const step = k >= 0 ? STEPS[k] : null;
  const u = k >= 0 ? t - STEP_AT[k] : 0;
  const slow = k >= 0 && k <= CAP_STEP + 1;
  const hold = k === CHOICE ? HOLD : 0;
  const choosing = k === CHOICE && u < 1.0 + hold;
  const decided = !slow || u > 1.0 + hold;
  const routes = k < 0 ? P.map((_, i) => [i]) : decided ? ROUTES_AFTER[k] : k > 0 ? ROUTES_AFTER[k - 1] : P.map((_, i) => [i]);
  const merging = step && step.kind === 'merge' && slow ? interpolate(u, [1.0 + hold, 1.8 + hold], [0, 1], ease) : 1;
  const prevRoutes = k > 0 ? ROUTES_AFTER[k - 1] : P.map((_, i) => [i]);
  const inNN = t >= T.nn;
  const result = t >= T.result;
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const total = R(inNN ? FINAL.reduce((s, r) => s + r.len, 0) : routes.reduce((s, r) => s + chainLen(r), 0));
  const routeOf = (i: number) => routes.findIndex((r) => r.includes(i));
  const finalOf = (i: number) => FINAL.findIndex((r) => r.order.includes(i));

  const cap: [string, string] =
    t < T.alone ? ['6 vị trí lấy hàng, tổng 2 pallet. Mỗi chuyến xe pallet mover chở tối đa 1 pallet ra cửa.', '6 pick locations, 2 pallets of goods in total. The pallet mover carries 1 pallet per trip to the door.']
      : t < T.ex ? ['Ban đầu: mỗi vị trí một chuyến riêng – 6 chuyến, xe về cửa gần như rỗng', 'Start: one trip per location – 6 trips, the mover returns almost empty']
      : t < T.rank ? [`Lấy ${NAMES[EX.a]} và ${NAMES[EX.b]} trong cùng một chuyến: số mét bớt được là "tiết kiệm"`, `Pick ${NAMES[EX.a]} and ${NAMES[EX.b]} in the same trip: the metres no longer driven are the saving`]
      : t < T.step0 ? ['Tính tiết kiệm cho mọi cặp, xếp từ lớn đến nhỏ', 'Score every pair, biggest saving first']
      : choosing
        ? u < 2.4
          ? [`Xe còn chỗ cho 0.3 pallet: cả ${NAMES[CH_WIN]} và ${NAMES[CH_RIVAL]} đều vừa`, `The mover still has room for 0.3 pallet: both ${NAMES[CH_WIN]} and ${NAMES[CH_RIVAL]} fit`]
          : [`Chọn ${NAMES[CH_WIN]} vì gần hơn: tiết kiệm ${linkSave(CH_WIN)} m > ${linkSave(CH_RIVAL)} m`, `${NAMES[CH_WIN]} is closer: it saves ${linkSave(CH_WIN)} m > ${linkSave(CH_RIVAL)} m`]
      : !inNN ? (step?.kind === 'cap' && slow
          ? [`${NAMES[step.a]} + ${NAMES[step.b]}: tổng ${fmt(step.load)} pallet > 1 → vượt sức chứa, bỏ qua`, `${NAMES[step.a]} + ${NAMES[step.b]}: ${fmt(step.load)} pallets > 1 → over capacity, skipped`]
          : step?.kind === 'same' && slow
            ? [`${NAMES[step.a]} và ${NAMES[step.b]} đã chung chuyến → bỏ qua`, `${NAMES[step.a]} and ${NAMES[step.b]} already share a trip → skipped`]
            : ['Lần lượt gộp chuyến, miễn xe còn chở vừa (≤ 1 pallet)', 'Merge trips one by one, as long as the mover can still carry it (≤ 1 pallet)'])
      : !result ? ['Láng giềng gần nhất sắp thứ tự lấy hàng: vị trí gần nhất trước, lấy xong mang ra cửa', 'Nearest neighbour sets the pick order: closest location first, then bring the goods to the door']
      : ['Ít chuyến hơn, chuyến nào xe cũng đầy, chạy trong kho ít hơn', 'Fewer trips, a full mover every trip, less driving in the warehouse'];

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 70, top: 40}}>
        <div style={{fontSize: 48, fontWeight: 800}}>
          <span style={{color: colors.green}}>Savings</span> <span style={{color: colors.muted, fontWeight: 600}}>+</span> <span style={{color: colors.yellow}}>Nearest Neighbour</span>
        </div>
        <div style={{fontSize: 22, color: colors.muted}}>Simulation · Mô phỏng</div>
      </div>
      {/* which algorithm is working now */}
      <div style={{position: 'absolute', left: 70, top: 150, display: 'flex', gap: 14, opacity: fade(T.ex - 0.4, T.ex) * (1 - fade(T.result - 0.3, T.result))}}>
        {[
          {on: !inNN, n: '1', name: 'SAVINGS', c: colors.green, en: 'decides which locations share a trip (within capacity)', vi: 'quyết định vị trí nào lấy chung một chuyến (trong sức chứa)'},
          {on: inNN, n: '2', name: 'NEAREST NEIGHBOUR', c: colors.yellow, en: 'decides the pick order inside each trip', vi: 'quyết định thứ tự lấy hàng trong từng chuyến'},
        ].map((a) => (
          <div key={a.n} style={{padding: '10px 18px', borderRadius: 14, border: `3px solid ${a.on ? a.c : '#2a3654'}`, background: a.on ? `${a.c}1f` : 'transparent', opacity: a.on ? 1 : 0.4,
            boxShadow: a.on ? `0 0 18px ${a.c}66` : 'none', maxWidth: 520}}>
            <div style={{fontSize: 22, fontWeight: 800, color: a.on ? a.c : colors.muted}}>
              STEP {a.n} · {a.name}
            </div>
            <div style={{fontSize: 19, fontWeight: 600}}>{a.en}</div>
            <div style={{fontSize: 15, color: colors.muted}}>{a.vi}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', right: 70, top: 40, textAlign: 'right', opacity: fade(T.alone, T.alone + 0.5) * (1 - fade(T.result - 0.3, T.result))}}>
        <div style={{fontSize: 19, color: colors.muted, letterSpacing: 2}}>{routes.length} TRIPS · TOTAL DISTANCE</div>
        <div style={{fontSize: 74, fontWeight: 800, lineHeight: 1, color: colors.green}}>
          {total}
          <span style={{fontSize: 30, color: colors.muted, marginLeft: 8}}>m</span>
        </div>
      </div>

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {/* trips before nearest neighbour: drawn as spokes/loops per current route */}
        {!inNN
          ? (merging < 1 ? prevRoutes : routes).map((r, ri) => {
              const isMergedNow = step && step.kind === 'merge' && slow && merging < 1 && [step.a, step.b].some((x) => r.includes(x));
              const exPart = t >= T.ex && t < T.rank && r.length === 1 && (r[0] === EX.a || r[0] === EX.b);
              const col = isMergedNow || exPart ? colors.red : r.length > 1 ? colors.green : '#8f9bb5';
              return (
                <Loop key={`r${ri}-${r.join('')}`} order={r} color={col} w={r.length > 1 ? 6 : 4}
                  draw={fade(T.alone + ri * 0.25, T.alone + ri * 0.25 + 0.8)}
                  opacity={(t >= T.ex && t < T.rank && !exPart ? 0.25 : 0.85) * (isMergedNow ? 1 - merging : 1)} />
              );
            })
          : null}
        {step && step.kind === 'merge' && slow && merging < 1 && !inNN ? (
          <Loop order={routes.find((r) => r.includes(step.a))!} color={colors.green} w={6} draw={merging} />
        ) : null}
        {/* worked example: the new link and the two removed spokes */}
        {t >= T.ex && t < T.rank ? (
          <>
            <line x1={P[EX.a][0]} y1={P[EX.a][1]} x2={P[EX.a][0] + (P[EX.b][0] - P[EX.a][0]) * fade(T.ex + 2.3, T.ex + 3.0)} y2={P[EX.a][1] + (P[EX.b][1] - P[EX.a][1]) * fade(T.ex + 2.3, T.ex + 3.0)}
              stroke={colors.green} strokeWidth={7} strokeLinecap="round" />
          </>
        ) : null}
        {/* pair being examined */}
        {step && slow && !inNN && !choosing && u < 1.2 + hold ? (
          <line x1={P[step.a][0]} y1={P[step.a][1]} x2={P[step.b][0]} y2={P[step.b][1]} stroke={step.kind === 'cap' ? colors.red : step.kind === 'same' ? '#8f9bb5' : colors.yellow}
            strokeWidth={5} strokeDasharray="12 9" opacity={interpolate(u, [hold, hold + 0.2, hold + 1.0, hold + 1.2], [0, 1, 1, 0], clamp)} />
        ) : null}

        {/* the choice: two candidates fit the open trip, the closer one wins */}
        {choosing
          ? [CH_WIN, CH_RIVAL].map((i, n) => {
              const from = P[linkFrom(i)];
              const win = i === CH_WIN;
              const judged = u > 2.4;
              const col = judged ? (win ? colors.green : colors.red) : colors.yellow;
              const pulse = 1 + 0.12 * Math.sin(t * 7);
              const sh = interpolate(u, [0.3 + n * 0.4, 0.8 + n * 0.4], [0, 1], clamp);
              return (
                <g key={i} opacity={sh}>
                  <path d={`M${from[0]} ${from[1]} Q${(from[0] + P[i][0]) / 2} ${Math.min(from[1], P[i][1]) - (win ? 0 : 130)} ${P[i][0]} ${P[i][1]}`} fill="none" stroke={col} strokeWidth={5}
                    strokeDasharray="12 9" opacity={judged && !win ? 0.6 : 1} />
                  <circle cx={P[i][0]} cy={P[i][1]} r={50 * pulse} fill="none" stroke={col} strokeWidth={5} />
                  <text x={win ? P[i][0] - 30 : P[i][0] + 62} y={win ? P[i][1] + 92 : P[i][1] + 10} textAnchor={win ? 'middle' : 'start'} fontSize={26} fontWeight={800} fill={col}
                    stroke="#0b1222" strokeWidth={7} style={{paintOrder: 'stroke'}}>
                    {judged ? `${win ? '✓ chosen' : '✗'} · saves ${linkSave(i)} m` : `+0.3 → 1.0 fits`}
                  </text>
                </g>
              );
            })
          : null}

        {/* Savings result kept faint underneath while nearest neighbour redraws each trip */}
        {inNN && !result
          ? ROUTES_AFTER[ROUTES_AFTER.length - 1].map((r) => <Loop key={`c${r.join('')}`} order={r} color="#8f9bb5" w={4} opacity={0.45} dash="10 10" />)
          : null}

        {/* nearest neighbour, trip by trip */}
        {inNN
          ? FINAL.map((tr, ti) => {
              const at = NN_AT[ti];
              const pts = loopPts(tr.order);
              return pts.slice(1).map((to, legI) => {
                const from = pts[legI];
                const uu = (t - at - legI * NN_LEG) / NN_LEG;
                if (uu < 0) return null;
                const cands = legI < tr.order.length ? tr.order.slice(legI) : [];
                const dr = interpolate(uu, [0.5, 0.95], [0, 1], ease);
                return (
                  <g key={`${ti}-${legI}`}>
                    {uu < 1
                      ? cands.map((i) => {
                          const best = i === tr.order[legI];
                          const sh = interpolate(uu, [0, 0.2], [0, 1], clamp);
                          const keep = best ? 1 : interpolate(uu, [0.4, 0.55], [1, 0], clamp);
                          const c = best && uu > 0.35 ? colors.yellow : '#8f9bb5';
                          return (
                            <g key={i} opacity={keep}>
                              <line x1={from[0]} y1={from[1]} x2={from[0] + (P[i][0] - from[0]) * sh} y2={from[1] + (P[i][1] - from[1]) * sh} stroke={c} strokeWidth={3.5} strokeDasharray="9 8" />
                              <text x={from[0] + (P[i][0] - from[0]) * 0.6 + 12} y={from[1] + (P[i][1] - from[1]) * 0.6} fontSize={22} fontWeight={800} fill={c} opacity={sh}
                                stroke="#0b1222" strokeWidth={6} style={{paintOrder: 'stroke'}}>
                                {R(dd(from, P[i]))} m
                              </text>
                            </g>
                          );
                        })
                      : null}
                    {dr > 0 ? (
                      <line x1={from[0]} y1={from[1]} x2={from[0] + (to[0] - from[0]) * dr} y2={from[1] + (to[1] - from[1]) * dr} stroke={TRIP_COL[ti]} strokeWidth={7} strokeLinecap="round" />
                    ) : null}
                  </g>
                );
              });
            })
          : null}

        {/* depot + stops */}
        <g transform={`translate(${DEPOT[0]} ${DEPOT[1]}) scale(${pop(0.5)})`}>
          <rect x={-60} y={-30} width={120} height={60} rx={10} fill={colors.amber} />
          <text y={9} textAnchor="middle" fontSize={24} fontWeight={800} fill="#0b1222">
            DOOR
          </text>
        </g>
        {P.map((p, i) => {
          const fi = finalOf(i);
          const ordered = inNN && t >= NN_AT[fi] + (FINAL[fi].order.indexOf(i) + 0.6) * NN_LEG;
          const fill = inNN ? (ordered ? TRIP_COL[fi] : '#8f9bb5') : routes[routeOf(i)].length > 1 && merging >= 1 ? colors.green : colors.amber;
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${pop(T.pts + i * 0.2)})`}>
              <circle r={34} fill={fill} stroke="#0b1222" strokeWidth={4} />
              <text y={11} textAnchor="middle" fontSize={32} fontWeight={800} fill="#0b1222">
                {NAMES[i]}
              </text>
              <rect x={-30} y={-62} width={60} height={14} rx={4} fill="none" stroke={colors.muted} strokeWidth={2} />
              <rect x={-30} y={-62} width={60 * LOAD[i]} height={14} rx={4} fill={colors.amber} />
              <text y={-70} textAnchor="middle" fontSize={20} fontWeight={700} fill={colors.muted}>
                {fmt(LOAD[i])} pallet
              </text>
              {ordered ? (
                <g transform="translate(32 26)">
                  <circle r={16} fill="#fff" stroke="#0b1222" strokeWidth={3} />
                  <text y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0b1222">
                    {FINAL[fi].order.indexOf(i) + 1}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* worked example card: two separate trips vs one shared trip */}
      {t >= T.ex && t < T.rank ? (() => {
        const A = NAMES[EX.a];
        const B = NAMES[EX.b];
        const ka = R(dd(DEPOT, P[EX.a]));
        const kb = R(dd(DEPOT, P[EX.b]));
        const ab = R(dd(P[EX.a], P[EX.b]));
        const sep = 2 * ka + 2 * kb;
        const tog = ka + ab + kb;
        const row = (at: number) => ({opacity: fade(T.ex + at, T.ex + at + 0.4), transform: `translateY(${(1 - fade(T.ex + at, T.ex + at + 0.4)) * 14}px)`});
        const Seg: React.FC<{txt: string; m: number; c: string}> = ({txt, m, c}) => (
          <span style={{display: 'inline-block', padding: '3px 10px', borderRadius: 8, background: `${c}26`, border: `2px solid ${c}`, color: c, fontWeight: 800, margin: '0 3px'}}>
            {txt} <span style={{opacity: 0.85}}>{m}</span>
          </span>
        );
        return (
          <div style={{position: 'absolute', left: 1410, top: 250, width: 490, opacity: fade(T.ex + 0.2, T.ex + 0.6) * (1 - fade(T.rank - 0.4, T.rank)),
            background: '#0e1628', border: '2px solid #ffffff22', borderRadius: 20, padding: '22px 26px'}}>
            <div style={{fontSize: 24, fontWeight: 800}}>SAVING({A}, {B})</div>
            <div style={{fontSize: 19, fontWeight: 600, marginTop: 4}}>Should {A} and {B} be picked in the same trip? Compare the metres driven.</div>
            <div style={{fontSize: 16, color: colors.muted, marginBottom: 14}}>Mục đích: có nên lấy {A} và {B} trong cùng một chuyến không? So số mét phải chạy.</div>
            <div style={row(0.7)}>
              <div style={{fontSize: 22, fontWeight: 800, color: colors.red}}>2 separate trips <span style={{fontSize: 16, color: colors.muted, fontWeight: 600}}>· 2 chuyến riêng</span></div>
              <div style={{fontSize: 22, marginTop: 6, lineHeight: 1.7}}>
                <Seg txt={`Door→${A}→Door`} m={2 * ka} c={colors.red} /> + <Seg txt={`Door→${B}→Door`} m={2 * kb} c={colors.red} />
              </div>
              <div style={{fontSize: 30, fontWeight: 800, color: colors.red, textAlign: 'right'}}>= {sep} m</div>
            </div>
            <div style={{...row(2.3), marginTop: 10}}>
              <div style={{fontSize: 22, fontWeight: 800, color: colors.green}}>1 trip picking both <span style={{fontSize: 16, color: colors.muted, fontWeight: 600}}>· 1 chuyến lấy cả hai</span></div>
              <div style={{fontSize: 22, marginTop: 6, lineHeight: 1.7}}>
                <Seg txt={`Door→${A}`} m={ka} c={colors.green} /> + <Seg txt={`${A}→${B}`} m={ab} c={colors.green} /> + <Seg txt={`${B}→Door`} m={kb} c={colors.green} />
              </div>
              <div style={{fontSize: 30, fontWeight: 800, color: colors.green, textAlign: 'right'}}>= {tog} m</div>
            </div>
            <div style={{...row(3.9), marginTop: 12, paddingTop: 12, borderTop: '2px solid #ffffff33', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
              <div>
                <div style={{fontSize: 22, fontWeight: 700}}>Saved · Tiết kiệm</div>
                <div style={{fontSize: 17, color: colors.muted}}>{sep} − {tog}</div>
              </div>
              <div style={{fontSize: 64, fontWeight: 800, color: colors.green}}>{sep - tog} m</div>
            </div>
            <div style={{...row(5.0), fontSize: 21, marginTop: 6}}>
              Load {fmt(LOAD[EX.a])} + {fmt(LOAD[EX.b])} = {fmt(LOAD[EX.a] + LOAD[EX.b])} ≤ 1 → <b style={{color: colors.green}}>fits</b>
              <span style={{fontSize: 16, color: colors.muted}}> · tải vừa</span>
            </div>
          </div>
        );
      })() : null}

      {/* ranking + decisions */}
      {t >= T.rank && !inNN ? (
        <div style={{position: 'absolute', left: 1440, top: 300, width: 470, opacity: fade(T.rank, T.rank + 0.4)}}>
          <div style={{fontSize: 18, color: colors.muted, letterSpacing: 2, marginBottom: 6}}>EVERY PAIR · SAVED · LOAD</div>
          {STEPS.map((s, r) => {
            const done = r < k || (r === k && decided);
            const col = !done ? colors.yellow : s.kind === 'merge' ? colors.green : s.kind === 'cap' ? colors.red : '#4a5570';
            return (
              <div key={r} style={{display: 'flex', alignItems: 'center', height: 40, opacity: fade(T.rank + r * 0.08, T.rank + r * 0.08 + 0.25) * (done && s.kind !== 'merge' ? 0.6 : 1),
                background: r === k && !inNN ? '#ffffff12' : 'transparent', borderRadius: 8, paddingLeft: 8}}>
                <div style={{width: 70, fontSize: 25, fontWeight: 800}}>{NAMES[s.a]}+{NAMES[s.b]}</div>
                <div style={{width: Math.max(4, s.save * 0.9), height: 14, borderRadius: 4, background: col}} />
                <div style={{marginLeft: 10, width: 80, fontSize: 22, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>{SV(s.a, s.b)} m</div>
                <div style={{fontSize: 20, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>
                  {!done ? '' : s.kind === 'merge' ? `✓ merge · ${fmt(s.load)}` : s.kind === 'cap' ? `✗ ${fmt(s.load)} > 1 too full` : '– same trip'}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* trip cards during nearest neighbour */}
      {inNN && !result ? (
        <div style={{position: 'absolute', left: 1440, top: 330, width: 460}}>
          {FINAL.map((tr, ti) => (
            <div key={ti} style={{marginBottom: 22, opacity: fade(NN_AT[ti] - 0.3, NN_AT[ti])}}>
              <div style={{fontSize: 26, fontWeight: 800, color: TRIP_COL[ti]}}>
                Trip {ti + 1}: Door → {tr.order.map((i) => NAMES[i]).join(' → ')} → Door
              </div>
              <div style={{fontSize: 22, marginTop: 4}}>
                {R(tr.len)} m · load {fmt(tr.order.reduce((s, i) => s + LOAD[i], 0))} pallet <Gauge load={tr.order.reduce((s, i) => s + LOAD[i], 0)} color={TRIP_COL[ti]} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* result */}
      {result ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res * 0.92, background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)'}} />
          <div style={{position: 'absolute', left: 960, top: 460, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res, display: 'flex', gap: 30}}>
            {[
              {t: 'One trip per location', e: 'Mỗi vị trí 1 chuyến', n: N, load: `${R((100 * LOAD.reduce((a, b) => a + b, 0)) / N)}% full per trip`, g: LOAD.reduce((a, b) => a + b, 0) / N, m: ALONE_TOTAL, c: colors.muted},
              {t: 'Savings + Nearest Neighbour', e: 'Savings + Láng giềng gần nhất', n: FINAL.length, load: '100% full per trip', g: 1, m: SAV_TOTAL, c: colors.green},
            ].map((c) => (
              <div key={c.t} style={{width: 560, padding: '28px 34px', borderRadius: 22, background: '#0e1628', border: `3px solid ${c.c}`}}>
                <div style={{fontSize: 30, fontWeight: 800, color: c.c}}>{c.t}</div>
                <div style={{fontSize: 19, color: colors.muted}}>{c.e}</div>
                <div style={{fontSize: 28, marginTop: 18}}>{c.n} trips <span style={{fontSize: 20, color: colors.muted}}>· {c.n} chuyến</span></div>
                <div style={{fontSize: 24, marginTop: 6}}>
                  {c.load} <Gauge load={c.g} color={c.c} w={140} />
                </div>
                <div style={{fontSize: 70, fontWeight: 800, color: c.c, marginTop: 10}}>{c.m} m</div>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 730, zIndex: 4, textAlign: 'center', opacity: fade(T.result + 1.2, T.result + 1.6)}}>
            <div style={{fontSize: 30, fontWeight: 700}}>
              <span style={{color: colors.green}}>Capacity</span>: fill the mover before going to the door · <span style={{color: colors.green}}>Distance</span>: pick nearby locations together
            </div>
            <div style={{fontSize: 20, color: colors.muted}}>Sức chứa: chất đầy xe rồi mới ra cửa · Quãng đường: lấy chung các vị trí gần nhau</div>
          </div>
        </>
      ) : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 33, fontWeight: 700}}>{cap[1]}</div>
          <div style={{fontSize: 21, color: colors.muted}}>{cap[0]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
