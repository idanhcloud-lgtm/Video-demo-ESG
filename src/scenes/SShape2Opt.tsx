import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~20 s explainer without voice: what S-shape does, then how 2-opt improves it.
 * Simplified warehouse: 6 aisles of 100 m, 12 m apart, crossings at the front (0 m), a cross aisle (50 m) and the back (100 m).
 * The numbers on screen are computed here with the same rules as the routing app (serpentine start, first-improvement 2-opt).
 */
type Bin = [number, number]; // [aisle, metres from the front]
const BINS: Bin[] = [[1, 95], [1, 8], [1, 70], [5, 61], [2, 78], [2, 64], [2, 94], [4, 27], [2, 41], [0, 88]];
const PITCH = 12;
const CROSS = [0, 50, 100];
const N = BINS.length;

const dist = (a: Bin, b: Bin) =>
  a[0] === b[0] ? Math.abs(a[1] - b[1]) : Math.abs(a[0] - b[0]) * PITCH + Math.min(...CROSS.map((c) => Math.abs(a[1] - c) + Math.abs(b[1] - c)));
const fromDoor = (b: Bin) => 8 + dist([0, 0], b);
const length = (s: number[]) => fromDoor(BINS[s[0]]) + s.slice(1).reduce((t, k, i) => t + dist(BINS[s[i]], BINS[k]), 0) + fromDoor(BINS[s[N - 1]]);

// S-shape: aisles in order, even aisles front → back, odd aisles back → front.
const SSHAPE = [...BINS.keys()].sort((p, q) => {
  const [a, x] = BINS[p];
  const [b, y] = BINS[q];
  return a !== b ? a - b : a % 2 === 0 ? x - y : y - x;
});
// 2-opt, first improvement (as the app): keep every reversal that shortens the route, until a full pass finds none.
const STEPS: {order: number[]; len: number; i: number; j: number}[] = [];
let TRIES = 0;
{
  let s = [...SSHAPE];
  let cur = length(s);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < N - 1; i++) {
      for (let j = i + 1; j < N; j++) {
        TRIES++;
        const c = [...s.slice(0, i), ...s.slice(i, j + 1).reverse(), ...s.slice(j + 1)];
        const l = length(c);
        if (l < cur - 1e-6) {
          s = c;
          cur = l;
          improved = true;
          STEPS.push({order: [...s], len: l, i, j});
        }
      }
    }
  }
}
const L0 = length(SSHAPE);
const LF = STEPS.length ? STEPS[STEPS.length - 1].len : L0;
const SAVE = Math.round((100 * (L0 - LF)) / L0);

// ---- drawing ----
const X0 = 300;
const PXM = 13.5;
const Y0 = 860;
const LANE = 108;
const px = (m: number) => X0 + m * PXM;
const py = (lane: number) => Y0 - lane * LANE;
type Pt = [number, number];

function legPath(a: Bin, b: Bin): Pt[] {
  if (a[0] === b[0]) return [[px(a[1]), py(a[0])], [px(b[1]), py(b[0])]];
  const c = CROSS.reduce((best, k) => (Math.abs(a[1] - k) + Math.abs(b[1] - k) < Math.abs(a[1] - best) + Math.abs(b[1] - best) ? k : best), CROSS[0]);
  return [[px(a[1]), py(a[0])], [px(c), py(a[0])], [px(c), py(b[0])], [px(b[1]), py(b[0])]];
}
const DOOR: Pt = [px(-8), py(0)];
function routePts(order: number[]): Pt[] {
  const pts: Pt[] = [DOOR, [px(0), py(0)], ...legPath([0, 0], BINS[order[0]]).slice(1)];
  for (let k = 1; k < order.length; k++) pts.push(...legPath(BINS[order[k - 1]], BINS[order[k]]).slice(1));
  pts.push(...legPath(BINS[order[order.length - 1]], [0, 0]).slice(1), DOOR);
  return pts;
}
function subPts(order: number[], i: number, j: number): Pt[] {
  const pts: Pt[] = [[px(BINS[order[i]][1]), py(BINS[order[i]][0])]];
  for (let k = i + 1; k <= j; k++) pts.push(...legPath(BINS[order[k - 1]], BINS[order[k]]).slice(1));
  return pts;
}
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);

// ---- timeline (seconds) ----
const T = {title: 0, sDraw: 2.2, sDrawEnd: 7.0, opt: 8.4, step: 1.3, done: 0, result: 0, end: 20};
T.done = T.opt + 0.6 + STEPS.length * T.step;
T.result = T.done + 1.6;
export const SSHAPE_2OPT_SECONDS = Math.max(T.end, T.result + 3.5);

const Route: React.FC<{pts: Pt[]; color: string; draw?: number; opacity?: number; w?: number}> = ({pts, color, draw = 1, opacity = 1, w = 7}) => {
  const L = plen(pts);
  return (
    <path d={toD(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" opacity={opacity}
      strokeDasharray={`${L * draw} ${L + 10}`} style={{filter: `drop-shadow(0 0 8px ${color}aa)`}} />
  );
};

export const SShape2Opt: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const mapIn = interpolate(t, [0.3, 1.2], [0, 1], clamp);
  const draw = interpolate(t, [T.sDraw, T.sDrawEnd], [0, 1], ease);

  // which 2-opt step we are in; inside a step: 0–0.45 highlight the reversed part, 0.45–0.85 swap, rest hold
  const k = t < T.opt + 0.6 ? -1 : Math.min(STEPS.length - 1, Math.floor((t - T.opt - 0.6) / T.step));
  const local = k >= 0 ? t - T.opt - 0.6 - k * T.step : 0;
  const prevOrder = k <= 0 ? SSHAPE : STEPS[k - 1].order;
  const prevLen = k <= 0 ? L0 : STEPS[k - 1].len;
  const swap = k >= 0 ? interpolate(local, [0.45, 0.85], [0, 1], ease) : 0;
  const order = k >= 0 && swap >= 1 ? STEPS[k].order : prevOrder;

  // meter
  const reached = Math.round(interpolate(t, [T.sDraw, T.sDrawEnd], [0, L0], ease));
  const meter = k < 0 ? reached : Math.round(prevLen + (STEPS[k].len - prevLen) * swap);
  const done = t >= T.done;
  const routeColor = done ? colors.green : colors.yellow;

  const stage = t < T.opt ? 1 : t < T.done ? 2 : t < T.result ? 3 : 4;
  const captions: Record<number, [string, string]> = {
    1: ['① S-shape: đi chữ S qua các lối có hàng → có ngay lộ trình ban đầu', 'S-shape: snake through the aisles → an instant first route'],
    2: ['② 2-opt: đảo ngược một đoạn → ngắn hơn thì giữ, dài hơn thì bỏ', '2-opt: reverse one stretch → keep it if shorter'],
    3: ['Không còn cách đảo nào ngắn hơn → chọn lộ trình này', 'No reversal helps any more → this is the route'],
    4: ['S-shape cho điểm xuất phát, 2-opt sửa các đoạn đi vòng', 'S-shape gives the start, 2-opt fixes the detours'],
  };
  const capIn = interpolate(t, [[0, 0, T.opt, T.done, T.result][stage], [0, 0, T.opt, T.done, T.result][stage] + 0.35], [0, 1], clamp);
  const titleP = spring({frame, fps, config: {damping: 200}});
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});

  const visitNo = (o: number[]) => Object.fromEntries(o.map((b, idx) => [b, idx + 1]));
  const nums = visitNo(order);
  const shownBins = t < T.sDraw ? 0 : Math.ceil(interpolate(t, [T.sDraw, T.sDrawEnd], [0, N], clamp));

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      {/* title */}
      <div style={{position: 'absolute', left: 80, top: 46, opacity: titleP}}>
        <div style={{fontSize: 54, fontWeight: 800}}>
          S-shape <span style={{color: colors.green}}>+ 2-opt</span>
        </div>
        <div style={{fontSize: 24, color: colors.muted}}>Thuật toán sắp xếp lộ trình · How the route is sequenced</div>
        <div style={{fontSize: 18, color: colors.muted, marginTop: 6, opacity: 0.85}}>Sơ đồ minh họa: hàng ở kệ trái hay kệ phải đều hạ từ cùng một lối đi · Left or right rack, both served from the same aisle</div>
      </div>
      {/* meter */}
      <div style={{position: 'absolute', right: 80, top: 40, textAlign: 'right', opacity: t > T.sDraw - 0.3 ? 1 : 0}}>
        <div style={{fontSize: 20, color: colors.muted, letterSpacing: 2}}>QUÃNG ĐƯỜNG · DISTANCE</div>
        <div style={{fontSize: 86, fontWeight: 800, lineHeight: 1, color: done ? colors.green : colors.yellow}}>
          {meter}
          <span style={{fontSize: 34, color: colors.muted, marginLeft: 8}}>m</span>
        </div>
        {k >= 0 && !done ? (
          <div style={{fontSize: 30, fontWeight: 800, color: colors.green, opacity: interpolate(local, [0.6, 0.8, T.step - 0.1, T.step], [0, 1, 1, 0], clamp)}}>
            −{Math.round(prevLen - STEPS[k].len)} m ✓
          </div>
        ) : null}
      </div>

      {/* map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        {/* racks between aisles */}
        {Array.from({length: 7}, (_, r) => r).map((r) => {
          const y = py(r - 0.5);
          return [[2, 48], [52, 98]].map(([a, b]) => (
            <rect key={`${r}-${a}`} x={px(a)} y={y - 22} width={(b - a) * PXM} height={44} rx={6} fill="#1a2440" stroke="#26365c" />
          ));
        })}
        {[0, 50, 100].map((c) => (
          <text key={c} x={px(c)} y={py(5.5) - 34} textAnchor="middle" fontSize={18} fontWeight={700} fill={colors.amber}>
            {c === 50 ? 'LỐI NGANG' : c === 0 ? 'ĐẦU DÃY' : 'CUỐI DÃY'}
          </text>
        ))}
        {/* door */}
        <rect x={DOOR[0] - 70} y={DOOR[1] - 26} width={70} height={52} rx={8} fill={colors.amber} />
        <text x={DOOR[0] - 35} y={DOOR[1] + 7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b1222">
          CỬA
        </text>

        {/* S-shape route (drawn), then the current route during 2-opt */}
        {k < 0 ? <Route pts={routePts(SSHAPE)} color={colors.yellow} draw={draw} /> : null}
        {k >= 0 ? (
          <>
            <Route pts={routePts(prevOrder)} color={routeColor} opacity={1 - swap} />
            <Route pts={routePts(STEPS[k].order)} color={routeColor} opacity={swap} />
            {!done ? (
              <Route
                pts={subPts(swap < 0.5 ? prevOrder : STEPS[k].order, STEPS[k].i, STEPS[k].j)}
                color={colors.red}
                w={12}
                opacity={interpolate(local, [0, 0.15, 0.85, 1.05], [0, 0.9, 0.9, 0], clamp)}
              />
            ) : null}
          </>
        ) : null}

        {/* bins */}
        {BINS.map(([lane, m], b) => {
          const vis = t < T.sDraw ? 1 : 1;
          const numbered = k >= 0 || SSHAPE.indexOf(b) < shownBins;
          const inSeg = k >= 0 && !done && STEPS[k].order.slice(STEPS[k].i, STEPS[k].j + 1).includes(b) && local < 1.05;
          return (
            <g key={b} opacity={vis}>
              <circle cx={px(m)} cy={py(lane)} r={22} fill={numbered ? (inSeg ? colors.red : routeColor) : '#8f9bb5'} stroke="#0b1222" strokeWidth={4} />
              {numbered ? (
                <text x={px(m)} y={py(lane) + 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0b1222">
                  {nums[b]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center', opacity: capIn}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: '12px 30px'}}>
          <div style={{fontSize: 36, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 24, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 4 ? (
        <div style={{position: 'absolute', left: 960, top: 470, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * res})`, opacity: res,
          background: '#0b1222f2', border: '2px solid #ffffff33', borderRadius: 26, padding: '30px 60px', display: 'flex', alignItems: 'center', gap: 50, boxShadow: '0 30px 80px #000c'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 24, color: colors.muted}}>S-shape</div>
            <div style={{fontSize: 72, fontWeight: 800, color: colors.yellow, whiteSpace: 'nowrap'}}>{L0} m</div>
          </div>
          <div style={{fontSize: 60, color: colors.muted}}>→</div>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 24, color: colors.muted}}>S-shape + 2-opt</div>
            <div style={{fontSize: 72, fontWeight: 800, color: colors.green, whiteSpace: 'nowrap'}}>{LF} m</div>
          </div>
          <div style={{background: colors.green, color: '#062016', borderRadius: 40, padding: '12px 28px', fontSize: 44, fontWeight: 800}}>−{SAVE}%</div>
        </div>
      ) : null}
      <div style={{position: 'absolute', right: 80, top: 150, fontSize: 18, color: colors.muted, opacity: done ? 1 : 0}}>
        đã thử {TRIES} cách đảo · {TRIES} reversals tried
      </div>
    </AbsoluteFill>
  );
};
