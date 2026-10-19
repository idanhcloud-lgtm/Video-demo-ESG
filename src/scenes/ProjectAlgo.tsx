import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * Explainer without voice, vehicles or warehouse map: how the pallet-mover planning runs in the project, step by step.
 *  1. the TO: full pallets and loose items (points = pick locations, START = the door)
 *  2. loose items packed onto cage pallets until full → units to carry
 *  3. Savings: each unit alone = its own trip; saving(a, b) = alone(a) + alone(b) − together(a, b); best pairs merged first
 *  4. Nearest neighbour: inside a trip, from where you are go to the closest stop not visited yet, then back
 * As in planMover, the "together" cost of a pair is itself measured with the nearest-neighbour order.
 * Straight-line distances for illustration (the app uses warehouse aisle distances); 1 m = 10 px.
 */
type Pt = [number, number];
const dd = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const m = (px: number) => Math.round(px / 10);
const DOOR: Pt = [260, 900];
type Item = {p: Pt; full: boolean};
const ITEMS: Item[] = [
  {p: [470, 760], full: true}, // 1
  {p: [1120, 280], full: true}, // 2
  {p: [640, 330], full: true}, // 3
  {p: [400, 520], full: true}, // 4
  {p: [990, 380], full: false}, // 5
  {p: [1200, 470], full: false}, // 6
  {p: [520, 430], full: false}, // 7
  {p: [790, 470], full: false}, // 8
];
// cage pallets: loose items packed until full (two halves per cage here)
const CAGES = [[4, 5], [6, 7]];
type Unit = {items: number[]; name: string; cage: boolean};
const UNITS: Unit[] = [
  ...ITEMS.map((it, i) => ({it, i})).filter((x) => x.it.full).map(({i}) => ({items: [i], name: `P${i + 1}`, cage: false})),
  ...CAGES.map((c) => ({items: c, name: `Cage ${c.map((i) => i + 1).join('·')}`, cage: true})),
];
function nn(items: number[]) {
  let cur = DOOR;
  const rest = [...items];
  const order: number[] = [];
  let len = 0;
  while (rest.length) {
    rest.sort((a, b) => dd(cur, ITEMS[a].p) - dd(cur, ITEMS[b].p));
    const n = rest.shift()!;
    len += dd(cur, ITEMS[n].p);
    cur = ITEMS[n].p;
    order.push(n);
  }
  return {order, len: len + dd(cur, DOOR)};
}
const ALONE = UNITS.map((u) => nn(u.items).len);
type Pair = {a: number; b: number; save: number; pick: number; blocked: number};
const PAIRS: Pair[] = [];
for (let a = 0; a < UNITS.length; a++)
  for (let b = a + 1; b < UNITS.length; b++) PAIRS.push({a, b, save: ALONE[a] + ALONE[b] - nn([...UNITS[a].items, ...UNITS[b].items]).len, pick: -1, blocked: -1});
PAIRS.sort((p, q) => q.save - p.save);
const PICKS: Pair[] = [];
{
  const used = new Set<number>();
  PAIRS.forEach((p) => {
    if (!used.has(p.a) && !used.has(p.b)) {
      p.pick = PICKS.length;
      PICKS.push(p);
      used.add(p.a);
      used.add(p.b);
    }
  });
  PAIRS.forEach((p) => {
    if (p.pick < 0) p.blocked = Math.min(...PICKS.filter((q) => [q.a, q.b].some((x) => x === p.a || x === p.b)).map((q) => q.pick));
  });
}
const TRIPS = PICKS.map((p) => nn([...UNITS[p.a].items, ...UNITS[p.b].items]));
const EX = PICKS[0];
// trip with the most stops: used to show nearest neighbour
const NN_TRIP = TRIPS.reduce((best, tr, k) => (tr.order.length > TRIPS[best].order.length ? k : best), 0);
const NN_ITEMS = [...UNITS[PICKS[NN_TRIP].a].items, ...UNITS[PICKS[NN_TRIP].b].items];
const NN_ORDER = TRIPS[NN_TRIP].order;
const ALONE_TOTAL = ALONE.reduce((a, b) => a + b, 0);
const TRIP_COL = [colors.green, '#4dd0e1', '#ff9f6b'];

// ---- timeline (seconds) ----
const T = {items: 1.2, cages: 5.0, alone: 8.6, ex: 10.6, rank: 17.6, pick0: 19.2, pickStep: 2.4, nn: 0, nnStep: 2.6, sum: 0};
T.nn = T.pick0 + PICKS.length * T.pickStep + 1.0;
const NN_AT = Array.from({length: NN_ORDER.length + 2}, (_, k) => T.nn + 1.2 + k * T.nnStep);
T.sum = NN_AT[NN_ORDER.length + 1] + 0.6;
export const PROJECT_ALGO_SECONDS = Math.ceil(T.sum + 7);
const pickAt = (k: number) => T.pick0 + k * T.pickStep;

const loopPts = (order: number[]): Pt[] => [DOOR, ...order.map((i) => ITEMS[i].p), DOOR];
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + dd(pts[k], p), 0);
const Loop: React.FC<{order: number[]; color: string; draw?: number; opacity?: number; w?: number; dash?: string}> = ({order, color, draw = 1, opacity = 1, w = 5, dash}) => {
  const pts = loopPts(order);
  const L = plen(pts);
  return draw > 0 && opacity > 0 ? (
    <path d={toD(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} strokeDasharray={dash ?? `${L * draw} ${L + 10}`} />
  ) : null;
};

export const ProjectAlgo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  const fade = (a: number, b: number) => interpolate(t, [a, b], [0, 1], clamp);
  const pop = (at: number) => spring({frame: frame - at * fps, fps, config: {damping: 14}});

  const step = t < T.cages ? 1 : t < T.alone ? 2 : t < T.nn ? 3 : t < T.sum ? 4 : 5;
  const stepIn = step === 5 ? fade(T.sum, T.sum + 0.5) : 1 - fade(T.sum - 0.5, T.sum);
  const exOn = t >= T.ex && t < T.rank;
  const exP = (a: number, b: number) => interpolate(t, [T.ex + a, T.ex + b], [0, 1], clamp);
  const merged = (k: number) => interpolate(t, [pickAt(k) + 0.4, pickAt(k) + 1.4], [0, 1], ease);
  const unitTrip = (u: number) => PICKS.findIndex((p, k) => (p.a === u || p.b === u) && t >= pickAt(k) + 0.4);
  const itemUnit = (i: number) => UNITS.findIndex((u) => u.items.includes(i));
  const inNN = step === 4;
  const focus = (i: number) => (!inNN ? 1 : NN_ITEMS.includes(i) ? 1 : 0.18);
  const savingTotal = Math.round(m(ALONE_TOTAL) - PICKS.reduce((s, p, k) => s + m(p.save) * merged(k), 0));

  // nearest-neighbour inside the focused trip
  const nnK = NN_AT.findIndex((s, i) => t >= s && t < (NN_AT[i + 1] ?? Infinity));
  const nnLocal = nnK >= 0 && nnK <= NN_ORDER.length ? (t - NN_AT[nnK]) / T.nnStep : 1;
  const nnFrom = (k: number): Pt => (k === 0 ? DOOR : ITEMS[NN_ORDER[k - 1]].p);
  const nnDraw = (k: number) => (!inNN || t < NN_AT[0] ? 0 : k < nnK ? 1 : k === nnK ? interpolate(nnLocal, [0.6, 0.95], [0, 1], ease) : 0);
  const nnVisited = (i: number) => {
    const k = NN_ORDER.indexOf(i);
    return k >= 0 && (k < nnK || (k === nnK && nnLocal >= 0.6));
  };

  const captions: Record<number, [string, string]> = {
    1: ['The TO: full pallets and loose items to pick', 'Phiếu TO: pallet nguyên và hàng lẻ cần lấy'],
    2: ['① Loose items are packed onto cage pallets until full', '① Hàng lẻ được gom lên pallet lồng cho đầy'],
    3: ['② Savings decides which two pallets ride together', '② Savings quyết định 2 pallet nào đi chung chuyến'],
    4: ['③ Nearest neighbour orders the stops inside each trip', '③ Láng giềng gần nhất sắp thứ tự ghé trong từng chuyến'],
    5: ['The plan: who rides together, and in which order', 'Kết quả: hàng nào đi chung, ghé theo thứ tự nào'],
  };
  const sub3: [string, string] | null =
    step !== 3 ? null
      : t < T.ex ? ['Start: every pallet as its own trip, out and back', 'Ban đầu: mỗi pallet một chuyến riêng, đi rồi về']
      : t < T.rank ? ['Two trips → one: the metres no longer driven are the saving', 'Gộp 2 chuyến thành 1: quãng đường bớt được chính là "saving"']
      : t < T.pick0 ? ['Score every pair the same way', 'Tính như vậy cho mọi cặp']
      : ['Merge the biggest saving first; a pallet already paired is skipped', 'Gộp cặp tiết kiệm nhất trước; pallet đã có cặp thì bỏ qua'];
  const sub4: [string, string] | null =
    step !== 4 ? null
      : nnK <= 0 && nnLocal < 0.6 ? ['From the door, measure to every stop of this trip', 'Từ cửa, đo tới mọi điểm của chuyến này']
      : nnK < NN_ORDER.length ? ['Go to the closest stop not visited yet, then repeat', 'Đi tới điểm gần nhất chưa ghé, rồi lặp lại']
      : ['All stops done → back to the door', 'Ghé hết → về cửa'];
  const cap = sub3 ?? sub4 ?? captions[step];
  const capKey = cap[0];
  const capStartMap: Record<string, number> = {};
  const capIn = fade(
    step === 1 ? 0.4 : step === 2 ? T.cages : step === 3 ? (t < T.ex ? T.alone : t < T.rank ? T.ex : t < T.pick0 ? T.rank : T.pick0) : step === 4 ? T.nn : T.sum,
    (step === 1 ? 0.4 : step === 2 ? T.cages : step === 3 ? (t < T.ex ? T.alone : t < T.rank ? T.ex : t < T.pick0 ? T.rank : T.pick0) : step === 4 ? T.nn : T.sum) + 0.35,
  );
  void capStartMap;
  void capKey;

  const stepNames = ['TO', 'Cage pallets', 'Savings', 'Nearest neighbour'];
  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      {/* header with pipeline */}
      <div style={{position: 'absolute', left: 70, top: 40}}>
        <div style={{fontSize: 46, fontWeight: 800}}>How the app plans pallet-mover trips</div>
        <div style={{fontSize: 21, color: colors.muted}}>Ứng dụng lập chuyến cho xe mover như thế nào · 2 pallets per trip</div>
        <div style={{display: 'flex', gap: 10, marginTop: 16}}>
          {stepNames.map((s, k) => {
            const on = step === k + 1 || (step === 5 && true);
            return (
              <div key={s} style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{padding: '6px 16px', borderRadius: 20, fontSize: 20, fontWeight: 800, background: on ? (k === 2 ? colors.green : k === 3 ? colors.yellow : '#ffffff') : '#ffffff14',
                  color: on ? '#0b1222' : colors.muted}}>
                  {k ? `${k}. ` : ''}{s}
                </div>
                {k < stepNames.length - 1 ? <div style={{color: colors.muted, fontSize: 20}}>→</div> : null}
              </div>
            );
          })}
        </div>
      </div>
      {step === 3 ? (
        <div style={{position: 'absolute', right: 70, top: 44, textAlign: 'right', opacity: fade(T.alone, T.alone + 0.5)}}>
          <div style={{fontSize: 19, color: colors.muted, letterSpacing: 2}}>ALL TRIPS · TOTAL</div>
          <div style={{fontSize: 72, fontWeight: 800, lineHeight: 1, color: colors.green}}>
            {savingTotal}
            <span style={{fontSize: 30, color: colors.muted, marginLeft: 8}}>m</span>
          </div>
        </div>
      ) : null}

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: step === 5 ? 1 - fade(T.sum, T.sum + 0.5) : 1}}>
        {/* step 2: cage hulls */}
        {CAGES.map((c, ci) => {
          const [a, b] = c.map((i) => ITEMS[i].p);
          const cx = (a[0] + b[0]) / 2;
          const cy = (a[1] + b[1]) / 2;
          const len = dd(a, b) + 90;
          const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          const show = fade(T.cages + 0.5 + ci * 0.9, T.cages + 1.1 + ci * 0.9) * (1 - fade(T.alone, T.alone + 0.6) * 0.6) * (inNN ? (NN_ITEMS.includes(c[0]) ? 1 : 0.2) : 1);
          return (
            <g key={ci} transform={`translate(${cx} ${cy}) rotate(${ang})`} opacity={show}>
              <rect x={-len / 2} y={-44} width={len} height={88} rx={44} fill="none" stroke="#b58cff" strokeWidth={4} strokeDasharray="12 9" />
              <text y={-56} textAnchor="middle" fontSize={22} fontWeight={800} fill="#b58cff" transform={Math.abs(ang) > 90 ? 'rotate(180)' : undefined}>
                Cage {c.map((i) => i + 1).join('·')} · 100%
              </text>
            </g>
          );
        })}

        {/* step 3: each unit alone (grey loops), worked example, merges */}
        {step === 3
          ? UNITS.map((u, k) => {
              const tk = unitTrip(k);
              const exPart = exOn && (k === EX.a || k === EX.b);
              const fadeOther = exOn && !exPart ? 1 - exP(0, 0.4) * 0.8 : 1;
              const goneByEx = exPart ? 1 - exP(2.4, 3.0) : 1;
              const goneByPick = tk >= 0 ? 1 - merged(tk) : 1;
              return (
                <Loop key={k} order={nn(u.items).order} color={exPart && exP(0.4, 0.8) > 0 ? colors.red : '#8f9bb5'} w={exPart ? 6 : 4}
                  draw={fade(T.alone + k * 0.2, T.alone + k * 0.2 + 0.8)} opacity={0.85 * fadeOther * goneByEx * goneByPick} />
              );
            })
          : null}
        {exOn ? <Loop order={TRIPS[0].order} color={colors.green} w={7} draw={interpolate(t, [T.ex + 2.4, T.ex + 3.4], [0, 1], ease)} /> : null}
        {step >= 3 && step < 5
          ? PICKS.map((p, k) => (
              <Loop key={k} order={TRIPS[k].order} color={TRIP_COL[k]} w={6} draw={step === 4 ? (k === NN_TRIP ? 0 : 1) : merged(k)} opacity={step === 4 ? (k === NN_TRIP ? 0 : 0.15) : 0.9} />
            ))
          : null}

        {/* step 4: nearest neighbour inside the focused trip */}
        {inNN && nnK >= 0 && nnK < NN_ORDER.length
          ? NN_ORDER.slice(nnK).map((i) => {
              const from = nnFrom(nnK);
              const best = i === NN_ORDER[nnK];
              const show = interpolate(nnLocal, [0, 0.2], [0, 1], clamp);
              const keep = best ? 1 : interpolate(nnLocal, [0.4, 0.58], [1, 0], clamp);
              const col = best && nnLocal > 0.4 ? colors.yellow : '#8f9bb5';
              const mid: Pt = [from[0] + (ITEMS[i].p[0] - from[0]) * 0.72, from[1] + (ITEMS[i].p[1] - from[1]) * 0.72];
              return (
                <g key={i} opacity={keep}>
                  <line x1={from[0]} y1={from[1]} x2={from[0] + (ITEMS[i].p[0] - from[0]) * show} y2={from[1] + (ITEMS[i].p[1] - from[1]) * show} stroke={col} strokeWidth={4} strokeDasharray="10 9" />
                  <text x={mid[0]} y={mid[1] - 10} textAnchor="middle" fontSize={24} fontWeight={800} fill={col} opacity={show} stroke="#0b1222" strokeWidth={6} style={{paintOrder: 'stroke'}}>
                    {m(dd(from, ITEMS[i].p))} m
                  </text>
                </g>
              );
            })
          : null}
        {inNN
          ? Array.from({length: NN_ORDER.length + 1}, (_, k) => {
              const a = nnFrom(k);
              const b = k < NN_ORDER.length ? ITEMS[NN_ORDER[k]].p : DOOR;
              const p = nnDraw(k);
              return p > 0 ? <line key={k} x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * p} y2={a[1] + (b[1] - a[1]) * p} stroke={colors.yellow} strokeWidth={7} strokeLinecap="round" /> : null;
            })
          : null}
        {inNN && nnK >= 0 && nnK <= NN_ORDER.length && nnLocal < 0.6 ? (
          <circle cx={nnFrom(nnK)[0]} cy={nnFrom(nnK)[1]} r={44 + 6 * Math.sin(t * 6)} fill="none" stroke="#fff" strokeWidth={3} />
        ) : null}

        {/* door + items */}
        <g transform={`translate(${DOOR[0]} ${DOOR[1]}) scale(${pop(0.5)})`}>
          <rect x={-46} y={-28} width={92} height={56} rx={9} fill={colors.amber} />
          <text y={8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0b1222">
            DOOR
          </text>
        </g>
        {ITEMS.map((it, i) => {
          const s = pop(T.items + i * 0.15);
          const u = itemUnit(i);
          const tk = step === 3 || step === 4 ? unitTrip(u) : -1;
          const fill = inNN ? (nnVisited(i) ? colors.yellow : NN_ITEMS.includes(i) ? '#8f9bb5' : '#8f9bb5') : tk >= 0 ? TRIP_COL[tk] : colors.amber;
          const label = String(i + 1);
          return (
            <g key={i} transform={`translate(${it.p[0]} ${it.p[1]}) scale(${s})`} opacity={focus(i)}>
              <rect x={-26} y={-26} width={52} height={52} rx={9} fill={it.full ? fill : '#0e1628'} stroke={it.full ? '#0b1222' : fill} strokeWidth={4} strokeDasharray={it.full ? undefined : '7 5'} />
              {!it.full ? <rect x={-21} y={0} width={42} height={21} rx={4} fill={fill} /> : null}
              <text y={it.full ? 9 : 2} textAnchor="middle" fontSize={24} fontWeight={800} fill={it.full ? '#0b1222' : '#fff'} stroke={it.full ? 'none' : '#0b1222'} strokeWidth={5} style={{paintOrder: 'stroke'}}>
                {label}
              </text>
              {inNN && nnVisited(i) ? (
                <g transform="translate(26 -28)">
                  <circle r={17} fill={colors.yellow} stroke="#0b1222" strokeWidth={3} />
                  <text y={7} textAnchor="middle" fontSize={19} fontWeight={800} fill="#0b1222">
                    {NN_ORDER.indexOf(i) + 1}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* step 1 legend */}
      <div style={{position: 'absolute', left: 1360, top: 330, opacity: fade(T.items + 1.4, T.items + 1.8) * (1 - fade(T.alone - 0.3, T.alone))}}>
        {[
          [true, 'Full pallet', 'Pallet nguyên'],
          [false, 'Loose item (½ pallet)', 'Hàng lẻ (nửa pallet)'],
        ].map(([full, en, vi]) => (
          <div key={en as string} style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26}}>
            <div style={{width: 48, height: 48, borderRadius: 9, background: full ? colors.amber : 'transparent', border: full ? 'none' : `4px dashed ${colors.amber}`, position: 'relative'}}>
              {!full ? <div style={{position: 'absolute', left: 4, right: 4, bottom: 4, height: 18, background: colors.amber, borderRadius: 3}} /> : null}
            </div>
            <div>
              <div style={{fontSize: 30, fontWeight: 700}}>{en as string}</div>
              <div style={{fontSize: 20, color: colors.muted}}>{vi as string}</div>
            </div>
          </div>
        ))}
        <div style={{fontSize: 24, marginTop: 30, opacity: fade(T.cages + 2.0, T.cages + 2.4)}}>
          8 lines → <b>{UNITS.length} pallets</b> → <b>{UNITS.length / 2} trips</b>
        </div>
      </div>

      {/* step 3: worked example */}
      {exOn ? (
        <div style={{position: 'absolute', left: 1330, top: 260, width: 540, opacity: exP(0.6, 1.0) * (1 - fade(T.rank - 0.4, T.rank))}}>
          <div style={{fontSize: 24, color: colors.muted, marginBottom: 12}}>{UNITS[EX.a].name} and {UNITS[EX.b].name}</div>
          <div style={{fontSize: 28, display: 'flex', justifyContent: 'space-between', color: colors.red, fontWeight: 700}}>
            <span>{UNITS[EX.a].name} alone</span>
            <span>{m(ALONE[EX.a])} m</span>
          </div>
          <div style={{fontSize: 28, display: 'flex', justifyContent: 'space-between', color: colors.red, fontWeight: 700, marginTop: 6}}>
            <span>{UNITS[EX.b].name} alone</span>
            <span>{m(ALONE[EX.b])} m</span>
          </div>
          <div style={{fontSize: 28, display: 'flex', justifyContent: 'space-between', color: colors.green, fontWeight: 700, marginTop: 6, opacity: exP(2.6, 3.0)}}>
            <span>Together, one trip</span>
            <span>{m(nn([...UNITS[EX.a].items, ...UNITS[EX.b].items]).len)} m</span>
          </div>
          <div style={{borderTop: '2px solid #ffffff33', marginTop: 16, paddingTop: 12, opacity: exP(3.8, 4.2)}}>
            <div style={{fontSize: 22, color: colors.muted}}>Saving · Tiết kiệm</div>
            <div style={{fontSize: 70, fontWeight: 800, color: colors.green}}>{m(EX.save)} m</div>
          </div>
        </div>
      ) : null}

      {/* step 3: ranking */}
      {step === 3 ? (
        <div style={{position: 'absolute', left: 1300, top: 250, width: 600, opacity: fade(T.rank, T.rank + 0.4)}}>
          <div style={{fontSize: 18, color: colors.muted, letterSpacing: 2, marginBottom: 6}}>EVERY PAIR · METRES SAVED</div>
          {PAIRS.map((p, r) => {
            const picked = p.pick >= 0 && t >= pickAt(p.pick);
            const blocked = p.blocked >= 0 && t >= pickAt(p.blocked) + 1.0;
            const col = picked ? TRIP_COL[p.pick] : blocked ? '#4a5570' : colors.yellow;
            return (
              <div key={r} style={{display: 'flex', alignItems: 'center', height: 42, opacity: fade(T.rank + r * 0.07, T.rank + r * 0.07 + 0.25) * (blocked ? 0.45 : 1),
                background: picked ? `${col}22` : 'transparent', borderRadius: 8, paddingLeft: 8}}>
                <div style={{width: 250, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: blocked ? 'line-through' : 'none'}}>
                  {UNITS[p.a].name} + {UNITS[p.b].name}
                </div>
                <div style={{width: Math.max(4, m(p.save) * 1.25), height: 16, borderRadius: 4, background: col}} />
                <div style={{marginLeft: 10, fontSize: 21, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>{m(p.save)} m</div>
                <div style={{marginLeft: 10, fontSize: 19, fontWeight: 800, color: col, whiteSpace: 'nowrap'}}>{picked ? `✓ trip ${p.pick + 1}` : ''}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* step 4: stop list */}
      {inNN ? (
        <div style={{position: 'absolute', left: 1330, top: 300, width: 540, opacity: fade(T.nn, T.nn + 0.4)}}>
          <div style={{fontSize: 22, color: colors.muted, marginBottom: 10}}>
            Trip {NN_TRIP + 1}: {UNITS[PICKS[NN_TRIP].a].name} + {UNITS[PICKS[NN_TRIP].b].name} · {NN_ORDER.length} stops
          </div>
          {NN_ORDER.map((i, k) => (
            <div key={i} style={{fontSize: 36, fontWeight: 800, height: 56, opacity: nnVisited(i) ? 1 : 0.2, color: colors.yellow}}>
              Stop {k + 1} → #{i + 1}
            </div>
          ))}
          <div style={{fontSize: 36, fontWeight: 800, color: colors.amber, opacity: nnDraw(NN_ORDER.length) > 0.5 ? 1 : 0.2}}>→ DOOR</div>
        </div>
      ) : null}

      {/* step 5: summary */}
      {step === 5 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', justifyContent: 'center', gap: 30, opacity: stepIn}}>
          {TRIPS.map((tr, k) => (
            <div key={k} style={{width: 470, borderRadius: 22, background: '#0e1628', border: `3px solid ${TRIP_COL[k]}`, padding: '26px 30px', opacity: fade(T.sum + 0.3 + k * 0.4, T.sum + 0.7 + k * 0.4)}}>
              <div style={{fontSize: 22, color: colors.muted, letterSpacing: 2}}>TRIP {k + 1}</div>
              <div style={{fontSize: 30, fontWeight: 800, color: TRIP_COL[k], marginTop: 4}}>
                {UNITS[PICKS[k].a].name} + {UNITS[PICKS[k].b].name}
              </div>
              <div style={{fontSize: 18, color: colors.muted, marginTop: 14}}>chosen by Savings · saves {m(PICKS[k].save)} m</div>
              <div style={{fontSize: 28, fontWeight: 700, marginTop: 14}}>DOOR → {tr.order.map((i) => `#${i + 1}`).join(' → ')} → DOOR</div>
              <div style={{fontSize: 18, color: colors.muted, marginTop: 6}}>stop order by nearest neighbour</div>
              <div style={{fontSize: 40, fontWeight: 800, color: TRIP_COL[k], marginTop: 12}}>{m(tr.len)} m</div>
            </div>
          ))}
        </div>
      ) : null}
      {step === 5 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 690, textAlign: 'center', fontSize: 18, color: colors.muted, opacity: stepIn}}>
          Straight-line distances for illustration; the app measures along the warehouse aisles · Khoảng cách minh họa theo đường thẳng
        </div>
      ) : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', opacity: capIn, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{cap[0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{cap[1]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
