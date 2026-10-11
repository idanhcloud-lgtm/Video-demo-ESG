import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {Ropes, Truck} from '../components/Ropes';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {project} from '../layout';
import {RACKS} from '../map/khoC';
import {Stop, aisleOrder, stopPoint} from '../map/route';
import {track} from '../map/track';
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

const TRACK = {current: track(current, TO28_DOOR), algo: track(algo, TO28_DOOR)};
// Same speed for both trucks; the current route takes the whole race window.
const SPEED = TRACK.current.total / (T.raceEnd - T.race);

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
    {icon: 'check', en: 'Optimized route reduces the extra travel → problem 03 solved', vi: 'Lộ trình tối ưu giảm phần quãng đường chạy thừa → vấn đề 03 đã giải quyết'},
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
        {ropesOn ? <Ropes frame={frame} start={T.ropes} waste={T.waste} tracks={TRACK} /> : null}
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
