import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {Callout, RoutePanel, VsBadge, pointAtFraction, routePixels} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {laneYpx, vtX} from '../layout';
import {RACKS, distFromDoor} from '../map/khoC';
import {Stop, aisleOrder, doorY} from '../map/route';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second), same beats as problems 01 and 02.
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  lanes: 190,
  split: 290,
  trace: 360,
  callout: 420,
  hide: 570,
  solved: 600,
  end: 690,
};
export const PROBLEM03_DURATION = toFrames(T.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const laneOf = (s: Stop) => RACKS.find((r) => r.code === s.rack)!.lane;
const lanesWithStops = [...new Set(TO28.map(laneOf))];

// The way back starts at the stop farthest from the door (CTP-92 on both routes).
const farthest = (order: Stop[]) => {
  let best = 0;
  order.forEach((s, i) => {
    if (distFromDoor(doorY(TO28_DOOR), laneOf(s), s.vt) > distFromDoor(doorY(TO28_DOOR), laneOf(order[best]), order[best].vt)) best = i;
  });
  return best + 1;
};
const emptyReturn = (order: Stop[]) => {
  const last = order[order.length - 1];
  return distFromDoor(doorY(TO28_DOOR), laneOf(last), last.vt);
};
const RET_CUR = Math.round(emptyReturn(current));
const RET_ALGO = Math.round(emptyReturn(algo));

const MeterTag: React.FC<{at: [number, number]; dx?: number; dy?: number; text: string; sub: string; accent: string; p: number}> = ({at, dx = 0, dy = 0, text, sub, accent, p}) => (
  <g transform={`translate(${at[0] + dx} ${at[1] + dy}) scale(${0.85 + 0.15 * p})`} opacity={p}>
    <rect x={-120} y={-58} width={240} height={46} rx={10} fill="#ffffff" stroke={accent} strokeWidth={3} />
    <text x={0} y={-36} textAnchor="middle" fontSize={20} fontWeight={800} fill="#141a2b">
      {text}
    </text>
    <text x={0} y={-19} textAnchor="middle" fontSize={12.5} fill="#5b6478">
      {sub}
    </text>
  </g>
);

const LaneMarks: React.FC<{accent: string; p: number}> = ({accent, p}) => (
  <g opacity={p}>
    {lanesWithStops.map((lane) => (
      <g key={lane}>
        <rect x={vtX(-1.5)} y={laneYpx(lane) - 5} width={vtX(105) - vtX(-1.5)} height={10} rx={5} fill={accent} opacity={0.12} />
        <circle cx={vtX(-1.5)} cy={laneYpx(lane)} r={5} fill={accent} />
      </g>
    ))}
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
  const lanes = interpolate(frame, [T.lanes, T.lanes + 15, T.split - 10, T.split + 10], [0, 1, 1, 0], clamp);
  const split = interpolate(frame, [T.split, T.split + 20, T.hide, T.hide + 20], [0, 1, 1, 0], clamp);
  const trace = interpolate(frame, [T.trace, T.callout - 5], [0, 1], clamp);
  const tag = spring({frame: frame - T.callout + 5, fps, config: {damping: 200}});
  const callout = spring({frame: frame - T.callout, fps, config: {damping: 200}}) * interpolate(frame, [T.hide - 10, T.hide + 5], [1, 0], clamp);
  const hideOthers = interpolate(frame, [T.hide, T.hide + 30], [0, 1], clamp);
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.split ? 0 : frame < T.trace ? 1 : frame < T.solved ? 2 : 3;
  const captions = [
    {icon: '03', en: `Same TO on both routes: ${lanesWithStops.length} of 18 aisles to visit`, vi: `Cùng 1 phiếu: hai xe đều phải ghé ${lanesWithStops.length}/18 lối`},
    {icon: '03', en: 'Way out in colour · way back in blue, from the farthest stop', vi: 'Lượt đi: màu xe · Lượt về: xanh dương, tính từ điểm xa nhất'},
    {icon: '03', en: `The current truck ends at the far corner and drives ${RET_CUR} m back empty`, vi: `Xe hiện tại kết thúc ở góc xa, chạy không ${RET_CUR} m về cửa`},
    {icon: 'check', en: 'One loop out and back – no long empty return → problem 03 solved', vi: 'Một vòng đi – về, không chạy không đường dài → vấn đề 03 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.split, T.trace, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  const curPx = routePixels(current, TO28_DOOR);
  const algoPx = routePixels(algo, TO28_DOOR);
  const retPts = (r: {pts: [number, number][]; stopIdx: number[]}) => r.pts.slice(r.stopIdx[r.stopIdx.length - 1]);
  const curTagAt = pointAtFraction(retPts(curPx), 0.62);
  // Above the last stop, so the stop next to the door stays visible.
  const algoTagAt = pointAtFraction(retPts(algoPx), 0);

  const common = {doorId: TO28_DOOR, traveled: Infinity, focusProgress: trace, hideOthers, splitMix: split};

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
        descEn={`One TO touches ${lanesWithStops.length} of 18 aisles – the printed order sweeps them one by one`}
        descVi={`Một phiếu rải ${lanesWithStops.length}/18 lối – phiếu in quét lần lượt từng dãy`}
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <RoutePanel
          kind="algo"
          stops={algo}
          splitStop={farthest(algo)}
          focusLegs={[algo.length]}
          underlay={<LaneMarks accent={colors.green} p={lanes} />}
          overlay={<MeterTag at={algoTagAt} dx={60} dy={-8} text={`${RET_ALGO} m`} sub="back to door · về cửa" accent={colors.green} p={tag} />}
          {...common}
        >
          <Callout
            kind="algo"
            placement="top"
            p={callout}
            en={<>Out through the deep zone, back through the front – last stop next to the door</>}
            vi="Đi qua vùng sâu, về qua vùng gần cửa – điểm cuối sát cửa"
          />
        </RoutePanel>
        <RoutePanel
          kind="current"
          stops={current}
          splitStop={farthest(current)}
          focusLegs={[current.length]}
          underlay={<LaneMarks accent={colors.red} p={lanes} />}
          overlay={<MeterTag at={curTagAt} dx={140} text={`${RET_CUR} m`} sub="no stops · không ghé điểm nào" accent={colors.red} p={tag} />}
          {...common}
        >
          <Callout
            kind="current"
            p={callout}
            en={
              <>
                Ends at the far corner (lane 18, VT 92) → <span style={{color: '#d23c3a'}}>{RET_CUR} m</span> back empty
              </>
            }
            vi={`Kết thúc ở góc xa nhất → chạy không ${RET_CUR} m về cửa`}
          />
        </RoutePanel>
        <VsBadge />
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
