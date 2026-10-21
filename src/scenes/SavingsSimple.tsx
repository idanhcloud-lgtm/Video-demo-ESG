import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * Simplest example of Savings (Clarke–Wright) + Nearest Neighbour, without voice.
 * 6 stops whose loads add up to 2 pallets; the vehicle carries 1 pallet per trip.
 * Savings starts with one trip per stop, ranks every pair by saving = d(K,i) + d(K,j) − d(i,j) and merges the two
 * trips when the merged load still fits (≤ 1 pallet) – so it optimises both distance and how full each trip is.
 * Each trip is drawn in the order Savings picked its stops; on this map that loop is also the nearest-neighbour
 * order, so there is no separate nearest-neighbour pass. Straight-line distances, 1 m = 10 px.
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
  .map((r) => ({order: r}))
  .sort((x, y) => P[x.order[0]][0] - P[y.order[0]][0]);
const TRIP_COL = [colors.green, '#4dd0e1'];
const EX = STEPS[0];
const CAP_STEP = STEPS.findIndex((s) => s.kind === 'cap');
// The moment to highlight: the first trip has room for one more 0,3 pallet and two stops (both 0,3) would fit;
// savings takes the one that saves more, i.e. the closer one.
const CHOICE = 1;
const CH = STEPS[CHOICE];
const CH_TRIP = ROUTES_AFTER[CHOICE - 1].find((r) => r.length > 1 && (r.includes(CH.a) || r.includes(CH.b)))!;
const CH_WIN = CH_TRIP.includes(CH.a) ? CH.b : CH.a;
function linkSaveOf(i: number) {
  return Math.max(...CH_TRIP.map((j) => SV(i, j)));
}
const CH_ROOM = CAP - CH_TRIP.reduce((t, i) => t + LOAD[i], 0);
// every stop outside the trip: the ones that fit compete on saving, the others are too heavy
const CH_OUT = P.map((_, i) => i).filter((i) => !CH_TRIP.includes(i));
const CH_FIT = CH_OUT.filter((i) => LOAD[i] <= CH_ROOM + 1e-9);
const CH_HEAVY = CH_OUT.filter((i) => LOAD[i] > CH_ROOM + 1e-9);
const CH_RIVALS = CH_FIT.filter((i) => i !== CH_WIN).sort((a, b) => linkSaveOf(b) - linkSaveOf(a));
const linkSave = (i: number) => linkSaveOf(i);
const linkFrom = (i: number) => CH_TRIP.reduce((b, j) => (dd(DEPOT, P[i]) + dd(DEPOT, P[j]) - dd(P[i], P[j]) > dd(DEPOT, P[i]) + dd(DEPOT, P[b]) - dd(P[i], P[b]) ? j : b), CH_TRIP[0]);
const HOLD = 6.0; // extra seconds on the choice

// ---- timeline (seconds) ----
const T = {pts: 1.0, alone: 5.0, ex: 9.0, rank: 13.0, step0: 14.5, done: 0, result: 0};
const SLOW = 2.6; // first steps, up to the first capacity refusal
const FAST = 0.45;
const FULL_HOLD = 2.4; // pause after a merge that fills the mover
/** The merge at step k fills the mover to capacity: that trip is closed. */
const isFull = (k: number) => STEPS[k].kind === 'merge' && STEPS[k].load >= CAP - 1e-9;
const isSlow = (k: number) => k <= CAP_STEP + 1 || isFull(k);
/** Trip number (1, 2, …) in the order the trips fill up. */
const FULL_STEPS = STEPS.map((_, k) => k).filter(isFull);
const STEP_AT: number[] = [];
{
  let at = T.step0;
  STEPS.forEach((_, k) => {
    STEP_AT.push(at);
    at += (isSlow(k) ? SLOW : FAST) + (k === CHOICE ? HOLD : 0) + (isFull(k) ? FULL_HOLD : 0);
  });
  T.done = at + 0.6;
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

  // savings progress
  let k = -1;
  for (let n = 0; n < STEPS.length && STEP_AT[n] <= t; n++) k = n;
  const step = k >= 0 ? STEPS[k] : null;
  const u = k >= 0 ? t - STEP_AT[k] : 0;
  const slow = k >= 0 && isSlow(k);
  const hold = k === CHOICE ? HOLD : 0;
  const choosing = k === CHOICE && u < 1.0 + hold;
  const decided = !slow || u > 1.0 + hold;
  const routes = k < 0 ? P.map((_, i) => [i]) : decided ? ROUTES_AFTER[k] : k > 0 ? ROUTES_AFTER[k - 1] : P.map((_, i) => [i]);
  const merging = step && step.kind === 'merge' && slow ? interpolate(u, [1.0 + hold, 2.2 + hold], [0, 1], clamp) : 1;
  const prevRoutes = k > 0 ? ROUTES_AFTER[k - 1] : P.map((_, i) => [i]);
  const done = t >= T.done;
  const result = t >= T.result;
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const routeOf = (i: number) => routes.findIndex((r) => r.includes(i));
  const finalOf = (i: number) => FINAL.findIndex((r) => r.order.includes(i));
  // a trip reaches 1.0 pallet: it is closed and the next trip starts
  const fullAt = (fk: number) => STEP_AT[fk] + 2.2 + (fk === CHOICE ? HOLD : 0);
  const fullNow = step && isFull(k) && u > 2.2 + hold;
  const fullNo = fullNow ? FULL_STEPS.indexOf(k) + 1 : 0;
  const lastFull = fullNo === FULL_STEPS.length;

  const cap: [string, string] =
    t < T.alone ? ['6 vị trí lấy hàng, tổng 2 pallet. Mỗi chuyến xe pallet mover chở tối đa 1 pallet ra cửa.', '6 pick locations, 2 pallets of goods in total. The pallet mover carries 1 pallet per trip to the door.']
      : t < T.ex ? ['Ban đầu: mỗi vị trí một chuyến riêng – 6 chuyến, xe về cửa gần như rỗng', 'Start: one trip per location – 6 trips, the mover returns almost empty']
      : t < T.rank ? [`Lấy ${NAMES[EX.a]} và ${NAMES[EX.b]} trong cùng một chuyến thay vì 2 chuyến: xe chạy ít mét hơn`, `Pick ${NAMES[EX.a]} and ${NAMES[EX.b]} in one trip instead of two: fewer metres driven`]
      : t < T.step0 ? ['Tính cho mọi cặp số mét giảm được, cặp giảm nhiều nhất xét trước', 'Score every pair by metres cut, biggest cut first']
      : fullNow && !done
        ? lastFull
          ? [`Chuyến ${fullNo} đã đầy 1.0 pallet → mọi vị trí đã có chuyến`, `Trip ${fullNo} is full: 1.0 pallet → every location has a trip`]
          : [`Chuyến ${fullNo} đã đầy 1.0 pallet → chốt chuyến, sang chuyến tiếp theo`, `Trip ${fullNo} is full: 1.0 pallet → close it, start the next trip`]
      : choosing
        ? u < 2.4
          ? [`Xe còn chỗ cho ${fmt(CH_ROOM)} pallet: ${CH_FIT.map((i) => NAMES[i]).join(', ')} đều vừa, ${CH_HEAVY.map((i) => NAMES[i]).join(', ')} quá nặng`, `The mover has room for ${fmt(CH_ROOM)} pallet: ${CH_FIT.map((i) => NAMES[i]).join(', ')} fit, ${CH_HEAVY.map((i) => NAMES[i]).join(', ')} too heavy`]
          : [`Chọn ${NAMES[CH_WIN]} vì giảm được nhiều mét nhất: ${[CH_WIN, ...CH_RIVALS].map((i) => `${NAMES[i]} ${linkSave(i)} m`).join(' > ')}`, `${NAMES[CH_WIN]} cuts the most metres: ${[CH_WIN, ...CH_RIVALS].map((i) => `${NAMES[i]} ${linkSave(i)} m`).join(' > ')}`]
      : !done ? (step?.kind === 'cap' && slow
          ? [`${NAMES[step.a]} + ${NAMES[step.b]}: tổng ${fmt(step.load)} pallet > 1 → vượt sức chứa, bỏ qua`, `${NAMES[step.a]} + ${NAMES[step.b]}: ${fmt(step.load)} pallets > 1 → over capacity, skipped`]
          : step?.kind === 'same' && slow
            ? [`${NAMES[step.a]} và ${NAMES[step.b]} đã chung chuyến → bỏ qua`, `${NAMES[step.a]} and ${NAMES[step.b]} already share a trip → skipped`]
            : ['Lần lượt gộp chuyến, miễn xe còn chở vừa (≤ 1 pallet)', 'Merge trips one by one, as long as the mover can still carry it (≤ 1 pallet)'])
      : !result ? ['Mỗi chuyến đã được đo theo láng giềng gần nhất: vị trí gần nhất trước, lấy xong mang ra cửa', 'Each trip was measured in nearest-neighbour order: closest location first, then to the door']
      : ['Ít chuyến hơn, chuyến nào xe cũng đầy, chạy trong kho ít hơn', 'Fewer trips, a full mover every trip, less driving in the warehouse'];

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
      <div style={{position: 'absolute', left: 70, top: 150, display: 'flex', gap: 14, opacity: fade(T.ex - 0.4, T.ex) * (1 - fade(T.result - 0.3, T.result))}}>
        {[
          {on: true, n: '1', name: 'SAVINGS ALGORITHM', c: colors.green, en: 'decides which locations share a trip (within capacity)', vi: 'quyết định vị trí nào lấy chung một chuyến (trong sức chứa)'},
          {on: true, n: '2', name: 'NEAREST NEIGHBOUR ALGORITHM', c: colors.yellow, en: 'orders and measures each trip as it is formed', vi: 'sắp thứ tự và đo từng chuyến ngay khi gộp'},
        ].map((a) => (
          <div key={a.n} style={{padding: '10px 18px', borderRadius: 14, border: `3px solid ${a.on ? a.c : '#2a3654'}`, background: a.on ? `${a.c}1f` : 'transparent', opacity: a.on ? 1 : 0.4,
            boxShadow: a.on ? `0 0 18px ${a.c}66` : 'none', maxWidth: 600}}>
            <div style={{fontSize: 22, fontWeight: 800, color: a.on ? a.c : colors.muted, whiteSpace: 'nowrap'}}>
              STEP {a.n} · {a.name}
            </div>
            <div style={{fontSize: 19, fontWeight: 600}}>{a.en}</div>
            <div style={{fontSize: 15, color: colors.muted}}>{a.vi}</div>
          </div>
        ))}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {/* trips before nearest neighbour: drawn as spokes/loops per current route */}
        {!done
          ? (merging < 1 ? prevRoutes : routes).map((r, ri) => {
              const isMergedNow = step && step.kind === 'merge' && slow && merging < 1 && [step.a, step.b].some((x) => r.includes(x));
              const exPart = t >= T.ex && t < T.rank && r.length === 1 && (r[0] === EX.a || r[0] === EX.b);
              const col = exPart ? colors.red : r.length > 1 ? colors.green : '#8f9bb5';
              return (
                <Loop key={`r${ri}-${r.join('')}`} order={r} color={col} w={r.length > 1 ? 6 : 4}
                  draw={fade(T.alone + ri * 0.25, T.alone + ri * 0.25 + 0.8)}
                  opacity={(t >= T.ex && t < T.rank && !exPart ? 0.25 : 0.85) * (isMergedNow ? 1 - interpolate(merging, [0.6, 1], [0, 1], clamp) : 1)} />
              );
            })
          : null}
        {step && step.kind === 'merge' && slow && merging < 1 && !done ? (
          (() => {
            // the new link grows first, in the order Savings picked it, then the merged trip replaces the old ones
            const r = ROUTES_AFTER[k].find((x) => x.includes(step.a))!;
            const ra = prevRoutes.find((x) => x.includes(r[0]))!;
            const p0 = P[ra[ra.length - 1]];
            const p1 = P[r[ra.length]];
            const g = interpolate(merging, [0, 0.6], [0, 1], ease);
            return (
              <>
                <line x1={p0[0]} y1={p0[1]} x2={p0[0] + (p1[0] - p0[0]) * g} y2={p0[1] + (p1[1] - p0[1]) * g} stroke={colors.green} strokeWidth={7} strokeLinecap="round" />
                <Loop order={r} color={colors.green} w={6} opacity={interpolate(merging, [0.6, 1], [0, 1], clamp)} />
              </>
            );
          })()
        ) : null}
        {/* worked example: the new link and the two removed spokes */}
        {t >= T.ex && t < T.rank ? (
          <>
            <line x1={P[EX.a][0]} y1={P[EX.a][1]} x2={P[EX.a][0] + (P[EX.b][0] - P[EX.a][0]) * fade(T.ex + 2.3, T.ex + 3.0)} y2={P[EX.a][1] + (P[EX.b][1] - P[EX.a][1]) * fade(T.ex + 2.3, T.ex + 3.0)}
              stroke={colors.green} strokeWidth={7} strokeLinecap="round" />
          </>
        ) : null}
        {/* pair being examined */}
        {step && slow && !done && !choosing && u < 1.2 + hold ? (
          <line x1={P[step.a][0]} y1={P[step.a][1]} x2={P[step.b][0]} y2={P[step.b][1]} stroke={step.kind === 'cap' ? colors.red : step.kind === 'same' ? '#8f9bb5' : colors.yellow}
            strokeWidth={5} strokeDasharray="12 9" opacity={interpolate(u, [hold, hold + 0.2, hold + 1.0, hold + 1.2], [0, 1, 1, 0], clamp)} />
        ) : null}

        {/* the choice: two candidates fit the open trip, the closer one wins */}
        {choosing
          ? [CH_WIN, ...CH_RIVALS, ...CH_HEAVY].map((i, n) => {
              const from = P[linkFrom(i)];
              const win = i === CH_WIN;
              const heavy = CH_HEAVY.includes(i);
              const judged = u > 2.4;
              const col = heavy ? '#8f9bb5' : judged ? (win ? colors.green : colors.red) : colors.yellow;
              const pulse = 1 + 0.12 * Math.sin(t * 7);
              const sh = interpolate(u, [0.3 + n * 0.35, 0.8 + n * 0.35], [0, 1], clamp);
              // rivals low on the map bend under the heavy stop so the arc never crosses it
              const under = !win && !heavy && P[i][1] > 450;
              const ctrlY = win ? Math.min(from[1], P[i][1]) : under ? Math.max(from[1], P[i][1]) + 100 : Math.min(from[1], P[i][1]) - 60 - 40 * n;
              const lx = heavy ? P[i][0] - 62 : win ? P[i][0] - 30 : under ? P[i][0] + 50 : P[i][0] + 62;
              const ly = heavy ? P[i][1] + 10 : win || under ? P[i][1] + 100 : P[i][1] + 10;
              const anchor = heavy || under ? 'end' : win ? 'middle' : 'start';
              const label = heavy
                ? `+${fmt(LOAD[i])} → ${fmt(1 - CH_ROOM + LOAD[i])} too heavy`
                : judged
                  ? `${win ? '✓ chosen' : '✗'} · −${linkSave(i)} m`
                  : `+${fmt(LOAD[i])} → 1.0 fits`;
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

        {/* FULL badge inside each trip that reached 1.0 pallet */}
        {FULL_STEPS.map((fk, n) => {
          if (t < fullAt(fk) || result) return null;
          const r = ROUTES_AFTER[fk].find((x) => x.includes(STEPS[fk].a))!;
          // beside the trip, on the open side of the map, so it never sits on a line
          const left = r.reduce((a, i) => a + P[i][0], 0) / r.length < DEPOT[0];
          const [cx, cy] = left ? [340, 700] : [1590, 790];
          const col = done ? TRIP_COL[finalOf(r[0])] : colors.green;
          const sc = spring({frame: frame - fullAt(fk) * fps, fps, config: {damping: 12}});
          return (
            <g key={`full${fk}`} transform={`translate(${cx} ${cy}) scale(${sc})`}>
              <rect x={-150} y={-44} width={300} height={88} rx={16} fill="#0b1222" stroke={col} strokeWidth={4} />
              <text y={-6} textAnchor="middle" fontSize={30} fontWeight={800} fill={col}>
                ✓ TRIP {n + 1} FULL
              </text>
              <text y={28} textAnchor="middle" fontSize={22} fontWeight={700} fill={colors.text}>
                1.0 pallet · đầy xe
              </text>
            </g>
          );
        })}

        {/* final trips, coloured per trip */}
        {done ? FINAL.map((tr, ti) => <Loop key={`f${ti}`} order={tr.order} color={TRIP_COL[ti]} w={7} />) : null}

        {/* depot + stops */}
        <g transform={`translate(${DEPOT[0]} ${DEPOT[1]}) scale(${pop(0.5)})`}>
          <rect x={-60} y={-30} width={120} height={60} rx={10} fill={colors.amber} />
          <text y={9} textAnchor="middle" fontSize={24} fontWeight={800} fill="#0b1222">
            DOOR
          </text>
        </g>
        {P.map((p, i) => {
          const fi = finalOf(i);
          const ordered = done;
          const fill = done ? TRIP_COL[fi] : routes[routeOf(i)].length > 1 && merging >= 1 ? colors.green : colors.amber;
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

      {/* trip cards once savings is done */}
      {done && !result ? (
        <div style={{position: 'absolute', left: 1440, top: 330, width: 460}}>
          {FINAL.map((tr, ti) => (
            <div key={ti} style={{marginBottom: 22, opacity: fade(T.done + ti * 0.4, T.done + ti * 0.4 + 0.4)}}>
              <div style={{fontSize: 26, fontWeight: 800, color: TRIP_COL[ti]}}>
                Trip {ti + 1}: Door → {tr.order.map((i) => NAMES[i]).join(' → ')} → Door
              </div>
              <div style={{fontSize: 22, marginTop: 4}}>
                Load {fmt(tr.order.reduce((s, i) => s + LOAD[i], 0))} pallet <Gauge load={tr.order.reduce((s, i) => s + LOAD[i], 0)} color={TRIP_COL[ti]} />
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
