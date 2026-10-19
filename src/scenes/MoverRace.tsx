import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~30 s split-screen race without voice: pallet mover, today (by aisle) vs the algorithm, trip by trip.
 * Both sides fill every trip (2 pallets: full pallets, or loose items sharing a cage pallet) and make the same number of trips;
 * only the grouping differs.
 * Today: walk the TO in print order (aisle by aisle, each aisle from the nearer end), take what fits, skip what does not
 * (it waits for the next trip), go back when both slots are used and the cage cannot take more.
 * Algorithm (planMover in the routing app): loose items packed next-fit in serpentine order onto cages; full pallets and
 * cages paired by savings; nearest-neighbour stop order inside a trip.
 * Toy warehouse: 4 aisles of 50 m, 10 m apart, crossings at the front (door side), a cross aisle (25 m) and the back.
 */
type Bin = [number, number]; // [aisle, metres from the front]
type Item = {bin: Bin; f: number}; // f = share of a pallet (1 = full pallet)
const AISLES = ['A', 'B', 'C', 'D'];
const RAW: Item[] = [
  {bin: [0, 6], f: 1}, {bin: [0, 44], f: 0.5}, {bin: [1, 8], f: 0.5}, {bin: [1, 42], f: 1},
  {bin: [2, 6], f: 0.5}, {bin: [2, 45], f: 0.5}, {bin: [3, 9], f: 1}, {bin: [3, 44], f: 1},
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
const pathLen = (order: number[]) => {
  let t = 0;
  let cur = DOOR_BIN;
  for (const i of order) {
    t += dist(cur, ITEMS[i].bin);
    cur = ITEMS[i].bin;
  }
  return t + dist(cur, DOOR_BIN);
};
type Trip = {order: number[]; len: number; loads: number[][]};

// today: walk the TO in print order, take what fits
const CUR: Trip[] = [];
{
  let left = ITEMS.map((_, i) => i);
  while (left.length) {
    const loads: number[][] = [];
    const fill: number[] = [];
    const order: number[] = [];
    const rest: number[] = [];
    for (const i of left) {
      const f = ITEMS[i].f;
      const open = f < 1 ? fill.findIndex((x) => x < 1 && x + f <= 1 + 1e-6) : -1;
      if (open >= 0) {
        fill[open] += f;
        loads[open].push(i);
        order.push(i);
      } else if (fill.length < 2) {
        fill.push(f);
        loads.push([i]);
        order.push(i);
      } else rest.push(i);
    }
    CUR.push({order, len: pathLen(order), loads});
    left = rest;
  }
}

// algorithm
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
  const units: number[][] = ITEMS.map((_, i) => i).filter((i) => ITEMS[i].f >= 1).map((i) => [i]);
  const serp = (i: number) => ITEMS[i].bin[0] * 1e3 + (ITEMS[i].bin[0] % 2 === 0 ? ITEMS[i].bin[1] : 999 - ITEMS[i].bin[1]);
  let cage: number[] = [];
  let fill = 0;
  for (const i of ITEMS.map((_, k) => k).filter((k) => ITEMS[k].f < 1).sort((p, q) => serp(p) - serp(q))) {
    if (cage.length && fill + ITEMS[i].f <= 1 + 1e-6) {
      cage.push(i);
      fill += ITEMS[i].f;
    } else {
      if (cage.length) units.push(cage);
      cage = [i];
      fill = ITEMS[i].f;
    }
  }
  if (cage.length) units.push(cage);
  const alone = units.map((u) => pathLen(nn(u)));
  const pairs: {i: number; j: number; s: number}[] = [];
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) pairs.push({i, j, s: alone[i] + alone[j] - pathLen(nn([...units[i], ...units[j]]))});
  pairs.sort((p, q) => q.s - p.s);
  const used = new Set<number>();
  for (const p of pairs) {
    if (used.has(p.i) || used.has(p.j)) continue;
    used.add(p.i);
    used.add(p.j);
    const order = nn([...units[p.i], ...units[p.j]]);
    ALG.push({order, len: pathLen(order), loads: [units[p.i], units[p.j]]});
  }
  units.forEach((u, k) => {
    if (!used.has(k)) ALG.push({order: nn(u), len: pathLen(nn(u)), loads: [u]});
  });
}
const CUR_TOTAL = CUR.reduce((t, x) => t + x.len, 0);
const ALG_TOTAL = ALG.reduce((t, x) => t + x.len, 0);
const TRIPS = Math.max(CUR.length, ALG.length);
const loadName = (g: number[]) => (ITEMS[g[0]].f >= 1 ? `pallet ${g[0] + 1}` : `cage ${g.map((i) => i + 1).join('+')}`);
const tripName = (tr: Trip) => tr.loads.map(loadName).join(' & ');

// what the algorithm did on each trip (English first, Vietnamese below)
const EXPLAIN: [string, string][] = [
  ['Trip 1 · Algorithm: pallet 7 rides with cage 5+6, all in aisles C–D', 'Chuyến 1 · Thuật toán: pallet 7 đi chung lồng 5+6, cùng khu dãy C–D'],
  ['Trip 2 · Algorithm: pallet 3 rides with cage 2+4, all in aisles A–B', 'Chuyến 2 · Thuật toán: pallet 3 đi chung lồng 2+4, cùng khu dãy A–B'],
  ['Trip 3 · Algorithm: the two pallets near the door (1 and 8) ride together → short trip', 'Chuyến 3 · Thuật toán: 2 pallet gần cửa (1 và 8) đi chung → chuyến ngắn'],
];

// ---- drawing ----
const PXM = 13.5;
const Y0 = 800;
const LANE = 92;
type Pt = [number, number];
const sideX = (side: number) => (side ? 1000 : 60);
const px = (side: number, m: number) => sideX(side) + 120 + m * PXM;
const py = (a: number) => Y0 - a * LANE;
const seglen = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1]);
function tripPts(side: number, tr: Trip): {pts: Pt[]; L: number} {
  const bins = [DOOR_BIN, ...tr.order.map((i) => ITEMS[i].bin), DOOR_BIN];
  const door: Pt = [px(side, -6), py(0)];
  const P = (b: Bin): Pt => [px(side, b[1]), py(b[0])];
  const pts: Pt[] = [door];
  for (let k = 1; k < bins.length; k++) {
    const [a, b] = [bins[k - 1], bins[k]];
    if (a[0] === b[0]) pts.push(P(a), P(b));
    else {
      const c = via(a, b);
      pts.push(P(a), P([a[0], c]), P([b[0], c]), P(b));
    }
  }
  pts.push(door);
  return {pts, L: pts.slice(1).reduce((t, p, k) => t + seglen(pts[k], p), 0)};
}
const pointAt = (pts: Pt[], f: number): Pt => {
  let rest = pts.slice(1).reduce((t, p, k) => t + seglen(pts[k], p), 0) * f;
  for (let k = 1; k < pts.length; k++) {
    const l = seglen(pts[k - 1], pts[k]);
    if (rest <= l && l > 0) return [pts[k - 1][0] + ((pts[k][0] - pts[k - 1][0]) * rest) / l, pts[k - 1][1] + ((pts[k][1] - pts[k - 1][1]) * rest) / l];
    rest -= l;
  }
  return pts[pts.length - 1];
};
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

// ---- timeline (seconds) ----
const SPEED = 34; // metres per second, same mover speed on both sides
const PAUSE = 1.3;
const T0 = 3.6;
const START: number[] = [];
{
  let at = T0;
  for (let k = 0; k < TRIPS; k++) {
    START.push(at);
    at += Math.max(CUR[k]?.len ?? 0, ALG[k]?.len ?? 0) / SPEED + PAUSE;
  }
  START.push(at);
}
const RESULT = START[TRIPS] + 0.2;
export const MOVER_RACE_SECONDS = Math.ceil(RESULT + 5);
const SIDES = [
  {trips: CUR, color: colors.red, name: 'TODAY · BY AISLE', vi: 'Hiện tại · theo dãy'},
  {trips: ALG, color: colors.green, name: 'ALGORITHM', vi: 'Thuật toán'},
];

export const MoverRace: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  const titleP = spring({frame, fps, config: {damping: 200}});
  const mapIn = interpolate(t, [0.2, 0.9], [0, 1], clamp);
  const k = t < T0 ? -1 : Math.min(TRIPS - 1, START.findIndex((s, i) => t >= s && t < START[i + 1]) === -1 ? TRIPS - 1 : START.findIndex((s, i) => t >= s && t < START[i + 1]));
  // metres driven by a side on trip kk at time t
  const driven = (side: number, kk: number) => {
    const tr = SIDES[side].trips[kk];
    if (!tr) return 0;
    return Math.min(tr.len, Math.max(0, (t - START[kk]) * SPEED));
  };
  const odo = (side: number) => Math.round(SIDES[side].trips.reduce((a, _, kk) => a + driven(side, kk), 0));

  const stage = t < T0 ? 0 : t < RESULT ? 1 : 2;
  const caption: [string, string] =
    stage === 0
      ? ['Same TO, same mover: 2 pallets per trip, every pallet filled', 'Cùng phiếu TO, cùng xe: mỗi chuyến 2 pallet, pallet nào cũng đầy']
      : stage === 1
        ? EXPLAIN[k] ?? EXPLAIN[EXPLAIN.length - 1]
        : ['Same full loads. The algorithm only changes which items share a trip', 'Tải đầy như nhau. Thuật toán chỉ đổi hàng nào đi chung chuyến'];
  const capStart = stage === 0 ? 0.6 : stage === 1 ? START[k] : RESULT;
  const capIn = interpolate(t, [capStart, capStart + 0.35], [0, 1], clamp);
  const res = spring({frame: frame - RESULT * fps, fps, config: {damping: 200}});

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 60, top: 30, opacity: titleP}}>
        <div style={{fontSize: 44, fontWeight: 800}}>
          Pallet mover <span style={{color: colors.muted, fontWeight: 600}}>· today vs algorithm</span>
        </div>
        <div style={{display: 'flex', gap: 28, fontSize: 19, color: colors.muted, marginTop: 6}}>
          <span><span style={{display: 'inline-block', width: 20, height: 20, borderRadius: 5, background: colors.amber, verticalAlign: -4, marginRight: 8}} />Full pallet</span>
          <span><span style={{display: 'inline-block', width: 20, height: 20, borderRadius: 5, border: `3px dashed ${colors.muted}`, verticalAlign: -5, marginRight: 8,
            background: `linear-gradient(to top, ${colors.amber} 50%, transparent 50%)`}} />Loose item (½ pallet) · two share one cage pallet</span>
          <span>Numbers = order on the printed TO</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 958, top: 150, width: 4, height: 730, background: '#ffffff14', borderRadius: 2}} />

      {SIDES.map((S, side) => {
        const done = S.trips.length && driven(side, S.trips.length - 1) >= S.trips[S.trips.length - 1].len - 1e-6 && t > START[S.trips.length - 1];
        return (
          <div key={side} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
            {/* header */}
            <div style={{position: 'absolute', left: sideX(side) + 20, top: 150, width: 860, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
              <div>
                <div style={{fontSize: 26, fontWeight: 800, color: S.color, letterSpacing: 2}}>{S.name}</div>
                <div style={{fontSize: 18, color: colors.muted}}>{S.vi}</div>
              </div>
              <div style={{fontSize: 58, fontWeight: 800, lineHeight: 1, color: S.color}}>
                {odo(side)}
                <span style={{fontSize: 26, color: colors.muted, marginLeft: 6}}>m</span>
              </div>
            </div>
            {/* trip rows */}
            <div style={{position: 'absolute', left: sideX(side) + 20, top: 232, width: 860}}>
              {S.trips.map((tr, kk) => {
                const on = kk === k && stage === 1;
                const shown = t >= START[kk];
                return (
                  <div key={kk} style={{display: 'flex', justifyContent: 'space-between', fontSize: 21, height: 36, alignItems: 'center', padding: '0 12px', borderRadius: 8,
                    opacity: shown ? 1 : 0.25, background: on ? `${S.color}22` : 'transparent', fontWeight: on ? 800 : 600}}>
                    <span>Trip {kk + 1}: {tripName(tr)}</span>
                    <span style={{color: S.color}}>{shown ? `${Math.round(driven(side, kk))} m` : ''}</span>
                  </div>
                );
              })}
            </div>
            <div style={{position: 'absolute', left: sideX(side) + 20, top: 872, width: 860, textAlign: 'center', fontSize: 21, fontWeight: 700, color: S.color}}>
              {side ? 'Groups items that are close together' : 'Takes the next items on the printed list → near and far mixed'}
            </div>
            {done && stage === 1 ? (
              <div style={{position: 'absolute', left: sideX(side) + 450, top: 640, transform: 'translate(-50%, -50%)', fontSize: 40, fontWeight: 800, color: S.color,
                background: '#0b1222e6', border: `3px solid ${S.color}`, borderRadius: 16, padding: '8px 26px'}}>
                DONE · {odo(side)} m
              </div>
            ) : null}
          </div>
        );
      })}

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        {[0, 1].map((side) => (
          <g key={side}>
            {Array.from({length: AISLES.length + 1}, (_, r) =>
              [[2, 23], [27, 48]].map(([a, b]) => (
                <rect key={`${r}-${a}`} x={px(side, a)} y={py(r - 0.5) - 15} width={(b - a) * PXM} height={30} rx={5} fill="#1a2440" stroke="#26365c" />
              )),
            )}
            {AISLES.map((a, kk) => (
              <text key={a} x={px(side, LEN) + 18} y={py(kk) + 7} fontSize={20} fontWeight={800} fill={colors.muted}>
                {a}
              </text>
            ))}
            {[[0, 'FRONT'], [25, 'CROSS AISLE'], [LEN, 'BACK']].map(([m, s]) => (
              <text key={s as string} x={px(side, m as number)} y={py(AISLES.length - 0.5) - 26} textAnchor="middle" fontSize={15} fontWeight={700} fill={colors.amber}>
                {s}
              </text>
            ))}
            <rect x={px(side, -6) - 62} y={py(0) - 22} width={62} height={44} rx={7} fill={colors.amber} />
            <text x={px(side, -6) - 31} y={py(0) + 6} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0b1222">
              DOOR
            </text>
            {/* routes */}
            {SIDES[side].trips.map((tr, kk) => {
              const {pts, L} = tripPts(side, tr);
              const d = (t - START[kk]) * SPEED / tr.len;
              if (d <= 0) return null;
              const cur = kk === k && stage === 1;
              const col = SIDES[side].color;
              const head = pointAt(pts, Math.min(1, d));
              return (
                <g key={kk}>
                  <path d={toD(pts)} fill="none" stroke={col} strokeWidth={cur ? 6 : 4} strokeLinejoin="round" strokeLinecap="round" opacity={cur ? 1 : 0.22}
                    strokeDasharray={`${L * Math.min(1, d)} ${L + 10}`} style={{filter: cur ? `drop-shadow(0 0 6px ${col}aa)` : undefined}} />
                  {cur && d < 1 ? <circle cx={head[0]} cy={head[1]} r={11} fill="#fff" stroke={col} strokeWidth={4} /> : null}
                </g>
              );
            })}
            {/* items */}
            {ITEMS.map((it, i) => {
              const [a, m] = it.bin;
              const s = spring({frame: frame - (0.6 + i * 0.12) * fps, fps, config: {damping: 14}});
              const kk = SIDES[side].trips.findIndex((tr) => tr.order.includes(i));
              const tr = SIDES[side].trips[kk];
              const reached = tr && (t - START[kk]) * SPEED >= pathLen(tr.order.slice(0, tr.order.indexOf(i) + 1)) - dist(ITEMS[tr.order[tr.order.indexOf(i)]].bin, DOOR_BIN);
              const inTrip = kk === k && stage === 1;
              const fillCol = reached ? SIDES[side].color : colors.amber;
              const full = it.f >= 1;
              return (
                <g key={i} transform={`translate(${px(side, m)} ${py(a)}) scale(${s * (inTrip ? 1.12 : 1)})`} opacity={stage === 1 && !inTrip && !reached ? 0.55 : 1}>
                  <rect x={-20} y={-20} width={40} height={40} rx={7} fill={full ? fillCol : '#0e1628'} stroke={full ? '#0b1222' : colors.muted} strokeWidth={3}
                    strokeDasharray={full ? undefined : '5 4'} />
                  {!full ? <rect x={-16} y={16 - 32 * it.f} width={32} height={32 * it.f} rx={3} fill={fillCol} /> : null}
                  <text y={full ? 7 : 3} textAnchor="middle" fontSize={19} fontWeight={800} fill={full ? '#0b1222' : '#fff'} stroke={full ? 'none' : '#0b1222'} strokeWidth={4}
                    style={{paintOrder: 'stroke'}}>
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: capIn, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 32, fontWeight: 700}}>{caption[0]}</div>
          <div style={{fontSize: 21, color: colors.muted}}>{caption[1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 2 ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res, background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(7px)'}} />
          <div style={{position: 'absolute', left: 960, top: 500, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res, textAlign: 'center',
            background: '#0e1628', border: '2px solid #ffffff2e', borderRadius: 28, padding: '32px 64px 28px', boxShadow: '0 30px 90px #000'}}>
            <div style={{fontSize: 30, fontWeight: 800}}>Same TO · {TRIPS} trips each · every pallet full</div>
            <div style={{fontSize: 20, color: colors.muted, marginBottom: 16}}>Cùng phiếu · mỗi cách {TRIPS} chuyến · pallet nào cũng đầy</div>
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
            <div style={{fontSize: 24, fontWeight: 700, marginTop: 14}}>{CUR_TOTAL - ALG_TOTAL} m less, only by grouping nearby items</div>
            <div style={{fontSize: 18, color: colors.muted, marginTop: 12}}>Illustrative layout · Sơ đồ minh họa</div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
