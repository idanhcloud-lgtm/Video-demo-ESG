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
const P: Pt[] = [[290, 430], [470, 310], [700, 320], [900, 290], [1180, 560], [1350, 660]];
const LOAD = [0.4, 0.3, 0.3, 0.3, 0.4, 0.3]; // share of one pallet
const CAP = 1;
const N = P.length;
const R = (x: number) => Math.round(x);
const fmt = (x: number) => x.toFixed(1).replace('.', ',');

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
const linkSave = (i: number) => Math.max(...CH_TRIP.map((j) => dd(DEPOT, P[i]) + dd(DEPOT, P[j]) - dd(P[i], P[j])));
const linkFrom = (i: number) => CH_TRIP.reduce((b, j) => (dd(DEPOT, P[i]) + dd(DEPOT, P[j]) - dd(P[i], P[j]) > dd(DEPOT, P[i]) + dd(DEPOT, P[b]) - dd(P[i], P[b]) ? j : b), CH_TRIP[0]);
const HOLD = 6.0; // extra seconds on the choice

// ---- timeline (seconds) ----
const T = {pts: 1.0, alone: 5.0, ex: 9.0, rank: 15.5, step0: 17.0, nn: 0, result: 0};
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
  const total = R(routes.reduce((s, r) => s + nn(r).len, 0));
  const routeOf = (i: number) => routes.findIndex((r) => r.includes(i));
  const finalOf = (i: number) => FINAL.findIndex((r) => r.order.includes(i));

  const cap: [string, string] =
    t < T.alone ? ['6 điểm giao, tổng cộng 2 pallet hàng. Xe chở tối đa 1 pallet mỗi chuyến.', '6 stops, 2 pallets in total. The vehicle carries 1 pallet per trip.']
      : t < T.ex ? ['Ban đầu: mỗi điểm một chuyến riêng – 6 chuyến, xe chạy gần như rỗng', 'Start: one trip per stop – 6 trips, the vehicle almost empty']
      : t < T.rank ? [`Tiết kiệm khi gộp ${NAMES[EX.a]} và ${NAMES[EX.b]}: bớt một lượt về kho và một lượt đi`, `Saving of ${NAMES[EX.a]} + ${NAMES[EX.b]}: one way back and one way out are no longer needed`]
      : t < T.step0 ? ['Tính tiết kiệm cho mọi cặp, xếp từ lớn đến nhỏ', 'Score every pair, biggest saving first']
      : choosing
        ? u < 2.4
          ? [`Chuyến ${CH_TRIP.map((i) => NAMES[i]).join('+')} còn trống 0,3 pallet: cả ${NAMES[CH_WIN]} và ${NAMES[CH_RIVAL]} (0,3) đều vừa`, `Trip ${CH_TRIP.map((i) => NAMES[i]).join('+')} has room for 0.3: both ${NAMES[CH_WIN]} and ${NAMES[CH_RIVAL]} fit`]
          : [`Chọn ${NAMES[CH_WIN]} vì gần hơn: tiết kiệm ${R(linkSave(CH_WIN))} m > ${R(linkSave(CH_RIVAL))} m`, `${NAMES[CH_WIN]} is closer: it saves ${R(linkSave(CH_WIN))} m vs ${R(linkSave(CH_RIVAL))} m`]
      : !inNN ? (step?.kind === 'cap' && slow
          ? [`${NAMES[step.a]} + ${NAMES[step.b]}: tổng ${fmt(step.load)} pallet > 1 → vượt sức chứa, bỏ qua`, `${NAMES[step.a]} + ${NAMES[step.b]}: ${fmt(step.load)} pallets > 1 → over capacity, skipped`]
          : step?.kind === 'same' && slow
            ? [`${NAMES[step.a]} và ${NAMES[step.b]} đã chung chuyến → bỏ qua`, `${NAMES[step.a]} and ${NAMES[step.b]} already share a trip → skipped`]
            : ['Lần lượt gộp chuyến, miễn là xe còn chở vừa (≤ 1 pallet)', 'Merge trips one by one, as long as the load still fits (≤ 1 pallet)'])
      : !result ? ['Láng giềng gần nhất sắp thứ tự ghé: luôn tới điểm gần nhất, ghé hết thì về kho', 'Nearest neighbour orders the stops: closest first, then back to the depot']
      : ['Ít chuyến hơn, chuyến nào cũng đầy, quãng đường ngắn hơn', 'Fewer trips, every trip full, less distance'];

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 70, top: 40}}>
        <div style={{fontSize: 48, fontWeight: 800}}>
          <span style={{color: colors.green}}>Savings</span> <span style={{color: colors.muted, fontWeight: 600}}>+</span> <span style={{color: colors.yellow}}>Láng giềng gần nhất</span>
        </div>
        <div style={{fontSize: 22, color: colors.muted}}>Ví dụ đơn giản nhất · Savings + Nearest neighbour, the simplest example</div>
      </div>
      <div style={{position: 'absolute', right: 70, top: 40, textAlign: 'right', opacity: fade(T.alone, T.alone + 0.5) * (1 - fade(T.result - 0.3, T.result))}}>
        <div style={{fontSize: 19, color: colors.muted, letterSpacing: 2}}>{routes.length} CHUYẾN · TỔNG QUÃNG ĐƯỜNG</div>
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
                <Loop key={`r${ri}-${r.join('')}`} order={nn(r).order} color={col} w={r.length > 1 ? 6 : 4}
                  draw={fade(T.alone + ri * 0.25, T.alone + ri * 0.25 + 0.8)}
                  opacity={(t >= T.ex && t < T.rank && !exPart ? 0.25 : 0.85) * (isMergedNow ? 1 - merging : 1)} />
              );
            })
          : null}
        {step && step.kind === 'merge' && slow && merging < 1 && !inNN ? (
          <Loop order={nn(routes.find((r) => r.includes(step.a))!).order} color={colors.green} w={6} draw={merging} />
        ) : null}
        {/* worked example: the new link and the two removed spokes */}
        {t >= T.ex && t < T.rank ? (
          <>
            <line x1={P[EX.a][0]} y1={P[EX.a][1]} x2={P[EX.a][0] + (P[EX.b][0] - P[EX.a][0]) * fade(T.ex + 2.0, T.ex + 2.8)} y2={P[EX.a][1] + (P[EX.b][1] - P[EX.a][1]) * fade(T.ex + 2.0, T.ex + 2.8)}
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
                  <text x={P[i][0]} y={P[i][1] + 92} textAnchor="middle" fontSize={26} fontWeight={800} fill={col}
                    stroke="#0b1222" strokeWidth={7} style={{paintOrder: 'stroke'}}>
                    {judged ? `${win ? '✓ chọn' : '✗'} · tiết kiệm ${R(linkSave(i))} m` : `+0,3 → 1,0 vừa`}
                  </text>
                </g>
              );
            })
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
            KHO
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

      {/* worked example card */}
      {t >= T.ex && t < T.rank ? (
        <div style={{position: 'absolute', left: 1370, top: 560, width: 500, opacity: fade(T.ex + 0.3, T.ex + 0.7) * (1 - fade(T.rank - 0.4, T.rank)),
          background: '#0e1628', border: '2px solid #ffffff22', borderRadius: 20, padding: '20px 28px'}}>
          <div style={{fontSize: 22, color: colors.muted}}>Tiết kiệm({NAMES[EX.a]}, {NAMES[EX.b]}) · Saving</div>
          <div style={{fontSize: 34, fontWeight: 800, marginTop: 6, opacity: fade(T.ex + 0.8, T.ex + 1.2)}}>
            <span style={{color: colors.red}}>Kho→{NAMES[EX.a]} {R(dd(DEPOT, P[EX.a]))}</span> + <span style={{color: colors.red}}>Kho→{NAMES[EX.b]} {R(dd(DEPOT, P[EX.b]))}</span>
          </div>
          <div style={{fontSize: 34, fontWeight: 800, opacity: fade(T.ex + 2.6, T.ex + 3.0)}}>
            − <span style={{color: colors.green}}>{NAMES[EX.a]}→{NAMES[EX.b]} {R(dd(P[EX.a], P[EX.b]))}</span>
          </div>
          <div style={{fontSize: 62, fontWeight: 800, color: colors.green, opacity: fade(T.ex + 3.6, T.ex + 4.0)}}>= {R(EX.save)} m</div>
          <div style={{fontSize: 22, marginTop: 6, opacity: fade(T.ex + 4.4, T.ex + 4.8)}}>
            Xe chở {fmt(LOAD[EX.a])} + {fmt(LOAD[EX.b])} = {fmt(LOAD[EX.a] + LOAD[EX.b])} pallet ≤ 1 → <b style={{color: colors.green}}>vừa</b>
          </div>
        </div>
      ) : null}

      {/* ranking + decisions */}
      {t >= T.rank && !inNN ? (
        <div style={{position: 'absolute', left: 1440, top: 300, width: 470, opacity: fade(T.rank, T.rank + 0.4)}}>
          <div style={{fontSize: 18, color: colors.muted, letterSpacing: 2, marginBottom: 6}}>MỌI CẶP · MÉT TIẾT KIỆM · TẢI SAU KHI GỘP</div>
          {STEPS.map((s, r) => {
            const done = r < k || (r === k && decided);
            const col = !done ? colors.yellow : s.kind === 'merge' ? colors.green : s.kind === 'cap' ? colors.red : '#4a5570';
            return (
              <div key={r} style={{display: 'flex', alignItems: 'center', height: 40, opacity: fade(T.rank + r * 0.08, T.rank + r * 0.08 + 0.25) * (done && s.kind !== 'merge' ? 0.6 : 1),
                background: r === k && !inNN ? '#ffffff12' : 'transparent', borderRadius: 8, paddingLeft: 8}}>
                <div style={{width: 70, fontSize: 25, fontWeight: 800}}>{NAMES[s.a]}+{NAMES[s.b]}</div>
                <div style={{width: Math.max(4, s.save * 0.9), height: 14, borderRadius: 4, background: col}} />
                <div style={{marginLeft: 10, width: 80, fontSize: 22, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>{R(s.save)} m</div>
                <div style={{fontSize: 20, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>
                  {!done ? '' : s.kind === 'merge' ? `✓ gộp · ${fmt(s.load)}` : s.kind === 'cap' ? `✗ ${fmt(s.load)} > 1 quá tải` : '– đã chung'}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* trip cards during nearest neighbour */}
      {inNN && !result ? (
        <div style={{position: 'absolute', left: 1380, top: 520, width: 520}}>
          {FINAL.map((tr, ti) => (
            <div key={ti} style={{marginBottom: 22, opacity: fade(NN_AT[ti] - 0.3, NN_AT[ti])}}>
              <div style={{fontSize: 26, fontWeight: 800, color: TRIP_COL[ti]}}>
                Chuyến {ti + 1}: Kho → {tr.order.map((i) => NAMES[i]).join(' → ')} → Kho
              </div>
              <div style={{fontSize: 22, marginTop: 4}}>
                {R(tr.len)} m · tải {fmt(tr.order.reduce((s, i) => s + LOAD[i], 0))} pallet <Gauge load={tr.order.reduce((s, i) => s + LOAD[i], 0)} color={TRIP_COL[ti]} />
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
              {t: 'Mỗi điểm 1 chuyến', e: 'One trip per stop', n: N, load: `xe đầy ${R((100 * LOAD.reduce((a, b) => a + b, 0)) / N)}% mỗi chuyến`, g: LOAD.reduce((a, b) => a + b, 0) / N, m: ALONE_TOTAL, c: colors.muted},
              {t: 'Savings + Láng giềng', e: 'Savings + nearest neighbour', n: FINAL.length, load: 'xe đầy 100% mỗi chuyến', g: 1, m: SAV_TOTAL, c: colors.green},
            ].map((c) => (
              <div key={c.t} style={{width: 560, padding: '28px 34px', borderRadius: 22, background: '#0e1628', border: `3px solid ${c.c}`}}>
                <div style={{fontSize: 30, fontWeight: 800, color: c.c}}>{c.t}</div>
                <div style={{fontSize: 19, color: colors.muted}}>{c.e}</div>
                <div style={{fontSize: 28, marginTop: 18}}>{c.n} chuyến</div>
                <div style={{fontSize: 24, marginTop: 6}}>
                  {c.load} <Gauge load={c.g} color={c.c} w={140} />
                </div>
                <div style={{fontSize: 70, fontWeight: 800, color: c.c, marginTop: 10}}>{c.m} m</div>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 730, zIndex: 4, textAlign: 'center', opacity: fade(T.result + 1.2, T.result + 1.6)}}>
            <div style={{fontSize: 30, fontWeight: 700}}>
              <span style={{color: colors.green}}>Sức chứa</span>: gộp đến khi xe đầy · <span style={{color: colors.green}}>Quãng đường</span>: gộp điểm gần nhau trước
            </div>
            <div style={{fontSize: 20, color: colors.muted}}>Capacity: merge until the vehicle is full · Distance: nearby stops first · Ví dụ minh họa, khoảng cách đường thẳng</div>
          </div>
        </>
      ) : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 33, fontWeight: 700}}>{cap[0]}</div>
          <div style={{fontSize: 21, color: colors.muted}}>{cap[1]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
