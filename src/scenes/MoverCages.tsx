import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~28 s explainer without voice: pallet mover with full pallets and loose items (cage pallets), today vs the algorithm.
 * Today: pick in print order (by aisle), load as you go; the mover holds 2 pallets and goes back to the door when it is full.
 * Algorithm (as planMover in the routing app): full pallets are units; loose items are packed next-fit, in serpentine order,
 * onto cage pallets; units are paired by savings; stops inside a trip in nearest-neighbour order from the door.
 * Toy warehouse: 4 aisles of 50 m, 10 m apart, crossings at the front (door side), a cross aisle (25 m) and the back.
 */
type Bin = [number, number]; // [aisle, metres from the front]
type Item = {bin: Bin; f: number}; // f = share of a pallet (1 = full pallet)
const AISLES = ['A', 'B', 'C', 'D'];
const RAW: Item[] = [
  {bin: [0, 6], f: 1}, {bin: [0, 42], f: 0.4}, {bin: [1, 45], f: 1}, {bin: [1, 9], f: 0.3},
  {bin: [2, 7], f: 0.3}, {bin: [2, 40], f: 0.4}, {bin: [3, 44], f: 0.3}, {bin: [3, 8], f: 1},
];
const PITCH = 10;
const LEN = 50;
const CROSS = [0, 25, 50];
const DOOR_BIN: Bin = [0, 0];
const via = (a: Bin, b: Bin) => CROSS.reduce((best, c) => (Math.abs(a[1] - c) + Math.abs(b[1] - c) < Math.abs(a[1] - best) + Math.abs(b[1] - best) ? c : best), CROSS[0]);
const dist = (a: Bin, b: Bin) => {
  if (a[0] === b[0]) return Math.abs(a[1] - b[1]);
  const c = via(a, b);
  return Math.abs(a[0] - b[0]) * PITCH + Math.abs(a[1] - c) + Math.abs(b[1] - c);
};

// printed TO: aisles in order, each aisle from the end nearer to the previous stop
const ITEMS: Item[] = [];
{
  let cur = 0;
  for (let a = 0; a < AISLES.length; a++) {
    const g = RAW.filter((x) => x.bin[0] === a).sort((p, q) => p.bin[1] - q.bin[1]);
    if (!g.length) continue;
    if (Math.abs(cur - g[0].bin[1]) > Math.abs(cur - g[g.length - 1].bin[1])) g.reverse();
    ITEMS.push(...g);
    cur = ITEMS[ITEMS.length - 1].bin[1];
  }
}
const N = ITEMS.length;
const pathLen = (order: number[]) => {
  let t = 0;
  let cur = DOOR_BIN;
  for (const i of order) {
    t += dist(cur, ITEMS[i].bin);
    cur = ITEMS[i].bin;
  }
  return t + dist(cur, DOOR_BIN);
};

type Trip = {order: number[]; slot: Record<number, number>; len: number; save?: number; label: string};
const groupName = (g: number[]) =>
  ITEMS[g[0]].f >= 1 ? `Pallet ${g[0] + 1}` : `cage ${Math.round(100 * g.reduce((a, i) => a + ITEMS[i].f, 0))}%`;
const stopsLabel = (groups: number[][]) => groups.map(groupName).join(' + ');

// today: load as you go
const CUR: Trip[] = [];
{
  let order: number[] = [];
  let slot: Record<number, number> = {};
  let pal: number[] = [];
  const close = () => {
    const groups = [0, 1].map((s) => order.filter((i) => slot[i] === s)).filter((g) => g.length);
    CUR.push({order, slot, len: pathLen(order), label: stopsLabel(groups)});
    order = [];
    slot = {};
    pal = [];
  };
  ITEMS.forEach((it, i) => {
    if (it.f < 1) {
      const open = pal.findIndex((x) => x < 1 && x + it.f <= 1 + 1e-6);
      if (open >= 0) {
        pal[open] += it.f;
        order.push(i);
        slot[i] = open;
        return;
      }
    }
    if (pal.length === 2) close();
    pal.push(Math.min(it.f, 1));
    order.push(i);
    slot[i] = pal.length - 1;
  });
  if (order.length) close();
}

// algorithm: units (full pallets, cage pallets) → pairs by savings → nearest-neighbour order inside a trip
type Unit = {items: number[]; cage: boolean};
const UNITS: Unit[] = ITEMS.map((it, i) => ({items: [i], cage: false})).filter((u) => ITEMS[u.items[0]].f >= 1);
const CAGES: Unit[] = [];
{
  const serp = (i: number) => {
    const [a, m] = ITEMS[i].bin;
    return a * 1e3 + (a % 2 === 0 ? m : 999 - m);
  };
  const loose = ITEMS.map((_, i) => i).filter((i) => ITEMS[i].f < 1).sort((p, q) => serp(p) - serp(q));
  let cur: number[] = [];
  let fill = 0;
  for (const i of loose) {
    if (cur.length && fill + ITEMS[i].f <= 1 + 1e-6) {
      cur.push(i);
      fill += ITEMS[i].f;
    } else {
      if (cur.length) CAGES.push({items: cur, cage: true});
      cur = [i];
      fill = ITEMS[i].f;
    }
  }
  if (cur.length) CAGES.push({items: cur, cage: true});
  UNITS.push(...CAGES);
}
const cageFill = (u: Unit) => Math.round(100 * u.items.reduce((t, i) => t + ITEMS[i].f, 0));
function nn(items: number[]) {
  let cur = DOOR_BIN;
  const rest = [...items];
  const order: number[] = [];
  while (rest.length) {
    rest.sort((p, q) => dist(cur, ITEMS[p].bin) - dist(cur, ITEMS[q].bin));
    const n = rest.shift()!;
    order.push(n);
    cur = ITEMS[n].bin;
  }
  return order;
}
const ALG: Trip[] = [];
{
  const alone = UNITS.map((u) => pathLen(nn(u.items)));
  const pairs: {i: number; j: number; s: number}[] = [];
  for (let i = 0; i < UNITS.length; i++)
    for (let j = i + 1; j < UNITS.length; j++) pairs.push({i, j, s: alone[i] + alone[j] - pathLen(nn([...UNITS[i].items, ...UNITS[j].items]))});
  pairs.sort((p, q) => q.s - p.s);
  const used = new Set<number>();
  const mk = (us: number[], save: number) => {
    const order = nn(us.flatMap((u) => UNITS[u].items));
    const slot: Record<number, number> = {};
    us.forEach((u, s) => UNITS[u].items.forEach((i) => (slot[i] = s)));
    ALG.push({order, slot, len: pathLen(order), save, label: us.map((u) => (UNITS[u].cage ? `Cage ${CAGES.indexOf(UNITS[u]) + 1}` : `Pallet ${UNITS[u].items[0] + 1}`)).join(' + ')});
  };
  for (const p of pairs) {
    if (used.has(p.i) || used.has(p.j)) continue;
    used.add(p.i);
    used.add(p.j);
    mk([p.i, p.j], p.s);
  }
  UNITS.forEach((_, u) => !used.has(u) && mk([u], 0));
}
const CUR_TOTAL = CUR.reduce((t, x) => t + x.len, 0);
const ALG_TOTAL = ALG.reduce((t, x) => t + x.len, 0);

// ---- drawing ----
const X0 = 330;
const PXM = 18.5;
const Y0 = 850;
const LANE = 118;
const px = (m: number) => X0 + m * PXM;
const py = (a: number) => Y0 - a * LANE;
type Pt = [number, number];
const DOOR: Pt = [px(-5), py(0)];
function legPath(a: Bin, b: Bin): Pt[] {
  if (a[0] === b[0]) return [[px(a[1]), py(a[0])], [px(b[1]), py(b[0])]];
  const c = via(a, b);
  return [[px(a[1]), py(a[0])], [px(c), py(a[0])], [px(c), py(b[0])], [px(b[1]), py(b[0])]];
}
const seglen = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1]);
// route points plus the fraction of the route at which each stop is reached
function tripGeo(tr: Trip) {
  const bins = [DOOR_BIN, ...tr.order.map((i) => ITEMS[i].bin), DOOR_BIN];
  const pts: Pt[] = [DOOR];
  const at: number[] = [];
  let L = 0;
  for (let k = 1; k < bins.length; k++) {
    const leg = legPath(bins[k - 1], bins[k]);
    for (const p of leg) {
      L += seglen(pts[pts.length - 1], p);
      pts.push(p);
    }
    if (k < bins.length - 1) at.push(L);
  }
  L += seglen(pts[pts.length - 1], DOOR);
  pts.push(DOOR);
  return {pts, at: at.map((x) => x / L), L};
}
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const CUR_GEO = CUR.map(tripGeo);
const ALG_GEO = ALG.map(tripGeo);
const CAGE_COL = ['#5aa9dc', '#b58cff'];

// ---- timeline (seconds) ----
const INTRO = 6.6;
const T = {pal: INTRO + 0.5, cur: INTRO + 2.8, curStep: 3.2, cage: 0, alg: 0, algStep: 2.9, result: 0};
T.cage = T.cur + CUR.length * T.curStep + 0.4;
T.alg = T.cage + 3.4;
T.result = T.alg + ALG.length * T.algStep + 0.5;
export const MOVER_CAGES_SECONDS = Math.ceil(T.result + 5);

const Route: React.FC<{pts: Pt[]; L: number; color: string; draw: number; opacity: number}> = ({pts, L, color, draw, opacity}) =>
  draw > 0 ? (
    <path d={toD(pts)} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={opacity}
      strokeDasharray={`${L * draw} ${L + 10}`} style={{filter: `drop-shadow(0 0 7px ${color}aa)`}} />
  ) : null;

const Intro: React.FC<{t: number}> = ({t}) => {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const out = interpolate(t, [INTRO - 0.5, INTRO], [1, 0], clamp);
  const p = (a: number, b: number) => interpolate(t, [a, b], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const full = p(0.9, 1.5);
  const loose = [0.3, 0.4, 0.3];
  const looseAt = [2.3, 2.9, 3.5];
  const drive = p(4.9, 5.9);
  const lines: [number, string, string][] = [
    [0.9, 'A full pallet takes one slot', 'Pallet nguyên chiếm trọn 1 chỗ'],
    [2.3, 'Loose items share one cage pallet until full', 'Hàng lẻ xếp chung lên pallet lồng đến khi đầy'],
    [4.6, 'Both slots used → back to the door', 'Đủ 2 pallet → về cửa'],
  ];
  const SLOT_H = 210;
  let acc = 0;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: out}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center'}}>
        <div style={{fontSize: 44, fontWeight: 800}}>How the pallet mover is loaded</div>
        <div style={{fontSize: 24, color: colors.muted}}>Xe mover chở hàng thế nào</div>
      </div>
      <div style={{position: 'absolute', left: 300 + drive * 120, top: 400, display: 'flex', alignItems: 'flex-end', gap: 18}}>
        <div style={{width: 120, height: 150, borderRadius: 18, background: '#1d6fa3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800}}>
          MOVER
        </div>
        {[0, 1].map((s) => (
          <div key={s} style={{width: 170, height: SLOT_H, borderRadius: 14, border: `4px ${s ? 'dashed' : 'solid'} ${colors.muted}`, position: 'relative', overflow: 'hidden'}}>
            {s === 0 ? (
              <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: SLOT_H * full, background: colors.amber, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0b1222', fontSize: 26, fontWeight: 800}}>
                {full > 0.6 ? 'FULL' : ''}
              </div>
            ) : (
              loose.map((f, i) => {
                const y = acc;
                acc += f;
                const k = p(looseAt[i], looseAt[i] + 0.45);
                return (
                  <div key={i} style={{position: 'absolute', left: 6, right: 6, bottom: 4 + y * (SLOT_H - 8) + (1 - k) * 160, height: f * (SLOT_H - 8) - 4, opacity: k,
                    borderRadius: 6, background: colors.amber, color: '#0b1222', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {Math.round(f * 100)}%
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 300 + drive * 120 + 138, top: 620, display: 'flex', gap: 18, fontSize: 20, color: colors.muted}}>
        <div style={{width: 170, textAlign: 'center'}}>full pallet</div>
        <div style={{width: 170, textAlign: 'center'}}>cage pallet</div>
      </div>
      <div style={{position: 'absolute', left: 1000, top: 410, width: 860}}>
        {lines.map(([at, en, vi]) => (
          <div key={en} style={{marginBottom: 30, opacity: p(at, at + 0.4), transform: `translateX(${(1 - p(at, at + 0.4)) * 30}px)`}}>
            <div style={{fontSize: 34, fontWeight: 700}}>{en}</div>
            <div style={{fontSize: 22, color: colors.muted}}>{vi}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MoverCages: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.linear)};

  const titleP = spring({frame, fps, config: {damping: 200}});
  const mapIn = interpolate(t, [INTRO - 0.4, INTRO + 0.3], [0, 1], clamp);
  const curDraw = (k: number) => interpolate(t, [T.cur + k * T.curStep, T.cur + k * T.curStep + 2.3], [0, 1], ease);
  const algDraw = (k: number) => interpolate(t, [T.alg + k * T.algStep, T.alg + k * T.algStep + 2.1], [0, 1], ease);
  const inAlg = t >= T.cage;

  // active trip for the mover panel
  const phase = t < T.cur ? null : !inAlg ? 'cur' : t >= T.alg ? 'alg' : null;
  const trips = phase === 'alg' ? ALG : CUR;
  const geos = phase === 'alg' ? ALG_GEO : CUR_GEO;
  const step = phase === 'alg' ? T.algStep : T.curStep;
  const base = phase === 'alg' ? T.alg : T.cur;
  const k = phase ? Math.min(trips.length - 1, Math.floor((t - base) / step)) : -1;
  const draw = k < 0 ? 0 : phase === 'alg' ? algDraw(k) : curDraw(k);
  const reached = k < 0 ? [] : trips[k].order.filter((_, s) => draw >= geos[k].at[s]);
  const slotFill = [0, 1].map((s) => Math.min(1, reached.filter((i) => trips[k].slot[i] === s).reduce((t2, i) => t2 + ITEMS[i].f, 0)));
  const slotHasCage = [0, 1].map((s) => k >= 0 && trips[k].order.some((i) => trips[k].slot[i] === s && ITEMS[i].f < 1));
  const tripCol = phase === 'alg' ? colors.green : colors.red;

  // picked state per item for colouring
  const picked = (i: number) => {
    if (!inAlg) return CUR.some((tr, kk) => tr.order.some((x, s) => x === i && curDraw(kk) >= CUR_GEO[kk].at[s])) ? colors.red : null;
    return ALG.some((tr, kk) => tr.order.some((x, s) => x === i && algDraw(kk) >= ALG_GEO[kk].at[s])) ? colors.green : null;
  };
  const cageOf = (i: number) => CAGES.findIndex((c) => c.items.includes(i));
  const cageIn = interpolate(t, [T.cage + 0.3, T.cage + 1.0], [0, 1], clamp);
  const cageOut = interpolate(t, [T.alg - 0.3, T.alg + 0.3], [1, 0.35], clamp);

  const stage = t < INTRO ? 0 : t < T.cur ? 1 : !inAlg ? 2 : t < T.alg ? 3 : t < T.result ? 4 : 5;
  const captions: Record<number, [string, string]> = {
    0: ['', ''],
    1: ['The TO lists full pallets and loose items, aisle by aisle', 'Phiếu TO gồm pallet nguyên và hàng lẻ, in theo từng dãy'],
    2: ['Today: pick in print order, load as you go, back when the mover is full', 'Hiện tại: lấy theo thứ tự in, lấy đến đâu xếp đến đó, xe đầy thì về'],
    3: ['① Algorithm: pack loose items onto full cage pallets first', 'Thuật toán: gom hàng lẻ cho đầy pallet lồng trước'],
    4: ['② Then choose which 2 pallets ride together: the pair that saves the most metres', 'Chọn 2 pallet đi chung chuyến: cặp tiết kiệm nhiều mét nhất'],
    5: ['Fuller pallets, better-paired trips', 'Pallet đầy hơn, chuyến ghép hợp lý hơn'],
  };
  const capStart = [0, INTRO, T.cur, T.cage, T.alg, T.result][stage];
  const capIn = interpolate(t, [capStart, capStart + 0.35], [0, 1], clamp);
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});

  const curRow = (kk: number) => interpolate(t, [T.cur + kk * T.curStep + 2.2, T.cur + kk * T.curStep + 2.5], [0, 1], clamp);
  const algRow = (kk: number) => interpolate(t, [T.alg + kk * T.algStep + 2.0, T.alg + kk * T.algStep + 2.3], [0, 1], clamp);
  // warning when today's trip goes back with a cage that is far from full
  const curTripCage = (kk: number) => {
    const tr = CUR[kk];
    return [0, 1].map((s) => tr.order.filter((i) => tr.slot[i] === s)).filter((g) => g.some((i) => ITEMS[i].f < 1)).map((g) => Math.round(100 * g.reduce((a, i) => a + ITEMS[i].f, 0)));
  };
  const lowCage = phase === 'cur' && k >= 0 && draw > 0.85 ? curTripCage(k).find((p) => p < 100) : undefined;

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 80, top: 46, opacity: titleP}}>
        <div style={{fontSize: 54, fontWeight: 800}}>
          Pallet mover <span style={{color: colors.green}}>· 2 pallets per trip</span>
        </div>
        <div style={{fontSize: 24, color: colors.muted}}>Full pallets + loose items on cage pallets</div>
      </div>

      {/* legend */}
      <div style={{position: 'absolute', left: 82, top: 168, display: 'flex', gap: 30, fontSize: 20, color: colors.muted, opacity: mapIn}}>
        <span><span style={{display: 'inline-block', width: 22, height: 22, borderRadius: 5, background: colors.amber, verticalAlign: -4, marginRight: 8}} />Full pallet</span>
        <span><span style={{display: 'inline-block', width: 22, height: 22, borderRadius: 5, border: `3px dashed ${colors.muted}`, verticalAlign: -5, marginRight: 8,
          background: `linear-gradient(to top, ${colors.amber} 35%, transparent 35%)`}} />Loose item · % of a pallet</span>
        <span>Numbers = order on the printed TO</span>
      </div>

      {/* intro: how the mover is loaded */}
      {t < INTRO + 0.3 ? <Intro t={t} /> : null}

      {/* map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        {Array.from({length: AISLES.length + 1}, (_, r) =>
          [[2, 23], [27, 48]].map(([a, b]) => (
            <rect key={`${r}-${a}`} x={px(a)} y={py(r - 0.5) - 20} width={(b - a) * PXM} height={40} rx={6} fill="#1a2440" stroke="#26365c" />
          )),
        )}
        {AISLES.map((a, kk) => (
          <text key={a} x={px(LEN) + 26} y={py(kk) + 9} fontSize={24} fontWeight={800} fill={colors.muted}>
            Aisle {a}
          </text>
        ))}
        {[[0, 'FRONT'], [25, 'CROSS AISLE'], [LEN, 'BACK']].map(([m, s]) => (
          <text key={s as string} x={px(m as number)} y={py(AISLES.length - 0.5) - 34} textAnchor="middle" fontSize={17} fontWeight={700} fill={colors.amber}>
            {s}
          </text>
        ))}
        <rect x={DOOR[0] - 72} y={DOOR[1] - 26} width={72} height={52} rx={8} fill={colors.amber} />
        <text x={DOOR[0] - 36} y={DOOR[1] + 7} textAnchor="middle" fontSize={18} fontWeight={800} fill="#0b1222">
          DOOR
        </text>

        {/* cage grouping (algorithm step 1) */}
        {inAlg
          ? CAGES.map((c, ci) => {
              const pts: Pt[] = [];
              c.items.forEach((i, s) => {
                if (s) pts.push(...legPath(ITEMS[c.items[s - 1]].bin, ITEMS[i].bin));
              });
              const L = pts.slice(1).reduce((a, p, q) => a + seglen(pts[q], p), 0);
              const d = interpolate(t, [T.cage + 0.4 + ci * 0.8, T.cage + 1.2 + ci * 0.8], [0, 1], clamp);
              return pts.length ? (
                <path key={ci} d={toD(pts)} fill="none" stroke={CAGE_COL[ci]} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round"
                  opacity={0.35 * cageOut} strokeDasharray={`${L * d} ${L + 10}`} />
              ) : null;
            })
          : null}

        {CUR.map((_, kk) => (
          <Route key={`c${kk}`} {...CUR_GEO[kk]} color={colors.red} draw={inAlg ? 0 : curDraw(kk)}
            opacity={kk === k && phase === 'cur' ? 1 : t >= T.cage - 0.6 ? interpolate(t, [T.cage - 0.6, T.cage], [0.25, 0], clamp) : 0.25} />
        ))}
        {ALG.map((_, kk) => (
          <Route key={`a${kk}`} {...ALG_GEO[kk]} color={colors.green} draw={algDraw(kk)} opacity={kk === k && phase === 'alg' && t < T.result ? 1 : 0.35} />
        ))}

        {ITEMS.map((it, i) => {
          const [a, m] = it.bin;
          const s = spring({frame: frame - (T.pal + i * 0.15) * fps, fps, config: {damping: 14}});
          const pc = picked(i);
          const ci = cageOf(i);
          const full = it.f >= 1;
          const edge = inAlg && ci >= 0 && t < T.alg + 0.3 ? CAGE_COL[ci] : '#0b1222';
          const sz = 50;
          return (
            <g key={i} transform={`translate(${px(m)} ${py(a)}) scale(${s})`}>
              <rect x={-sz / 2} y={-sz / 2} width={sz} height={sz} rx={8} fill={full ? pc ?? colors.amber : '#0e1628'} stroke={full ? '#0b1222' : edge} strokeWidth={full ? 3 : 4}
                strokeDasharray={full ? undefined : '6 4'} />
              {!full ? <rect x={-sz / 2 + 4} y={sz / 2 - 4 - (sz - 8) * it.f} width={sz - 8} height={(sz - 8) * it.f} rx={3} fill={pc ?? colors.amber} /> : null}
              <text y={full ? 8 : 2} textAnchor="middle" fontSize={22} fontWeight={800} fill={full ? '#0b1222' : '#fff'} style={{paintOrder: 'stroke'}} stroke={full ? 'none' : '#0b1222'} strokeWidth={4}>
                {i + 1}
              </text>
              {!full ? (
                <text y={-sz / 2 - 8} textAnchor="middle" fontSize={17} fontWeight={700} fill={colors.muted}>
                  {Math.round(it.f * 100)}%
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* cage labels */}
      {inAlg
        ? CAGES.map((c, ci) => {
            const [a, m] = ITEMS[c.items[c.items.length - 1]].bin;
            const op = interpolate(t, [T.cage + 0.9 + ci * 0.8, T.cage + 1.2 + ci * 0.8], [0, 1], clamp) * cageOut;
            return (
              <div key={ci} style={{position: 'absolute', left: px(m), top: py(a) + 30, transform: 'translateX(-50%)', opacity: op, whiteSpace: 'nowrap',
                background: CAGE_COL[ci], color: '#0b1222', borderRadius: 10, padding: '3px 12px', fontSize: 20, fontWeight: 800}}>
                Cage {ci + 1} · {cageFill(c)}%
              </div>
            );
          })
        : null}

      {/* mover panel + trip lists */}
      <div style={{position: 'absolute', left: 1440, top: 205, width: 440, opacity: mapIn}}>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 14, height: 150, opacity: phase ? 1 : 0.35}}>
          <div style={{fontSize: 18, color: colors.muted, width: 70, lineHeight: 1.2}}>MOVER{k >= 0 ? <><br />trip {k + 1}</> : null}</div>
          {[0, 1].map((s) => (
            <div key={s} style={{textAlign: 'center'}}>
              <div style={{width: 84, height: 104, border: `3px ${slotHasCage[s] ? 'dashed' : 'solid'} ${colors.muted}`, borderRadius: 10, position: 'relative', overflow: 'hidden'}}>
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${slotFill[s] * 100}%`, background: tripCol, opacity: 0.85}} />
              </div>
              <div style={{fontSize: 17, color: colors.muted, marginTop: 4}}>{k >= 0 && slotFill[s] > 0 ? (slotHasCage[s] ? `cage ${Math.round(slotFill[s] * 100)}%` : 'full') : 'empty'}</div>
            </div>
          ))}
        </div>
        <div style={{height: 30, fontSize: 21, fontWeight: 800, color: colors.amber, opacity: lowCage !== undefined ? 1 : 0}}>
          ⚠ back with a cage only {lowCage}% full
        </div>
        <div style={{marginTop: 6, opacity: interpolate(t, [T.cur - 0.3, T.cur], [0, 1], clamp)}}>
          <div style={{fontSize: 19, letterSpacing: 2, color: colors.red, fontWeight: 800}}>TODAY · BY AISLE</div>
          {CUR.map((tr, kk) => (
            <div key={kk} style={{display: 'flex', gap: 12, alignItems: 'baseline', height: 38, opacity: curRow(kk)}}>
              <div style={{fontSize: 21, fontWeight: 700, width: 300}}>Trip {kk + 1}: {tr.label}</div>
              <div style={{fontSize: 24, fontWeight: 800, color: colors.red}}>{tr.len} m</div>
            </div>
          ))}
          <div style={{fontSize: 23, fontWeight: 800, color: colors.red}}>Total {Math.round(CUR.reduce((a, x, kk) => a + x.len * curRow(kk), 0))} m</div>
        </div>
        <div style={{marginTop: 18, opacity: interpolate(t, [T.alg - 0.3, T.alg], [0, 1], clamp)}}>
          <div style={{fontSize: 19, letterSpacing: 2, color: colors.green, fontWeight: 800}}>ALGORITHM</div>
          {ALG.map((tr, kk) => (
            <div key={kk} style={{display: 'flex', gap: 12, alignItems: 'baseline', height: 38, opacity: algRow(kk)}}>
              <div style={{fontSize: 21, fontWeight: 700, width: 300}}>Trip {kk + 1}: {tr.label}</div>
              <div style={{fontSize: 24, fontWeight: 800, color: colors.green}}>{tr.len} m</div>
            </div>
          ))}
          <div style={{fontSize: 23, fontWeight: 800, color: colors.green}}>Total {Math.round(ALG.reduce((a, x, kk) => a + x.len * algRow(kk), 0))} m</div>
        </div>
      </div>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: stage ? capIn : 0, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 5 ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res, background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(7px)'}} />
          <div style={{position: 'absolute', left: 960, top: 500, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res, textAlign: 'center',
            background: '#0e1628', border: '2px solid #ffffff2e', borderRadius: 28, padding: '32px 64px 28px', boxShadow: '0 30px 90px #000'}}>
            <div style={{fontSize: 30, fontWeight: 800}}>Same TO, same mover, {CUR.length} trips each</div>
            <div style={{fontSize: 20, color: colors.muted, marginBottom: 16}}>Cùng phiếu TO, cùng xe, mỗi cách {CUR.length} chuyến</div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 46}}>
              <div>
                <div style={{fontSize: 22, color: colors.muted}}>Today · by aisle</div>
                <div style={{fontSize: 70, fontWeight: 800, color: colors.red, whiteSpace: 'nowrap'}}>{CUR_TOTAL} m</div>
              </div>
              <div style={{fontSize: 56, color: colors.muted}}>→</div>
              <div>
                <div style={{fontSize: 22, color: colors.muted}}>Algorithm</div>
                <div style={{fontSize: 70, fontWeight: 800, color: colors.green, whiteSpace: 'nowrap'}}>{ALG_TOTAL} m</div>
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16}}>
              {[`${CAGES.length} cage pallets: ${CAGES.map(cageFill).join('% + ')}%`, `${CUR_TOTAL - ALG_TOTAL} m less`].map((x) => (
                <div key={x} style={{fontSize: 24, fontWeight: 700, padding: '8px 20px', borderRadius: 30, background: '#ffffff12', border: '1px solid #ffffff22'}}>{x}</div>
              ))}
            </div>
            <div style={{fontSize: 18, color: colors.muted, marginTop: 14}}>Illustrative layout · Sơ đồ minh họa</div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
