import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {Forklift} from '../components/Forklift';
import {MapBase} from '../components/MapBase';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {Callout, PanelShell, VsBadge} from '../components/RoutePanel';
import {MAP, laneYpx, project, vtX} from '../layout';
import {DOORS} from '../map/khoC';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second), same beats as the other problems.
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  clock: 190,
  drive: 260,
  zoomIn: 470,
  jam: 505,
  callout: 530,
  zoomOut: 690,
  solved: 730,
  end: 820,
};
export const PROBLEM04_DURATION = toFrames(T.end);

type Pt = [number, number];
/**
 * One truck at 9:00. It enters through aisle A (lane 1) or B (lane 2). If `stuckAt` is set it stops there
 * (jam in the middle of the aisle); otherwise it turns at a tunnel (`turnVt`) to `lane`/`vt` and keeps going.
 */
interface Trip {
  door: string;
  entry: 1 | 2;
  stuckAt?: number;
  turnVt?: number;
  lane?: number;
  vt?: number;
}

// Illustration (no measured data). Every TO starts in aisles A, B, so all 9 trucks drive in there.
// Current: 3 trucks get stuck in aisle A and 3 in aisle B (middle of the aisle); only 3 turn at tunnel 1.
const CURRENT: Trip[] = [
  {door: '01', entry: 1, stuckAt: 54},
  {door: '02', entry: 2, stuckAt: 54},
  {door: '03', entry: 1, turnVt: 34, lane: 4, vt: 46},
  {door: '04', entry: 2, stuckAt: 47},
  {door: '05', entry: 1, stuckAt: 47},
  {door: '06', entry: 2, turnVt: 34, lane: 6, vt: 30},
  {door: '07', entry: 1, stuckAt: 40},
  {door: '08', entry: 2, stuckAt: 40},
  {door: '09', entry: 1, turnVt: 34, lane: 8, vt: 50},
];
// Algorithm: the same 9 trucks enter through aisles A, B, then turn at the tunnels and spread over the warehouse.
const ALGO: Trip[] = [
  {door: '01', entry: 1, turnVt: 75, lane: 12, vt: 90},
  {door: '02', entry: 2, turnVt: 34, lane: 5, vt: 52},
  {door: '03', entry: 1, turnVt: 34, lane: 4, vt: 46},
  {door: '04', entry: 2, turnVt: 75, lane: 9, vt: 60},
  {door: '05', entry: 1, turnVt: 34, lane: 10, vt: 20},
  {door: '06', entry: 2, turnVt: 34, lane: 6, vt: 30},
  {door: '07', entry: 1, turnVt: 75, lane: 15, vt: 85},
  {door: '08', entry: 2, turnVt: 34, lane: 13, vt: 48},
  {door: '09', entry: 1, turnVt: 34, lane: 8, vt: 50},
];
const STUCK = CURRENT.filter((t) => t.stuckAt !== undefined).length;

const FRONT_X = vtX(-1.2);
const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pathLen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + len(pts[i], p), 0);
function along(pts: Pt[], d: number): {p: Pt; angle: number} {
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const l = len(pts[i - 1], pts[i]);
    const angle = (Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) * 180) / Math.PI;
    if (left <= l || i === pts.length - 1) {
      const t = l === 0 ? 1 : Math.min(1, left / l);
      return {p: [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t], angle};
    }
    left -= l;
  }
  return {p: pts[pts.length - 1], angle: 0};
}

const tripPath = (t: Trip): Pt[] => {
  const door = DOORS.find((d) => d.id === t.door)!;
  const [, dy] = project(0, door.y);
  const y = laneYpx(t.entry);
  const pts: Pt[] = [
    [MAP.doorX, dy],
    [FRONT_X, dy],
    [FRONT_X, y],
  ];
  if (t.stuckAt !== undefined) {
    pts.push([vtX(t.stuckAt), y]);
  } else {
    pts.push([vtX(t.turnVt!), y], [vtX(t.turnVt!), laneYpx(t.lane!)], [vtX(t.vt!), laneYpx(t.lane!)], [vtX(t.vt! + 18), laneYpx(t.lane!)]);
  }
  return pts;
};

const SPEED = 5.5; // px per timeline unit
const STAGGER = 10;
const tripDistance = (frame: number, i: number, L: number) => Math.max(0, Math.min(L, (frame - T.drive - i * STAGGER) * SPEED));

/** Trucks standing stuck in aisles A, B at this frame. */
const trucksStuck = (trips: Trip[], frame: number) =>
  trips.filter((t, i) => t.stuckAt !== undefined && tripDistance(frame, i, pathLen(tripPath(t))) >= pathLen(tripPath(t)) - 0.5).length;

// Camera on the jam (current route only): lanes 1–4, middle of aisles A, B, below the top callouts.
const ZOOM = {k: 1.9, tx: -1.9 * 200, ty: 580 - 1.9 * 596};

/** Compact two-line label in panel coordinates, placed in an empty part of the map. */
const MapChip: React.FC<{x: number; y: number; title: string; sub: string; accent: string; p: number}> = ({x, y, title, sub, accent, p}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translateY(-50%) scale(${0.85 + 0.15 * p})`,
      transformOrigin: 'left center',
      opacity: p,
      background: '#ffffff',
      border: `3px solid ${accent}`,
      borderRadius: 14,
      padding: '8px 16px',
      boxShadow: '0 8px 24px #0009',
      whiteSpace: 'nowrap',
      zIndex: 2,
    }}
  >
    <div style={{fontSize: 27, fontWeight: 800, lineHeight: 1.15, color: accent === colors.red ? '#d23c3a' : '#0a8f5a'}}>{title}</div>
    <div style={{fontSize: 18, fontWeight: 600, color: '#5b6478'}}>{sub}</div>
  </div>
);

const TrafficMap: React.FC<{kind: 'algo' | 'current'; frame: number; jam: number; zoom: number}> = ({kind, frame, jam, zoom}) => {
  const trips = kind === 'algo' ? ALGO : CURRENT;
  const accent = kind === 'algo' ? colors.green : colors.red;
  const cam = {k: 1 + (ZOOM.k - 1) * zoom, tx: ZOOM.tx * zoom, ty: ZOOM.ty * zoom};
  const pulse = 0.55 + 0.45 * Math.sin(frame / 4);
  return (
    <svg width={MAP.w} height={MAP.h} style={{display: 'block'}}>
      <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.k})`}>
        <MapBase startDoor="" />
        {/* aisles A and B */}
        {[1, 2].map((lane) => (
          <g key={lane}>
            <rect
              x={FRONT_X - 6}
              y={laneYpx(lane) - 11}
              width={vtX(77) - FRONT_X + 6}
              height={22}
              rx={11}
              fill={accent}
              opacity={(kind === 'current' ? 0.26 * pulse : 0.1) * jam}
            />
            <text x={FRONT_X - 9} y={laneYpx(lane) + 6} textAnchor="end" fontSize={17} fontWeight={800} fill={colors.amber}>
              {lane === 1 ? 'A' : 'B'}
            </text>
          </g>
        ))}
        {trips.map((t, i) => {
          const pts = tripPath(t);
          const L = pathLen(pts);
          const d = tripDistance(frame, i, L);
          const {p, angle} = along(pts, d);
          const stuck = t.stuckAt !== undefined && d >= L - 0.5;
          return (
            <g key={i}>
              <path
                d={pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ')}
                fill="none"
                stroke={accent}
                strokeWidth={4}
                strokeOpacity={0.5}
                strokeDasharray={`${d} ${L + 10}`}
              />
              {frame >= T.drive + i * STAGGER ? <Forklift x={p[0]} y={p[1]} angle={angle} light={stuck ? 0.3 : 1} alert={stuck ? jam * pulse : 0} /> : null}
            </g>
          );
        })}
      </g>
      <g opacity={0.9}>
        <rect x={MAP.w - 214} y={MAP.h - 40} width={200} height={28} rx={8} fill="#0b1222" stroke="#2a3654" />
        <text x={MAP.w - 114} y={MAP.h - 21} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing={1.5} fill={colors.muted}>
          ILLUSTRATION · MINH HỌA
        </text>
      </g>
    </svg>
  );
};

const ClockBanner: React.FC<{p: number; mini: number}> = ({p, mini}) => {
  const y = interpolate(mini, [0, 1], [540, 330]);
  const scale = interpolate(mini, [0, 1], [1, 0.55]);
  return (
    <div
      style={{
        position: 'absolute',
        left: 960,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale * (0.9 + 0.1 * p)})`,
        opacity: p,
        background: '#d8323f',
        borderRadius: 22,
        padding: '22px 60px',
        textAlign: 'center',
        boxShadow: '0 0 0 5px #ffffff, 0 20px 60px #000b',
        zIndex: 6,
      }}
    >
      <div style={{fontSize: 88, fontWeight: 800, lineHeight: 1}}>9:00 AM</div>
      <div style={{fontSize: 26, marginTop: 8}}>Giờ cao điểm sáng · Morning peak</div>
    </div>
  );
};

export const Problem04: React.FC = () => {
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const glow = interpolate(frame, [T.glow, T.glow + 15], [0, 1], clamp);
  const cardIn = spring({frame: frame - T.cardIn, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 20], [0, 1], ease);
  const panels = spring({frame: frame - T.panelsIn, fps, config: {damping: 200}});
  const clockIn = spring({frame: frame - T.clock, fps, config: {damping: 14}});
  const clockMini = interpolate(frame, [T.drive - 25, T.drive], [0, 1], ease);
  const clockOut = interpolate(frame, [T.zoomIn - 10, T.zoomIn + 5], [1, 0], clamp);
  const zoom = interpolate(frame, [T.zoomIn, T.zoomIn + 35], [0, 1], ease) - interpolate(frame, [T.zoomOut, T.zoomOut + 35], [0, 1], ease);
  const jam = interpolate(frame, [T.jam, T.jam + 15], [0, 1], clamp);
  const badge = spring({frame: frame - T.jam - 10, fps, config: {damping: 200}}) * interpolate(frame, [T.zoomOut - 10, T.zoomOut + 5], [1, 0], clamp);
  const callout = spring({frame: frame - T.callout, fps, config: {damping: 200}}) * interpolate(frame, [T.zoomOut - 10, T.zoomOut + 5], [1, 0], clamp);
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.jam ? 0 : frame < T.solved ? 1 : 2;
  const captions = [
    {icon: '04', en: '9:00 AM – shift start, every truck heads for aisles A, B', vi: '9:00 sáng – đầu ca, các xe cùng chạy vào dãy A, B'},
    {icon: '04', en: 'Congestion: every TO starts in aisles A, B', vi: 'Ùn tắc do các TO đều bắt đầu từ dãy A, B'},
    {icon: 'check', en: 'Less congestion in aisles A, B as trucks turn at the cross aisles → problem 04 solved', vi: 'Giảm ùn tắc dãy A, B khi xe rẽ qua các lối ngang → vấn đề 04 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.jam, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);
  const stuckCur = trucksStuck(CURRENT, frame);

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs
        states={['solved', 'solved', 'solved', solved ? 'solved' : 'solving']}
        glow={glow}
        hidden={frame >= T.cardIn && frame < T.cardOut + 15 ? 3 : undefined}
        checkScale={solved ? check : 1}
      />
      <ProblemCard
        n={4}
        en="Morning congestion"
        vi="Ùn tắc dãy đầu buổi sáng"
        descEn="Every TO starts in aisles A, B – at 9:00 the trucks get stuck there"
        descVi="Các TO đều bắt đầu từ dãy A, B – 9:00 sáng xe kẹt ở hai dãy này"
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <PanelShell kind="algo" value={String(trucksStuck(ALGO, frame))} unit="trucks" sub="stuck in aisles A, B · xe kẹt ở dãy A, B">
          <TrafficMap kind="algo" frame={frame} jam={jam} zoom={0} />
          {/* empty corner right of the short aisles 1–3 */}
          <MapChip x={606} y={99 + 545} title="GIẢM ÙN TẮC" sub="dãy A, B · less congestion" accent={colors.green} p={badge} />
          <Callout
            kind="algo"
            placement="top"
            large
            p={callout}
            en="Less congestion in aisles A, B as trucks turn off at the cross aisles"
            vi="Giảm ùn tắc dãy A, B khi các xe bắt đầu rẽ qua các lối ngang"
          />
        </PanelShell>
        <PanelShell kind="current" value={String(stuckCur)} unit={stuckCur === 1 ? 'truck' : 'trucks'} sub="stuck in aisles A, B · xe kẹt ở dãy A, B">
          <TrafficMap kind="current" frame={frame} jam={jam} zoom={zoom} />
          {/* just behind the queue, only while zoomed in */}
          <MapChip x={640} y={99 + 550} title={`${STUCK} XE KẸT`} sub="ở dãy A, B · trucks stuck" accent={colors.red} p={badge * zoom} />
          <Callout
            kind="current"
            placement="top"
            large
            p={callout}
            en={<>Congestion: every TO starts in <span style={{color: '#d23c3a'}}>aisles A, B</span></>}
            vi="Ùn tắc do các TO đều bắt đầu từ dãy A, B"
          />
        </PanelShell>
        <VsBadge />
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
      <ClockBanner p={clockIn * clockOut} mini={clockMini} />
    </AbsoluteFill>
  );
};
