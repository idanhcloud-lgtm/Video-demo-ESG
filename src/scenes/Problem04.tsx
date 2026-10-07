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
  jam: 430,
  callout: 470,
  solved: 640,
  end: 730,
};
export const PROBLEM04_DURATION = toFrames(T.end);

type Pt = [number, number];
interface Trip {
  door: string;
  lane: number;
  vt: number;
}

// Illustration (no measured data): 6 trucks leave the doors at 9:00.
// Current: every printed TO starts at aisle A (lane 1), so 4 trucks queue there.
const CURRENT: Trip[] = [
  {door: '01', lane: 1, vt: 24},
  {door: '02', lane: 1, vt: 17},
  {door: '03', lane: 1, vt: 10},
  {door: '04', lane: 1, vt: 3},
  {door: '13', lane: 10, vt: 46},
  {door: '19', lane: 13, vt: 68},
];
// Algorithm: each TO starts at its own nearest stop, so the same 4 trucks go to different aisles.
const ALGO: Trip[] = [
  {door: '01', lane: 1, vt: 24},
  {door: '02', lane: 3, vt: 40},
  {door: '03', lane: 5, vt: 16},
  {door: '04', lane: 7, vt: 30},
  {door: '13', lane: 10, vt: 46},
  {door: '19', lane: 13, vt: 68},
];
const IN_AISLE_A = (trips: Trip[]) => trips.filter((t) => t.lane === 1).length;

const FRONT_X = vtX(-1.2);
const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
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
const pathLen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + len(pts[i], p), 0);


// Queued trucks stop at their place in the queue; the others keep driving on to their next stops.
const tripPath = (t: Trip, queued: boolean): Pt[] => {
  const door = DOORS.find((d) => d.id === t.door)!;
  const [, dy] = project(0, door.y);
  const pts: Pt[] = [
    [MAP.doorX, dy],
    [FRONT_X, dy],
    [FRONT_X, laneYpx(t.lane)],
    [vtX(t.vt), laneYpx(t.lane)],
  ];
  if (!queued) pts.push([vtX(t.vt + 22), laneYpx(t.lane)]);
  return pts;
};
const tripDistance = (frame: number, i: number, L: number) => Math.max(0, Math.min(L, (frame - T.drive - i * STAGGER) * SPEED));
/** Trucks currently inside aisle A (lane 1) at this frame. */
export const trucksInAisleA = (trips: Trip[], kind: 'algo' | 'current', frame: number) =>
  trips.filter((t, i) => {
    if (t.lane !== 1) return false;
    const pts = tripPath(t, kind === 'current');
    return tripDistance(frame, i, pathLen(pts)) > pathLen(pts.slice(0, 3)) + 4;
  }).length;

const SPEED = 4.2; // px per timeline unit
const STAGGER = 14;

const MapBadge: React.FC<{x: number; y: number; text: string; sub: string; accent: string; p: number}> = ({x, y, text, sub, accent, p}) => (
  <g transform={`translate(${x} ${y}) scale(${0.85 + 0.15 * p})`} opacity={p}>
    <rect x={0} y={-26} width={250} height={52} rx={12} fill="#ffffff" stroke={accent} strokeWidth={3} />
    <text x={125} y={-3} textAnchor="middle" fontSize={21} fontWeight={800} fill={accent === colors.red ? '#d23c3a' : '#0a8f5a'}>
      {text}
    </text>
    <text x={125} y={17} textAnchor="middle" fontSize={14} fill="#5b6478">
      {sub}
    </text>
  </g>
);

const TrafficMap: React.FC<{kind: 'algo' | 'current'; frame: number; jam: number; badge: number}> = ({kind, frame, jam, badge}) => {
  const trips = kind === 'algo' ? ALGO : CURRENT;
  const accent = kind === 'algo' ? colors.green : colors.red;
  const pulse = 0.55 + 0.45 * Math.sin(frame / 4);
  const laneA = laneYpx(1);
  return (
    <svg width={MAP.w} height={MAP.h} style={{display: 'block'}}>
      <MapBase startDoor="" />
      {/* aisle A highlight */}
      <rect
        x={FRONT_X - 6}
        y={laneA - 12}
        width={vtX(77) - FRONT_X + 6}
        height={24}
        rx={12}
        fill={kind === 'current' ? colors.red : colors.green}
        opacity={(kind === 'current' ? 0.28 * pulse : 0.12) * jam}
      />
      {trips.map((t, i) => {
        const queued = kind === 'current' && t.lane === 1;
        const pts = tripPath(t, queued);
        const L = pathLen(pts);
        const d = tripDistance(frame, i, L);
        const trail = along(pts, d);
        const arrived = d >= L;
        return (
          <g key={i}>
            <path
              d={pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ')}
              fill="none"
              stroke={accent}
              strokeWidth={4}
              strokeOpacity={0.55}
              strokeDasharray={`${d} ${L + 10}`}
            />
            {frame >= T.drive + i * STAGGER ? (
              <Forklift x={trail.p[0]} y={trail.p[1]} angle={trail.angle} light={arrived ? 0.35 : 1} alert={queued && arrived ? jam * pulse : 0} />
            ) : null}
          </g>
        );
      })}
      {kind === 'current' ? (
        <MapBadge x={vtX(34)} y={laneA - 52} text={`${IN_AISLE_A(CURRENT)} TRUCKS · 1 AISLE`} sub="4 xe dồn vào dãy A" accent={colors.red} p={badge} />
      ) : (
        <MapBadge x={vtX(34)} y={laneA - 52} text="1 TRUCK PER AISLE" sub="mỗi lối 1 xe" accent={colors.green} p={badge} />
      )}
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
  const x = interpolate(mini, [0, 1], [960, 960]);
  const y = interpolate(mini, [0, 1], [540, 330]);
  const scale = interpolate(mini, [0, 1], [1, 0.55]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
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
  const clockOut = interpolate(frame, [T.jam - 10, T.jam + 5], [1, 0], clamp);
  const jam = interpolate(frame, [T.jam, T.jam + 15], [0, 1], clamp);
  const badge = spring({frame: frame - T.jam - 10, fps, config: {damping: 200}});
  const callout = spring({frame: frame - T.callout, fps, config: {damping: 200}}) * interpolate(frame, [T.solved - 15, T.solved], [1, 0], clamp);
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.jam ? 0 : frame < T.solved ? 1 : 2;
  const captions = [
    {icon: '04', en: '9:00 AM – shift start, trucks leave the doors together', vi: '9:00 sáng – đầu ca, các xe cùng rời cửa'},
    {icon: '04', en: 'Every printed TO starts at aisle A – 4 trucks queue in one aisle', vi: 'Phiếu nào cũng bắt đầu từ dãy A – 4 xe xếp hàng trong 1 lối'},
    {icon: 'check', en: 'Each TO starts where its own items are → problem 04 solved', vi: 'Mỗi phiếu bắt đầu theo vị trí hàng của nó → vấn đề 04 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.jam, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

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
        descEn="Every printed TO starts at aisle A – at 9:00 the trucks crowd the same aisle"
        descVi="Phiếu in luôn bắt đầu từ dãy A – 9:00 sáng các xe dồn vào cùng một lối"
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <PanelShell kind="algo" value={String(trucksInAisleA(ALGO, 'algo', frame))} unit={trucksInAisleA(ALGO, 'algo', frame) === 1 ? 'truck' : 'trucks'} sub="in aisle A · xe trong dãy A">
          <TrafficMap kind="algo" frame={frame} jam={jam} badge={badge} />
          <Callout
            kind="algo"
            placement="top"
            p={callout}
            en="Each TO starts at its own nearest stop – trucks spread across aisles"
            vi="Mỗi phiếu bắt đầu ở điểm gần nhất của nó – xe tỏa ra nhiều lối"
          />
        </PanelShell>
        <PanelShell kind="current" value={String(trucksInAisleA(CURRENT, 'current', frame))} unit={trucksInAisleA(CURRENT, 'current', frame) === 1 ? 'truck' : 'trucks'} sub="in aisle A · xe trong dãy A">
          <TrafficMap kind="current" frame={frame} jam={jam} badge={badge} />
          <Callout
            kind="current"
            placement="top"
            p={callout}
            en={<>Every printed TO starts at aisle A → <span style={{color: '#d23c3a'}}>4 trucks</span> wait in one aisle</>}
            vi="Phiếu nào cũng bắt đầu từ dãy A → 4 xe chờ nhau trong 1 lối"
          />
        </PanelShell>
        <VsBadge />
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
      <ClockBanner p={clockIn * clockOut} mini={clockMini} />
    </AbsoluteFill>
  );
};
