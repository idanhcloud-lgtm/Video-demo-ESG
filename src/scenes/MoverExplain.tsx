import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~30 s explainer without voice and without moving vehicles: what the pallet-mover algorithm does, step by step.
 * Same TO as MoverRace. Steps follow planMover in the routing app:
 *  1. TO lines → full pallets + loose parts (quantity / pallet spec from SAP)
 *  2. loose parts packed next-fit, in serpentine order, onto cage pallets
 *  3. every pair of units scored by metres saved = alone(a) + alone(b) − together(a, b); best pairs taken first
 *  4. stops inside a trip in nearest-neighbour order from the door
 * Toy warehouse: 4 aisles of 50 m, 10 m apart, crossings at the front (door side), a cross aisle (25 m) and the back.
 */
type Bin = [number, number]; // [aisle, metres from the front]
type Line = {bin: Bin; qty: number; spec: number};
const AISLES = ['A', 'B', 'C', 'D'];
// printed TO order (by aisle, each aisle from the nearer end) — same items as MoverRace
const LINES: Line[] = [
  {bin: [0, 6], qty: 300, spec: 300}, {bin: [0, 44], qty: 250, spec: 500}, {bin: [1, 42], qty: 16, spec: 16}, {bin: [1, 8], qty: 375, spec: 750},
  {bin: [2, 6], qty: 50, spec: 100}, {bin: [2, 45], qty: 500, spec: 1000}, {bin: [3, 44], qty: 200, spec: 200}, {bin: [3, 9], qty: 60, spec: 60},
];
const N = LINES.length;
const F = LINES.map((l) => l.qty / l.spec);
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
const pathLen = (order: number[]) => {
  let t = 0;
  let cur = DOOR_BIN;
  for (const i of order) {
    t += dist(cur, LINES[i].bin);
    cur = LINES[i].bin;
  }
  return t + dist(cur, DOOR_BIN);
};
function nn(items: number[]) {
  let cur = DOOR_BIN;
  const rest = [...items];
  const order: number[] = [];
  while (rest.length) {
    rest.sort((p, q) => dist(cur, LINES[p].bin) - dist(cur, LINES[q].bin));
    const n = rest.shift()!;
    order.push(n);
    cur = LINES[n].bin;
  }
  return order;
}

// step 1–2: units
type Unit = {items: number[]; cage: boolean; name: string};
const UNITS: Unit[] = [];
F.forEach((f, i) => f >= 1 && UNITS.push({items: [i], cage: false, name: `Pallet ${i + 1}`}));
const CAGES: number[][] = [];
{
  const serp = (i: number) => LINES[i].bin[0] * 1e3 + (LINES[i].bin[0] % 2 === 0 ? LINES[i].bin[1] : 999 - LINES[i].bin[1]);
  let cur: number[] = [];
  let fill = 0;
  for (const i of F.map((_, k) => k).filter((k) => F[k] < 1).sort((p, q) => serp(p) - serp(q))) {
    if (cur.length && fill + F[i] <= 1 + 1e-6) {
      cur.push(i);
      fill += F[i];
    } else {
      if (cur.length) CAGES.push(cur);
      cur = [i];
      fill = F[i];
    }
  }
  if (cur.length) CAGES.push(cur);
  CAGES.forEach((c) => UNITS.push({items: c, cage: true, name: `Cage ${[...c].sort().map((i) => i + 1).join('+')}`}));
}
// step 3: pairs ranked by saving, greedy pick
const ALONE = UNITS.map((u) => pathLen(nn(u.items)));
type Pair = {a: number; b: number; save: number; pick: number; blockedBy: number};
const PAIRS: Pair[] = [];
for (let a = 0; a < UNITS.length; a++)
  for (let b = a + 1; b < UNITS.length; b++) PAIRS.push({a, b, save: ALONE[a] + ALONE[b] - pathLen(nn([...UNITS[a].items, ...UNITS[b].items])), pick: -1, blockedBy: -1});
PAIRS.sort((p, q) => q.save - p.save);
const TRIPS: {units: number[]; order: number[]; len: number; save: number}[] = [];
{
  const owner: Record<number, number> = {};
  PAIRS.forEach((p) => {
    if (owner[p.a] === undefined && owner[p.b] === undefined) {
      p.pick = TRIPS.length;
      owner[p.a] = owner[p.b] = p.pick;
      const order = nn([...UNITS[p.a].items, ...UNITS[p.b].items]);
      TRIPS.push({units: [p.a, p.b], order, len: pathLen(order), save: p.save});
    }
  });
  PAIRS.forEach((p) => {
    if (p.pick < 0) p.blockedBy = Math.min(owner[p.a] ?? 99, owner[p.b] ?? 99);
  });
}
const ALG_TOTAL = TRIPS.reduce((t, x) => t + x.len, 0);
// today: walk the printed TO, take what fits (2 slots; loose items share a cage), the rest waits for the next trip
const TODAY: {loads: number[][]; len: number}[] = [];
{
  let left = LINES.map((_, i) => i);
  while (left.length) {
    const loads: number[][] = [];
    const fill: number[] = [];
    const order: number[] = [];
    const rest: number[] = [];
    for (const i of left) {
      const open = F[i] < 1 ? fill.findIndex((x) => x < 1 && x + F[i] <= 1 + 1e-6) : -1;
      if (open >= 0) {
        fill[open] += F[i];
        loads[open].push(i);
        order.push(i);
      } else if (fill.length < 2) {
        fill.push(F[i]);
        loads.push([i]);
        order.push(i);
      } else rest.push(i);
    }
    TODAY.push({loads, len: pathLen(order)});
    left = rest;
  }
}
const TODAY_TOTAL = TODAY.reduce((t, x) => t + x.len, 0);
const loadName = (g: number[]) => (F[g[0]] >= 1 ? `Pallet ${g[0] + 1}` : `Cage ${[...g].sort().map((i) => i + 1).join('+')}`);

// ---- drawing ----
const PXM = 15.5;
const px = (m: number) => 1040 + m * PXM;
const Y0 = 830;
const LANE = 122;
const py = (a: number) => Y0 - a * LANE;
type Pt = [number, number];
const DOOR: Pt = [px(-6), py(0)];
function routePts(order: number[]): Pt[] {
  const bins = [DOOR_BIN, ...order.map((i) => LINES[i].bin), DOOR_BIN];
  const P = (b: Bin): Pt => [px(b[1]), py(b[0])];
  const pts: Pt[] = [DOOR];
  for (let k = 1; k < bins.length; k++) {
    const [a, b] = [bins[k - 1], bins[k]];
    if (a[0] === b[0]) pts.push(P(a), P(b));
    else {
      const c = via(a, b);
      pts.push(P(a), P([a[0], c]), P([b[0], c]), P(b));
    }
  }
  pts.push(DOOR);
  return pts;
}
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
const CAGE_COL = ['#5aa9dc', '#b58cff'];
const TRIP_COL = [colors.green, '#4dd0e1', '#ff9f6b'];

// ---- timeline (seconds) ----
const T = {list: 1.0, convert: 5.2, cage: 9.4, pairs: 13.8, pick0: 15.4, pickStep: 2.6, result: 0};
T.result = T.pick0 + TRIPS.length * T.pickStep + 0.6;
export const MOVER_EXPLAIN_SECONDS = Math.ceil(T.result + 6);
const pickAt = (k: number) => T.pick0 + k * T.pickStep;

export const MoverExplain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  const fade = (a: number, b: number) => interpolate(t, [a, b], [0, 1], clamp);

  const stage = t < T.convert ? 1 : t < T.cage ? 2 : t < T.pairs ? 3 : t < T.result ? 4 : 5;
  const captions: Record<number, [string, string]> = {
    1: ['① Start from the TO: what to pick, how many, where', 'Bắt đầu từ phiếu TO: mã hàng, số lượng, vị trí'],
    2: ['② Convert each line into pallets, using the pallet spec from SAP', 'Quy đổi từng dòng ra pallet theo quy cách SAP'],
    3: ['③ Loose items share a cage pallet until it is full', 'Hàng lẻ xếp chung lên pallet lồng cho đầy'],
    4: ['④ Score every pair of pallets by metres saved → pick the best pairs first', 'Chấm điểm mọi cặp pallet theo mét tiết kiệm → chọn cặp tốt nhất trước'],
    5: ['Same full loads, smarter grouping', 'Tải đầy như nhau, chỉ gom chuyến hợp lý hơn'],
  };
  const capStart = [0, 0.6, T.convert, T.cage, T.pairs, T.result][stage];
  const capIn = fade(capStart, capStart + 0.35);
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const titleP = spring({frame, fps, config: {damping: 200}});
  const conv = (i: number) => fade(T.convert + 0.3 + i * 0.32, T.convert + 0.6 + i * 0.32);
  const cageP = (c: number) => interpolate(t, [T.cage + 0.5 + c * 1.4, T.cage + 1.5 + c * 1.4], [0, 1], ease);
  const listOut = 1 - fade(T.cage - 0.3, T.cage);
  const unitsIn = fade(T.cage - 0.1, T.cage + 0.3) * (1 - fade(T.pairs - 0.3, T.pairs));
  const tripOf = (i: number) => TRIPS.findIndex((tr, k) => t >= pickAt(k) + 0.2 && tr.order.includes(i));

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 60, top: 36, opacity: titleP}}>
        <div style={{fontSize: 50, fontWeight: 800}}>
          How the algorithm plans <span style={{color: colors.green}}>pallet-mover trips</span>
        </div>
        <div style={{fontSize: 22, color: colors.muted}}>Thuật toán lập chuyến cho xe mover · 2 pallets per trip</div>
      </div>

      {/* ---- left panel ---- */}
      {/* steps 1–2: TO list */}
      <div style={{position: 'absolute', left: 60, top: 175, width: 800, opacity: listOut}}>
        <div style={{display: 'flex', fontSize: 17, color: colors.muted, letterSpacing: 1.5, marginBottom: 8, opacity: fade(T.list, T.list + 0.3)}}>
          <div style={{width: 60}}>#</div>
          <div style={{width: 130}}>LOCATION</div>
          <div style={{width: 130}}>QTY</div>
          <div style={{width: 190}}>PALLET SPEC</div>
          <div>= PALLETS</div>
        </div>
        {LINES.map((l, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', height: 56, fontSize: 24, borderTop: '1px solid #ffffff14', opacity: fade(T.list + i * 0.35, T.list + i * 0.35 + 0.3)}}>
            <div style={{width: 60, fontWeight: 800}}>{i + 1}</div>
            <div style={{width: 130}}>{AISLES[l.bin[0]]}-{String(l.bin[1]).padStart(2, '0')}</div>
            <div style={{width: 130}}>{l.qty}</div>
            <div style={{width: 190, color: colors.muted}}>{l.spec} / pallet</div>
            <div style={{opacity: conv(i), fontWeight: 800, color: F[i] >= 1 ? colors.amber : colors.text}}>
              {F[i] >= 1 ? '1 full pallet' : `½ pallet · loose`}
            </div>
          </div>
        ))}
      </div>

      {/* step 3: units */}
      <div style={{position: 'absolute', left: 60, top: 190, width: 820, opacity: unitsIn}}>
        <div style={{fontSize: 20, color: colors.muted, letterSpacing: 1.5, marginBottom: 18}}>PALLETS TO CARRY · ĐƠN VỊ CẦN CHỞ</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 22}}>
          {UNITS.map((u, k) => {
            const c = u.cage ? CAGES.findIndex((g) => g === u.items) : -1;
            const p = u.cage ? cageP(c) : 1;
            return (
              <div key={k} style={{width: 170, textAlign: 'center', opacity: u.cage ? fade(T.cage + 0.3 + c * 1.4, T.cage + 0.6 + c * 1.4) : 1}}>
                <div style={{height: 150, borderRadius: 12, border: `4px ${u.cage ? 'dashed' : 'solid'} ${u.cage ? CAGE_COL[c] : colors.amber}`, position: 'relative', overflow: 'hidden',
                  background: u.cage ? 'transparent' : colors.amber}}>
                  {u.cage
                    ? u.items.map((i, s) => (
                        <div key={i} style={{position: 'absolute', left: 6, right: 6, height: 68, bottom: 4 + s * 72 + (1 - p) * (120 + s * 60), opacity: p,
                          background: colors.amber, borderRadius: 6, color: '#0b1222', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          #{i + 1} · ½
                        </div>
                      ))
                    : (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0b1222', fontSize: 30, fontWeight: 800}}>#{u.items[0] + 1}</div>
                      )}
                </div>
                <div style={{fontSize: 22, fontWeight: 800, marginTop: 8, color: u.cage ? CAGE_COL[c] : colors.text}}>{u.name}</div>
                <div style={{fontSize: 17, color: colors.muted}}>{u.cage ? `${u.items.length} stops · 100%` : '1 stop'}</div>
              </div>
            );
          })}
        </div>
        <div style={{fontSize: 24, marginTop: 34, opacity: fade(T.cage + 3.4, T.cage + 3.8)}}>
          8 TO lines → <b>{UNITS.length} pallets</b>, all full → <b>{Math.ceil(UNITS.length / 2)} trips</b>
        </div>
      </div>

      {/* step 4: ranked pairs */}
      <div style={{position: 'absolute', left: 60, top: 172, width: 860, opacity: fade(T.pairs - 0.1, T.pairs + 0.3) * (1 - fade(T.result - 0.2, T.result + 0.2) * 0.75)}}>
        <div style={{fontSize: 18, color: colors.muted, letterSpacing: 1.5, marginBottom: 6}}>EVERY PAIR · METRES SAVED IF THEY SHARE A TRIP</div>
        {PAIRS.map((p, r) => {
          const picked = p.pick >= 0 && t >= pickAt(p.pick);
          const blocked = p.blockedBy >= 0 && t >= pickAt(p.blockedBy) + 0.9;
          const col = picked ? TRIP_COL[p.pick] : blocked ? '#4a5570' : colors.yellow;
          return (
            <div key={r} style={{display: 'flex', alignItems: 'center', height: 40, opacity: fade(T.pairs + r * 0.07, T.pairs + r * 0.07 + 0.25) * (blocked ? 0.5 : 1),
              background: picked ? `${TRIP_COL[p.pick]}1f` : 'transparent', borderRadius: 8, paddingLeft: 8}}>
              <div style={{width: 300, fontSize: 21, fontWeight: 700, textDecoration: blocked ? 'line-through' : 'none', color: blocked ? colors.muted : colors.text}}>
                {UNITS[p.a].name} + {UNITS[p.b].name}
              </div>
              <div style={{width: Math.max(4, p.save * 2.3), height: 16, borderRadius: 4, background: col}} />
              <div style={{marginLeft: 10, width: 80, fontSize: 21, fontWeight: 800, color: col}}>{p.save} m</div>
              <div style={{fontSize: 19, fontWeight: 800, color: col}}>{picked ? `✓ Trip ${p.pick + 1}${p.save <= 0 ? ' · the last two left' : ''}` : blocked ? 'already paired' : ''}</div>
            </div>
          );
        })}
      </div>

      {/* ---- map ---- */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: AISLES.length + 1}, (_, r) =>
          [[2, 23], [27, 48]].map(([a, b]) => (
            <rect key={`${r}-${a}`} x={px(a)} y={py(r - 0.5) - 17} width={(b - a) * PXM} height={34} rx={6} fill="#1a2440" stroke="#26365c" />
          )),
        )}
        {AISLES.map((a, k) => (
          <text key={a} x={px(LEN) + 22} y={py(k) + 8} fontSize={22} fontWeight={800} fill={colors.muted}>
            {a}
          </text>
        ))}
        {[[0, 'FRONT'], [25, 'CROSS AISLE'], [LEN, 'BACK']].map(([m, s]) => (
          <text key={s as string} x={px(m as number)} y={py(AISLES.length - 0.5) - 30} textAnchor="middle" fontSize={16} fontWeight={700} fill={colors.amber}>
            {s}
          </text>
        ))}
        <rect x={DOOR[0] - 66} y={DOOR[1] - 24} width={66} height={48} rx={7} fill={colors.amber} />
        <text x={DOOR[0] - 33} y={DOOR[1] + 6} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0b1222">
          DOOR
        </text>

        {/* cages: link the stops that share a cage */}
        {CAGES.map((g, c) => {
          const pts = routePts(g).slice(1, -1);
          const L = plen(pts);
          const d = cageP(c);
          return (
            <path key={c} d={toD(pts)} fill="none" stroke={CAGE_COL[c]} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round"
              opacity={0.45 * (1 - fade(T.pairs + 0.5, T.pairs + 1.2) * 0.8)} strokeDasharray={`${L * d} ${L + 10}`} />
          );
        })}
        {/* trips drawn as static routes once picked */}
        {TRIPS.map((tr, k) => {
          const pts = routePts(tr.order);
          const L = plen(pts);
          const d = interpolate(t, [pickAt(k) + 0.2, pickAt(k) + 1.3], [0, 1], ease);
          return d > 0 ? (
            <path key={k} d={toD(pts)} fill="none" stroke={TRIP_COL[k]} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}
              strokeDasharray={`${L * d} ${L + 10}`} style={{filter: `drop-shadow(0 0 6px ${TRIP_COL[k]}99)`}} transform={`translate(${(k - 1) * 5} ${(k - 1) * 5})`} />
          ) : null;
        })}
        {/* items */}
        {LINES.map((l, i) => {
          const [a, m] = l.bin;
          const s = spring({frame: frame - (T.list + i * 0.35) * fps, fps, config: {damping: 14}});
          const cv = conv(i);
          const full = F[i] >= 1;
          const c = CAGES.findIndex((g) => g.includes(i));
          const tk = tripOf(i);
          const fillCol = tk >= 0 ? TRIP_COL[tk] : colors.amber;
          const edge = !full && c >= 0 && t >= T.cage + 0.5 + c * 1.4 && tk < 0 ? CAGE_COL[c] : full ? '#0b1222' : colors.muted;
          return (
            <g key={i} transform={`translate(${px(m)} ${py(a)}) scale(${s})`}>
              <rect x={-22} y={-22} width={44} height={44} rx={8} fill={full && cv > 0.5 ? fillCol : '#0e1628'} stroke={cv > 0.5 ? edge : colors.amber}
                strokeWidth={3.5} strokeDasharray={!full && cv > 0.5 ? '6 4' : undefined} />
              {!full ? <rect x={-18} y={18 - 36 * F[i] * cv} width={36} height={36 * F[i] * cv} rx={3} fill={fillCol} /> : null}
              <text y={full && cv > 0.5 ? 8 : 3} textAnchor="middle" fontSize={21} fontWeight={800} fill={full && cv > 0.5 ? '#0b1222' : '#fff'} stroke={full && cv > 0.5 ? 'none' : '#0b1222'}
                strokeWidth={4} style={{paintOrder: 'stroke'}}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {/* trip labels on the map */}
      <div style={{position: 'absolute', left: 1040, top: 160, display: 'flex', gap: 14}}>
        {TRIPS.map((tr, k) => (
          <div key={k} style={{opacity: fade(pickAt(k) + 0.6, pickAt(k) + 0.9), border: `2px solid ${TRIP_COL[k]}`, color: TRIP_COL[k], borderRadius: 10, padding: '4px 12px',
            fontSize: 19, fontWeight: 800, whiteSpace: 'nowrap'}}>
            Trip {k + 1} · {tr.len} m
          </div>
        ))}
      </div>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: capIn, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 32, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 21, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 5 ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res, background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(7px)'}} />
          <div style={{position: 'absolute', left: 960, top: 490, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res,
            background: '#0e1628', border: '2px solid #ffffff2e', borderRadius: 28, padding: '30px 50px 26px', boxShadow: '0 30px 90px #000'}}>
            <div style={{textAlign: 'center', fontSize: 30, fontWeight: 800}}>Same TO · {TRIPS.length} trips each · every pallet full</div>
            <div style={{textAlign: 'center', fontSize: 20, color: colors.muted, marginBottom: 20}}>Cùng phiếu · mỗi cách {TRIPS.length} chuyến · pallet nào cũng đầy</div>
            <div style={{display: 'flex', gap: 50}}>
              {[
                {title: 'Today · by print order', vi: 'Hiện tại · theo thứ tự in', col: colors.red, rows: TODAY.map((x) => [x.loads.map(loadName).join(' + '), x.len] as const), total: TODAY_TOTAL},
                {title: 'Algorithm · by metres saved', vi: 'Thuật toán · theo mét tiết kiệm', col: colors.green, rows: TRIPS.map((x) => [x.units.map((u) => UNITS[u].name).join(' + '), x.len] as const), total: ALG_TOTAL},
              ].map((c) => (
                <div key={c.title} style={{width: 470}}>
                  <div style={{fontSize: 22, fontWeight: 800, color: c.col}}>{c.title}</div>
                  <div style={{fontSize: 17, color: colors.muted, marginBottom: 8}}>{c.vi}</div>
                  {c.rows.map(([name, len], k) => (
                    <div key={k} style={{display: 'flex', justifyContent: 'space-between', fontSize: 21, height: 36, borderTop: '1px solid #ffffff14', alignItems: 'center'}}>
                      <span>Trip {k + 1}: {name}</span>
                      <span style={{color: c.col, fontWeight: 800}}>{len} m</span>
                    </div>
                  ))}
                  <div style={{fontSize: 48, fontWeight: 800, color: c.col, marginTop: 8}}>{c.total} m</div>
                </div>
              ))}
            </div>
            <div style={{textAlign: 'center', fontSize: 18, color: colors.muted, marginTop: 10}}>Illustrative layout · Sơ đồ minh họa</div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
