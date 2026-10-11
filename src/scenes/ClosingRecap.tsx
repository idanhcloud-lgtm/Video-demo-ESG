import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {MapBase} from '../components/MapBase';
import {routePixels} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {MAP, laneYpx, project, vtX} from '../layout';
import {aisleOrder, stopPoint} from '../map/route';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

/**
 * Closing recap (voice V4): the whole warehouse on the left, the 4 limitations listed on the right one by one
 * (each marked on the map), then the optimized route draws and the benefits come in.
 * Beats in 30-per-second units: i1..i4 = each limitation read, fix = algorithm sentence, b1..b3 = benefits.
 */
const T0 = {intro: 0, i1: 134, i2: 256, i3: 366, i4: 473, fix: 580, b1: 739, b2: 775, b3: 809, end: 947};
export type ClosingRecapBeats = Partial<typeof T0>;
export const CLOSING_RECAP_DURATION = toFrames(T0.end);

type Pt = [number, number];
const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const CUR = routePixels(aisleOrder(TO28), TO28_DOOR).pts as Pt[];
const ALG = routePixels(TO28_OPTIMIZED, TO28_DOOR).pts as Pt[];
const ALG_LEN = plen(ALG);

// Map placement on screen.
const K = 1.13;
const MX = 40;
const MY = 196;

const ITEMS = [
  {vi: 'Điểm gần nhau không hạ liên tiếp', en: 'Nearby stops not handled in sequence'},
  {vi: 'Lối ngang chưa được sử dụng tối ưu', en: 'Cross aisles not used optimally'},
  {vi: 'Hàng rải rác, xe chạy thừa', en: 'Scattered stops, extra travel'},
  {vi: 'Ùn tắc dãy A, B buổi sáng', en: 'Morning congestion in aisles A, B'},
];
// Where each limitation sits on the map (map pixels).
const SPOTS: {x: number; y: number; rx: number; ry: number}[] = [
  {x: vtX(86), y: laneYpx(13.5), rx: 150, ry: 78},
  {x: vtX(41), y: laneYpx(3.5), rx: 270, ry: 44},
  {x: vtX(52), y: laneYpx(9.5), rx: 0, ry: 0},
  {x: vtX(27), y: laneYpx(1.5), rx: 230, ry: 34},
];
const BENEFITS = [
  {vi: 'Quãng đường ngắn hơn', en: 'Shorter travel'},
  {vi: 'Ít ùn tắc hơn', en: 'Less congestion'},
  {vi: 'Tiết kiệm điện năng', en: 'Energy saved'},
];

export const ClosingRecap: React.FC<{beats?: ClosingRecapBeats}> = ({beats}) => {
  const T = {...T0, ...beats};
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  const at = [T.i1, T.i2, T.i3, T.i4];

  const intro = spring({frame: frame - T.intro, fps, config: {damping: 200}});
  const fixed = (i: number) => interpolate(frame, [T.fix + 20 + i * 10, T.fix + 32 + i * 10], [0, 1], clamp);
  const draw = interpolate(frame, [T.fix, T.fix + 110], [0, 1], ease);
  const redFade = interpolate(frame, [T.fix, T.fix + 30], [1, 0], clamp);
  const pulse = 0.6 + 0.4 * Math.sin(frame / 5);
  const scatter = frame >= T.i3 ? interpolate(frame, [T.i3, T.i3 + 10, T.i4 - 10, T.i4], [0, 1, 1, 0], clamp) : 0;
  const head = interpolate(frame, [T.fix, T.fix + 25], [0, 1], clamp);

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 0, right: 0, top: 46, textAlign: 'center', opacity: intro}}>
        <div style={{fontSize: 52, fontWeight: 800, letterSpacing: 1}}>
          <span style={{opacity: 1 - head, position: head > 0.5 ? 'absolute' : 'relative', left: 0, right: 0}}>Nhìn lại 4 hạn chế</span>
          <span style={{opacity: head, color: colors.green, position: head > 0.5 ? 'relative' : 'absolute', left: 0, right: 0}}>Sắp xếp lại thứ tự hạ hàng</span>
        </div>
        <div style={{fontSize: 26, color: colors.muted, marginTop: 4}}>{head > 0.5 ? 'Re-sequencing the put-away stops' : 'Looking back at the 4 limitations'}</div>
      </div>

      {/* map */}
      <div
        style={{
          position: 'absolute',
          left: MX,
          top: MY,
          width: MAP.w * K,
          height: MAP.h * K,
          borderRadius: 18,
          overflow: 'hidden',
          border: `2px solid ${colors.line}`,
          opacity: intro,
        }}
      >
        <svg width={MAP.w * K} height={MAP.h * K} viewBox={`0 0 ${MAP.w} ${MAP.h}`} style={{display: 'block'}}>
          <MapBase startDoor={TO28_DOOR} />
          <path d={toPath(CUR)} fill="none" stroke={colors.red} strokeWidth={3} strokeOpacity={0.35 * redFade} strokeLinejoin="round" />
          <path
            d={toPath(ALG)}
            fill="none"
            stroke={colors.green}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={`${ALG_LEN * draw} ${ALG_LEN + 10}`}
          />
          {TO28.map((s, i) => {
            const [x, y] = project(...stopPoint(s));
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={7} fill={colors.yellow} stroke="#0b1222" strokeWidth={2} />
                <circle cx={x} cy={y} r={18} fill="none" stroke={colors.red} strokeWidth={3} opacity={scatter * pulse} />
              </g>
            );
          })}
          {SPOTS.map((sp, i) => {
            const p = spring({frame: frame - at[i], fps, config: {damping: 200}});
            if (frame < at[i]) return null;
            const g = fixed(i);
            const c = g > 0.5 ? colors.green : colors.red;
            return (
              <g key={i} opacity={p}>
                {sp.rx > 0 ? (
                  <ellipse cx={sp.x} cy={sp.y} rx={sp.rx} ry={sp.ry} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={3} strokeDasharray="10 7" opacity={g > 0.5 ? 0.7 : pulse} />
                ) : null}
                <g transform={`translate(${sp.x} ${sp.y}) scale(${0.6 + 0.4 * p})`}>
                  <circle r={24} fill={c} stroke="#ffffff" strokeWidth={3} />
                  <text y={8} textAnchor="middle" fontSize={g > 0.5 ? 24 : 20} fontWeight={800} fill={g > 0.5 ? '#062016' : '#ffffff'}>
                    {g > 0.5 ? '✓' : `0${i + 1}`}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* list of limitations */}
      <div style={{position: 'absolute', left: 1100, top: MY, width: 780}}>
        {ITEMS.map((it, i) => {
          const p = spring({frame: frame - at[i], fps, config: {damping: 200}});
          const g = fixed(i);
          const c = g > 0.5 ? colors.green : colors.red;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                height: 96,
                marginBottom: 14,
                padding: '0 24px',
                borderRadius: 16,
                background: colors.panel,
                border: `3px solid ${c}`,
                boxShadow: frame >= at[i] && frame < (at[i + 1] ?? T.fix) ? `0 0 30px ${c}88` : 'none',
                opacity: p,
                transform: `translateX(${(1 - p) * 40}px)`,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  flex: 'none',
                  background: c,
                  color: g > 0.5 ? '#062016' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: g > 0.5 ? 32 : 24,
                  fontWeight: 800,
                }}
              >
                {g > 0.5 ? '✓' : `0${i + 1}`}
              </div>
              <div>
                <div style={{fontSize: 30, fontWeight: 700, lineHeight: 1.2}}>{it.vi}</div>
                <div style={{fontSize: 21, color: colors.muted}}>{it.en}</div>
              </div>
            </div>
          );
        })}
        {/* benefits */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26}}>
          {BENEFITS.map((b, i) => {
            const p = spring({frame: frame - [T.b1, T.b2, T.b3][i], fps, config: {damping: 14}});
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 16,
                  padding: '10px 24px',
                  borderRadius: 40,
                  background: colors.green,
                  color: '#062016',
                  opacity: Math.min(1, p),
                  transform: `scale(${0.8 + 0.2 * p})`,
                  transformOrigin: 'left center',
                  width: 'fit-content',
                }}
              >
                <span style={{fontSize: 30, fontWeight: 800}}>{b.vi}</span>
                <span style={{fontSize: 21, fontWeight: 600}}>{b.en}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
