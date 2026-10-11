import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {Forklift} from '../components/Forklift';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {project} from '../layout';
import {RACKS} from '../map/khoC';
import {Stop, aisleOrder, routePolyline, stopPoint} from '../map/route';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second).
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  dots: 190,
  race: 320,
  raceEnd: 680,
  ropes: 700,
  waste: 790,
  solved: 900,
  end: 990,
};
export const PROBLEM03_DURATION = toFrames(T.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const laneOf = (s: Stop) => RACKS.find((r) => r.code === s.rack)!.lane;
const LANES = new Set(TO28.map(laneOf)).size;

type Pt = [number, number];
interface Track {
  pts: Pt[];
  cum: number[];
  total: number;
  /** Route distance at which each stop is reached. */
  stopAt: number[];
}
const track = (stops: Stop[]): Track => {
  const {pts, stopIdx} = routePolyline(stops, TO28_DOOR);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
  return {pts, cum, total: cum[cum.length - 1], stopAt: stopIdx.map((k) => cum[k])};
};
const TRACK = {current: track(current), algo: track(algo)};
// Same speed for both trucks; the current route takes the whole race window.
const SPEED = TRACK.current.total / (T.raceEnd - T.race);

function pose(t: Track, d: number): {p: Pt; angle: number} {
  for (let i = 1; i < t.pts.length; i++) {
    if (d <= t.cum[i] || i === t.pts.length - 1) {
      const pa = project(...t.pts[i - 1]);
      const pb = project(...t.pts[i]);
      const seg = t.cum[i] - t.cum[i - 1];
      const k = seg === 0 ? 1 : Math.min(1, Math.max(0, (d - t.cum[i - 1]) / seg));
      return {p: [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k], angle: (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI};
    }
  }
  return {p: project(...t.pts[0]), angle: 0};
}

/** Plain dots that pop up one by one all over the warehouse (before any route is shown). */
const ScatterDots: React.FC<{frame: number; p: number}> = ({frame, p}) => (
  <g opacity={p}>
    {TO28.map((s, i) => {
      const [x, y] = project(...stopPoint(s));
      const k = Math.max(0, Math.min(1, (frame - T.dots - i * 3.5) / 8));
      return <circle key={i} cx={x} cy={y} r={11 * k + 4 * k * (1 - k)} fill={colors.yellow} stroke="#0b1222" strokeWidth={2} opacity={k} />;
    })}
  </g>
);

const Truck: React.FC<{t: Track; d: number; show: boolean}> = ({t, d, show}) => {
  if (!show || d <= 0 || d >= t.total) return null;
  const {p, angle} = pose(t, d);
  return <Forklift x={p[0]} y={p[1]} angle={angle} />;
};

/** Both routes straightened into two ropes at true scale; the extra length of the current one is the waste. */
const Ropes: React.FC<{frame: number}> = ({frame}) => {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const card = spring({frame: frame - T.ropes, fps: TIMELINE_FPS, config: {damping: 200}});
  const grow = interpolate(frame, [T.ropes + 15, T.ropes + 75], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const waste = interpolate(frame, [T.waste, T.waste + 15], [0, 1], clamp);
  const pulse = 0.6 + 0.4 * Math.sin(frame / 4);
  const W = 1500;
  const scale = W / TRACK.current.total;
  const x0 = 200;
  const lenG = TRACK.algo.total * scale;
  const lenR = TRACK.current.total * scale;
  const rope = (kind: 'algo' | 'current', y: number) => {
    const t = TRACK[kind];
    const len = t.total * scale * grow;
    const accent = kind === 'algo' ? colors.green : colors.red;
    return (
      <g>
        <text x={x0 - 8} y={y - 30} fontSize={30} fontWeight={800} fill={accent}>
          {kind === 'algo' ? 'ALGORITHM · Lộ trình tối ưu' : 'CURRENT · Theo dãy A → T'}
        </text>
        <line x1={x0} y1={y} x2={x0 + len} y2={y} stroke={accent} strokeWidth={16} strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px ${accent})`}} />
        {t.stopAt
          .filter((a) => a * scale <= len)
          .map((a, i) => (
            <circle key={i} cx={x0 + a * scale} cy={y} r={6} fill="#ffffff" stroke="#0b1222" strokeWidth={2} />
          ))}
        <g transform={`translate(${x0 + len} ${y})`}>
          <Forklift x={0} y={0} angle={0} />
        </g>
      </g>
    );
  };
  return (
    <AbsoluteFill style={{opacity: card}}>
      <div style={{position: 'absolute', left: 40, top: 176, width: 1840, height: 727, background: 'rgba(6, 10, 22, 0.86)', borderRadius: 16}} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <text x={960} y={300} textAnchor="middle" fontSize={40} fontWeight={800} fill="#ffffff">
          Same 28 stops – routes straightened out
        </text>
        <text x={960} y={340} textAnchor="middle" fontSize={26} fill={colors.muted}>
          Cùng 28 điểm – duỗi thẳng hai lộ trình để so độ dài
        </text>
        {rope('algo', 470)}
        {rope('current', 640)}
        {/* end of the optimized rope, projected onto the current rope */}
        <line x1={x0 + lenG} y1={430} x2={x0 + lenG} y2={680} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="8 7" opacity={waste} />
        <g opacity={waste}>
          <rect x={x0 + lenG} y={624} width={lenR - lenG} height={32} rx={6} fill={colors.red} opacity={0.35 + 0.45 * pulse} />
          <rect x={x0 + (lenG + lenR) / 2 - 275} y={690} width={550} height={92} rx={14} fill="#ffffff" stroke={colors.red} strokeWidth={4} />
          <text x={x0 + (lenG + lenR) / 2} y={735} textAnchor="middle" fontSize={34} fontWeight={800} fill="#d23c3a">
            QUÃNG ĐƯỜNG LÃNG PHÍ
          </text>
          <text x={x0 + (lenG + lenR) / 2} y={766} textAnchor="middle" fontSize={22} fontWeight={600} fill="#5b6478">
            Wasted travel
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const Problem03: React.FC = () => {
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const glow = interpolate(frame, [T.glow, T.glow + 15], [0, 1], clamp);
  const cardIn = spring({frame: frame - T.cardIn, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 20], [0, 1], ease);
  const panels = spring({frame: frame - T.panelsIn, fps, config: {damping: 200}});
  const dots = interpolate(frame, [T.race, T.race + 20], [1, 0], clamp);
  const racing = frame >= T.race;
  const traveled = Math.max(0, frame - T.race) * SPEED;
  const ropesOn = frame >= T.ropes;
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.race ? 0 : frame < T.ropes ? 1 : frame < T.waste ? 2 : frame < T.solved ? 3 : 4;
  const captions = [
    {icon: '03', en: `One TO: 28 stops scattered over ${LANES} of 18 aisles`, vi: `Một phiếu TO: 28 điểm nằm rải rác trên ${LANES}/18 dãy`},
    {icon: '03', en: 'Same stops, same speed – which truck drives further?', vi: 'Cùng các điểm, cùng tốc độ – xe nào chạy xa hơn?'},
    {icon: '03', en: 'Straighten both routes and compare', vi: 'Duỗi thẳng hai lộ trình để so sánh'},
    {icon: '03', en: 'Scattered items without an optimized route = a lot of wasted travel', vi: 'Hàng rải rác mà không có lộ trình tối ưu = lãng phí rất nhiều quãng đường'},
    {icon: 'check', en: 'Optimized route cuts the wasted travel → problem 03 solved', vi: 'Lộ trình tối ưu cắt bỏ quãng đường lãng phí → vấn đề 03 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.race, T.ropes, T.waste, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  const panel = (kind: 'algo' | 'current') => ({
    kind,
    stops: kind === 'algo' ? algo : current,
    doorId: TO28_DOOR,
    traveled: racing ? traveled : 0,
    showDistance: false,
    showPlanned: false,
    hideOthers: racing ? 0 : 1,
    underlay: <ScatterDots frame={frame} p={dots} />,
    overlay: <Truck t={TRACK[kind]} d={traveled} show={racing && !ropesOn} />,
  });

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs
        states={['solved', 'solved', solved ? 'solved' : 'solving', 'idle']}
        glow={glow}
        hidden={frame >= T.cardIn && frame < T.cardOut + 15 ? 2 : undefined}
        checkScale={solved ? check : 1}
      />
      <ProblemCard
        n={3}
        en="Scattered items"
        vi="Hàng rải rác nhiều dãy"
        descEn="Items spread over many aisles – without an optimized route, the truck drives much further"
        descVi="Hàng nằm rải rác nhiều dãy – không có lộ trình tối ưu, xe chạy thừa rất nhiều"
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <RoutePanel {...panel('algo')} />
        <RoutePanel {...panel('current')} />
        <VsBadge />
        {ropesOn ? <Ropes frame={frame} /> : null}
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
