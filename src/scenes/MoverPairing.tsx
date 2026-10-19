import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~21 s explainer without voice: pallet mover (2 pallets per trip), current practice vs the algorithm.
 * Current: the TO is printed by aisle, two consecutive pallets on the TO make one trip.
 * Algorithm (planMover in the routing app): saving(a, b) = alone(a) + alone(b) − together(a, b), best pairs first;
 * stops inside a trip in nearest-neighbour order from the door.
 * Toy warehouse: 4 aisles of 50 m, 10 m apart, cross aisles at the front (door side) and the back.
 */
type Bin = [number, number]; // [aisle, metres from the front]
const AISLES = ['A', 'B', 'C', 'D'];
// printed order = by aisle, front → back
const BINS: Bin[] = [[0, 6], [0, 45], [1, 8], [1, 42], [2, 5], [2, 44], [3, 9], [3, 47]];
const N = BINS.length;
const PITCH = 10;
const LEN = 50;
const DOOR_BIN: Bin = [0, 0];
const dist = (a: Bin, b: Bin) => (a[0] === b[0] ? Math.abs(a[1] - b[1]) : Math.abs(a[0] - b[0]) * PITCH + Math.min(a[1] + b[1], 2 * LEN - a[1] - b[1]));

function trip(stops: number[]): {len: number; order: number[]} {
  let cur = DOOR_BIN;
  const rest = [...stops];
  const order: number[] = [];
  let len = 0;
  while (rest.length) {
    rest.sort((p, q) => dist(cur, BINS[p]) - dist(cur, BINS[q]));
    const n = rest.shift()!;
    len += dist(cur, BINS[n]);
    cur = BINS[n];
    order.push(n);
  }
  return {len: len + dist(cur, DOOR_BIN), order};
}

type Trip = {pal: number[]; len: number; order: number[]; save?: number};
// current practice: consecutive pallets on the printed TO
const CUR: Trip[] = Array.from({length: N / 2}, (_, k) => ({pal: [2 * k, 2 * k + 1], ...trip([2 * k, 2 * k + 1])}));
// algorithm: greedy matching on savings
const ALG: Trip[] = [];
{
  const alone = BINS.map((_, i) => trip([i]).len);
  const pairs: {i: number; j: number; s: number}[] = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push({i, j, s: alone[i] + alone[j] - trip([i, j]).len});
  pairs.sort((p, q) => q.s - p.s);
  const used = new Set<number>();
  for (const p of pairs) {
    if (used.has(p.i) || used.has(p.j)) continue;
    used.add(p.i);
    used.add(p.j);
    ALG.push({pal: [p.i, p.j], ...trip([p.i, p.j]), save: p.s});
  }
}
const CUR_TOTAL = CUR.reduce((t, x) => t + x.len, 0);
const ALG_TOTAL = ALG.reduce((t, x) => t + x.len, 0);
const SAVE = Math.round((100 * (CUR_TOTAL - ALG_TOTAL)) / CUR_TOTAL);
const DEEP = (tr: Trip) => tr.pal.some((i) => BINS[i][1] > LEN / 2);
const CUR_DEEP = CUR.filter(DEEP).length;
const ALG_DEEP = ALG.filter(DEEP).length;

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
  const c = a[1] + b[1] <= 2 * LEN - a[1] - b[1] ? 0 : LEN;
  return [[px(a[1]), py(a[0])], [px(c), py(a[0])], [px(c), py(b[0])], [px(b[1]), py(b[0])]];
}
function tripPts(tr: Trip): Pt[] {
  const stops = [DOOR_BIN, ...tr.order.map((i) => BINS[i]), DOOR_BIN];
  const pts: Pt[] = [DOOR];
  for (let k = 1; k < stops.length; k++) pts.push(...legPath(stops[k - 1], stops[k]));
  pts.push(DOOR);
  return pts;
}
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);

const Route: React.FC<{tr: Trip; color: string; draw: number; opacity: number; off: number}> = ({tr, color, draw, opacity, off}) => {
  const pts = tripPts(tr).map(([x, y]) => [x + off, y + off] as Pt);
  const L = plen(pts);
  return draw > 0 ? (
    <path d={toD(pts)} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={opacity}
      strokeDasharray={`${L * draw} ${L + 10}`} style={{filter: `drop-shadow(0 0 7px ${color}aa)`}} />
  ) : null;
};

// ---- timeline (seconds) ----
const T = {pal: 1.0, cur: 3.4, curStep: 1.15, deep: 8.4, alg: 10.2, algStep: 1.25, result: 16.0};
export const MOVER_PAIRING_SECONDS = 21;
const OFFS = [-9, -3, 3, 9];

const Row: React.FC<{tr: Trip; p: number; col: string; save?: boolean}> = ({tr, p, col, save}) => (
  <div style={{display: 'flex', alignItems: 'baseline', gap: 14, height: 44, opacity: p}}>
    <div style={{fontSize: 27, fontWeight: 800, width: 120}}>{tr.pal.map((i) => i + 1).join(' + ')}</div>
    <div style={{fontSize: 27, fontWeight: 800, color: col, width: 110}}>{tr.len} m</div>
    <div style={{fontSize: 19, color: colors.muted}}>{save ? (tr.save ? `tiết kiệm ${tr.save} m` : 'cặp còn lại') : DEEP(tr) ? 'vào sâu' : ''}</div>
  </div>
);

export const MoverPairing: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const titleP = spring({frame, fps, config: {damping: 200}});
  const mapIn = interpolate(t, [0.2, 0.9], [0, 1], clamp);
  const curDraw = (k: number) => interpolate(t, [T.cur + k * T.curStep, T.cur + k * T.curStep + 0.85], [0, 1], ease);
  const algDraw = (k: number) => interpolate(t, [T.alg + k * T.algStep, T.alg + k * T.algStep + 0.9], [0, 1], ease);
  // the trip being drawn is bright, finished ones dim; in the "deep" beat all current trips come back
  const curOp = (k: number) => {
    if (t >= T.alg - 0.3) return interpolate(t, [T.alg - 0.3, T.alg], [0.9, 0], clamp);
    if (t >= T.deep) return 0.9;
    const end = T.cur + (k + 1) * T.curStep;
    return k === CUR.length - 1 ? 1 : interpolate(t, [end - 0.1, end + 0.2], [1, 0.22], clamp);
  };
  const algOp = (k: number) => {
    if (t >= T.result - 0.3) return 0.9;
    const end = T.alg + (k + 1) * T.algStep;
    return k === ALG.length - 1 ? 1 : interpolate(t, [end - 0.1, end + 0.2], [1, 0.3], clamp);
  };

  const stage = t < T.cur ? 1 : t < T.deep ? 2 : t < T.alg ? 3 : t < T.result ? 4 : 5;
  const captions: Record<number, [string, string]> = {
    1: ['Phiếu TO in theo dãy A → D · số trên pallet = thứ tự in', 'The TO is printed by aisle A → D · number = print order'],
    2: ['Hiện tại: 2 pallet liền nhau trên phiếu = 1 chuyến', 'Today: two consecutive pallets on the TO = one trip'],
    3: [`Chuyến nào cũng phải chạy vào tận cuối dãy (${CUR_DEEP}/${CUR.length} chuyến)`, `Every trip drives to the far end of an aisle (${CUR_DEEP}/${CUR.length})`],
    4: ['Thuật toán: ghép 2 pallet đi chung tiết kiệm nhiều mét nhất trước', 'Algorithm: pair the pallets that save the most metres first'],
    5: ['Pallet gần nhau đi chung chuyến, kể cả khác dãy', 'Pallets close together share a trip, even across aisles'],
  };
  const capStart = [0, 0, T.cur, T.deep, T.alg, T.result][stage];
  const capIn = interpolate(t, [capStart, capStart + 0.35], [0, 1], clamp);
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const deepFlash = t >= T.deep && t < T.alg - 0.2 ? 0.6 + 0.4 * Math.sin((t - T.deep) * 8) : 0;

  const curRows = CUR.map((_, k) => interpolate(t, [T.cur + k * T.curStep + 0.6, T.cur + k * T.curStep + 0.9], [0, 1], clamp));
  const algRows = ALG.map((_, k) => interpolate(t, [T.alg + k * T.algStep + 0.6, T.alg + k * T.algStep + 0.9], [0, 1], clamp));
  const curSum = Math.round(CUR.reduce((s, x, k) => s + x.len * curRows[k], 0));
  const algSum = Math.round(ALG.reduce((s, x, k) => s + x.len * algRows[k], 0));

  // pallet colour by trip
  const palCol = (i: number) => {
    if (t >= T.alg) return algDraw(ALG.findIndex((x) => x.pal.includes(i))) > 0 ? colors.green : colors.amber;
    return curDraw(CUR.findIndex((x) => x.pal.includes(i))) > 0 ? colors.red : colors.amber;
  };

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 80, top: 46, opacity: titleP}}>
        <div style={{fontSize: 54, fontWeight: 800}}>
          Xe mover <span style={{color: colors.green}}>· 2 pallet mỗi chuyến</span>
        </div>
        <div style={{fontSize: 24, color: colors.muted}}>Lấy theo dãy so với ghép chuyến bằng thuật toán · By aisle vs algorithm pairing</div>
      </div>

      {/* map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        {Array.from({length: AISLES.length + 1}, (_, r) => (
          <rect key={r} x={px(2)} y={py(r - 0.5) - 20} width={(LEN - 4) * PXM} height={40} rx={6} fill="#1a2440" stroke="#26365c" />
        ))}
        {AISLES.map((a, k) => (
          <text key={a} x={px(LEN) + 26} y={py(k) + 9} fontSize={24} fontWeight={800} fill={colors.muted}>
            Dãy {a}
          </text>
        ))}
        <text x={px(0)} y={py(AISLES.length - 0.5) - 34} textAnchor="middle" fontSize={17} fontWeight={700} fill={colors.amber}>
          ĐẦU DÃY
        </text>
        <text x={px(LEN)} y={py(AISLES.length - 0.5) - 34} textAnchor="middle" fontSize={17} fontWeight={700} fill={colors.amber}>
          CUỐI DÃY
        </text>
        <rect x={DOOR[0] - 72} y={DOOR[1] - 26} width={72} height={52} rx={8} fill={colors.amber} />
        <text x={DOOR[0] - 36} y={DOOR[1] + 7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b1222">
          CỬA
        </text>
        {/* far-end band flashes while showing that every current trip goes deep */}
        <rect x={px(LEN / 2 + 12)} y={py(AISLES.length - 0.5) + 24} width={(LEN / 2 - 10) * PXM} height={py(-0.5) - py(AISLES.length - 0.5) - 48} rx={10}
          fill={colors.red} opacity={deepFlash} fillOpacity={0.14} stroke={colors.red} strokeWidth={3} strokeDasharray="10 8" />

        {CUR.map((tr, k) => (
          <Route key={`c${k}`} tr={tr} color={colors.red} draw={curDraw(k)} opacity={curOp(k)} off={OFFS[k]} />
        ))}
        {ALG.map((tr, k) => (
          <Route key={`a${k}`} tr={tr} color={colors.green} draw={algDraw(k)} opacity={algOp(k)} off={OFFS[k]} />
        ))}

        {BINS.map(([a, m], i) => {
          const s = spring({frame: frame - (T.pal + i * 0.15) * fps, fps, config: {damping: 14}});
          return (
            <g key={i} transform={`translate(${px(m)} ${py(a)}) scale(${s})`}>
              <rect x={-23} y={-23} width={46} height={46} rx={8} fill={palCol(i)} stroke="#0b1222" strokeWidth={3} />
              <text y={9} textAnchor="middle" fontSize={24} fontWeight={800} fill="#0b1222">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* trip panel */}
      <div style={{position: 'absolute', left: 1430, top: 250, width: 440}}>
        <div style={{opacity: interpolate(t, [T.cur - 0.3, T.cur], [0, 1], clamp)}}>
          <div style={{fontSize: 20, letterSpacing: 2, color: colors.red, fontWeight: 800, marginBottom: 6}}>HIỆN TẠI · THEO DÃY</div>
          {CUR.map((tr, k) => (
            <Row key={k} tr={tr} p={curRows[k]} col={colors.red} />
          ))}
          <div style={{fontSize: 24, fontWeight: 800, color: colors.red, marginTop: 4}}>Tổng {curSum} m</div>
        </div>
        <div style={{marginTop: 26, opacity: interpolate(t, [T.alg - 0.3, T.alg], [0, 1], clamp)}}>
          <div style={{fontSize: 20, letterSpacing: 2, color: colors.green, fontWeight: 800, marginBottom: 6}}>THUẬT TOÁN</div>
          {ALG.map((tr, k) => (
            <Row key={k} tr={tr} p={algRows[k]} col={colors.green} save />
          ))}
          <div style={{fontSize: 24, fontWeight: 800, color: colors.green, marginTop: 4}}>Tổng {algSum} m</div>
        </div>
      </div>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: capIn}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 5 ? (
        <div style={{position: 'absolute', left: 790, top: 560, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * res})`, opacity: res,
          background: '#0b1222f2', border: '2px solid #ffffff33', borderRadius: 26, padding: '26px 50px', boxShadow: '0 30px 80px #000c'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 24, color: colors.muted}}>Theo dãy</div>
              <div style={{fontSize: 68, fontWeight: 800, color: colors.red, whiteSpace: 'nowrap'}}>{CUR_TOTAL} m</div>
            </div>
            <div style={{fontSize: 56, color: colors.muted}}>→</div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 24, color: colors.muted}}>Thuật toán</div>
              <div style={{fontSize: 68, fontWeight: 800, color: colors.green, whiteSpace: 'nowrap'}}>{ALG_TOTAL} m</div>
            </div>
            <div style={{background: colors.green, color: '#062016', borderRadius: 40, padding: '10px 26px', fontSize: 42, fontWeight: 800}}>−{SAVE}%</div>
          </div>
          <div style={{textAlign: 'center', fontSize: 26, marginTop: 10}}>
            Chuyến phải vào sâu cuối dãy: <b style={{color: colors.red}}>{CUR_DEEP}</b> → <b style={{color: colors.green}}>{ALG_DEEP}</b>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
