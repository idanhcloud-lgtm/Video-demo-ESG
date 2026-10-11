import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {TabState, ProblemTabs} from '../components/ProblemTabs';
import {Ropes, Truck} from '../components/Ropes';
import {Callout, RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {LAYOUT, project} from '../layout';
import {aisleOrder, stopPoint} from '../map/route';
import {track} from '../map/track';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

/**
 * Condensed version: the opening race, then problems 01–03 explained on the same map by moving the camera.
 * Timeline in 30-per-second units.
 */
const T = {
  dots: 0,
  race: 60,
  raceEnd: 420,
  tabs: 440,
  p1: 500,
  p1Trace: 545,
  p1Callout: 640,
  p1Solved: 760,
  p2: 800,
  p2Trace: 845,
  p2Callout: 925,
  p2Solved: 1045,
  p3: 1085,
  p3Flash: 1120,
  p3Ropes: 1180,
  p3Waste: 1275,
  p3Solved: 1375,
  end: 1460,
};
export const MAIN_RACE_DURATION = toFrames(T.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const TRACK = {current: track(current, TO28_DOOR), algo: track(algo, TO28_DOOR)};
const SPEED = TRACK.current.total / (T.raceEnd - T.race);

// Problem 01 (same example as video part 1): current visits #19 #20, drives far left for #21 #22,
// then comes back for #23 #24; the algorithm takes the same four stops in one pass (#8–#11).
const P1 = {current: [19, 20, 21, 22, 23], algo: [8, 9, 10], cam: {k: 1.4, tx: -1.4 * 200, ty: 250 - 1.4 * 146.5}};
// Problem 02 (lanes 3–5): current goes back to the front to change aisle; algorithm turns at the cross aisle at VT 75.
const P2 = {current: [5, 6, 7], algo: [5, 25, 26, 27], cam: {k: 1.45, tx: -1.45 * 60, ty: 240 - 1.45 * 500}};
const NO_CAM = {k: 1, tx: 0, ty: 0};

type Cam = typeof NO_CAM;
const mix = (a: Cam, b: Cam, t: number): Cam => ({k: a.k + (b.k - a.k) * t, tx: a.tx + (b.tx - a.tx) * t, ty: a.ty + (b.ty - a.ty) * t});

const Hl: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => <span style={{color: c}}>{children}</span>;

export const MainRace: React.FC = () => {
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const racing = frame >= T.race;
  const traveled = Math.max(0, frame - T.race) * SPEED;

  // Camera: full → P1 → P2 → full
  const toP1 = interpolate(frame, [T.p1, T.p1 + 40], [0, 1], ease);
  const toP2 = interpolate(frame, [T.p2, T.p2 + 45], [0, 1], ease);
  const toFull = interpolate(frame, [T.p3, T.p3 + 40], [0, 1], ease);
  const cam = frame < T.p2 ? mix(NO_CAM, P1.cam, toP1) : frame < T.p3 ? mix(P1.cam, P2.cam, toP2) : mix(P2.cam, NO_CAM, toFull);

  const active = frame < T.p2 ? P1 : frame < T.p3 ? P2 : null;
  const traceStart = frame < T.p2 ? T.p1Trace : T.p2Trace;
  const traceEnd = frame < T.p2 ? T.p1Callout - 10 : T.p2Callout - 10;
  const segStart = frame < T.p2 ? T.p1 : T.p2;
  const segEnd = frame < T.p2 ? T.p2 : T.p3;
  const trace = (n: number) => interpolate(frame, [traceStart, traceEnd], [0, n], clamp);
  const focusOn = active && frame >= segStart ? interpolate(frame, [segStart, segStart + 20, segEnd - 15, segEnd], [0, 1, 1, 0], clamp) : 0;

  // Problem 03: whole map, flash all stops, then straighten both routes.
  const flash = frame >= T.p3Flash && frame < T.p3Ropes ? 0.5 + 0.5 * Math.sin((frame - T.p3Flash) / 3) : 0;
  const ropesOn = frame >= T.p3Ropes;

  const tabsIn = spring({frame: frame - T.tabs, fps, config: {damping: 200}});
  const solvedAt = [T.p1Solved, T.p2Solved, T.p3Solved, Infinity];
  const startAt = [T.p1, T.p2, T.p3, Infinity];
  const states: TabState[] = [0, 1, 2, 3].map((i) => (frame >= solvedAt[i] ? 'solved' : frame >= startAt[i] ? 'solving' : 'idle'));
  const solvingIdx = states.indexOf('solving');
  const glow = solvingIdx >= 0 ? interpolate(frame, [startAt[solvingIdx], startAt[solvingIdx] + 15], [0, 1], clamp) : 0;
  const lastSolved = Math.max(...solvedAt.filter((s) => frame >= s), -Infinity);
  const check = Number.isFinite(lastSolved) ? spring({frame: frame - lastSolved, fps, config: {damping: 12}}) : 1;

  const callP1 = spring({frame: frame - T.p1Callout, fps, config: {damping: 200}}) * interpolate(frame, [T.p2 - 10, T.p2], [1, 0], clamp);
  const callP2 = spring({frame: frame - T.p2Callout, fps, config: {damping: 200}}) * interpolate(frame, [T.p3 - 10, T.p3], [1, 0], clamp);

  const phases = [
    {at: 0, icon: 'play', en: 'Same TO · 28 put-away stops · same speed', vi: 'Cùng 1 phiếu TO · 28 điểm hạ hàng · cùng tốc độ'},
    {at: T.race + 270, icon: 'target', en: 'The optimized truck finishes first', vi: 'Xe theo lộ trình tối ưu về đích trước'},
    {at: T.tabs, icon: 'target', en: 'Why the difference? 4 limitations of the current process', vi: 'Vì sao chênh lệch? 4 hạn chế của quy trình hiện tại'},
    {at: T.p1, icon: '01', en: 'Same area – but the current truck comes in twice', vi: 'Cùng một khu vực, nhưng xe hiện tại phải vào tới 2 lần'},
    {at: T.p1Solved, icon: 'check', en: 'Nearby stops handled back to back → 01 solved', vi: 'Các điểm gần nhau được hạ hàng liên tiếp → 01 đã giải quyết'},
    {at: T.p2, icon: '02', en: 'Back to the front to change aisle – then deep again', vi: 'Chạy về đầu dãy để đổi lối, rồi lại vào sâu'},
    {at: T.p2Solved, icon: 'check', en: 'Aisle changed at the cross aisle on the way → 02 solved', vi: 'Đổi lối ngay tại lối ngang gần nhất trên đường đi → 02 đã giải quyết'},
    {at: T.p3, icon: '03', en: '28 stops scattered over 15 of 18 aisles', vi: '28 điểm nằm rải rác trên 15/18 dãy'},
    {at: T.p3Waste, icon: '03', en: 'Without an optimized route, the truck drives a lot further', vi: 'Không có lộ trình tối ưu, xe chạy thừa rất nhiều quãng đường'},
    {at: T.p3Solved, icon: 'check', en: 'Optimized route reduces the extra travel → 03 solved', vi: 'Lộ trình tối ưu giảm phần quãng đường chạy thừa → 03 đã giải quyết'},
  ];
  const cap = [...phases].reverse().find((p) => frame >= p.at)!;
  const capOpacity = interpolate(frame, [cap.at, cap.at + 12], [0, 1], clamp);

  const finished = (kind: 'algo' | 'current') => racing && traveled >= TRACK[kind].total;

  const Flash: React.FC = () => (
    <g opacity={flash}>
      {TO28.map((s, i) => {
        const [x, y] = project(...stopPoint(s));
        return <circle key={i} cx={x} cy={y} r={22} fill="none" stroke={colors.yellow} strokeWidth={4} />;
      })}
    </g>
  );

  const panel = (kind: 'algo' | 'current') => ({
    kind,
    stops: kind === 'algo' ? algo : current,
    doorId: TO28_DOOR,
    traveled: racing ? traveled : 0,
    showDistance: false,
    showPlanned: false,
    camera: cam,
    focusLegs: active ? active[kind] : [],
    focusProgress: active ? trace(active[kind].length) : 0,
    hideOthers: 0.75 * focusOn,
    dim: 0.7 * focusOn,
    overlay: (
      <>
        <Truck t={TRACK[kind]} d={traveled} show={racing} />
        <Flash />
      </>
    ),
  });

  const FinishChip: React.FC<{kind: 'algo' | 'current'}> = ({kind}) => {
    const t0 = T.race + TRACK[kind].total / SPEED;
    const p = spring({frame: frame - t0, fps, config: {damping: 14}}) * interpolate(frame, [T.tabs - 10, T.tabs + 5], [1, 0], clamp);
    if (!finished(kind)) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: LAYOUT.panelLeft[kind] + LAYOUT.panelW / 2,
          top: LAYOUT.panelTop + 130,
          transform: `translateX(-50%) scale(${0.7 + 0.3 * p})`,
          opacity: p,
          background: '#ffffff',
          color: '#0b1222',
          borderRadius: 14,
          padding: '12px 28px',
          textAlign: 'center',
          boxShadow: `0 0 0 4px ${kind === 'algo' ? colors.green : colors.red}, 0 12px 30px #000a`,
          zIndex: 4,
        }}
      >
        <div style={{fontSize: 30, fontWeight: 800}}>✓ FINISHED · VỀ ĐÍCH</div>
        <div style={{fontSize: 18, color: '#5b6478'}}>{kind === 'algo' ? 'Optimized route · Lộ trình tối ưu' : 'Aisle order · Theo dãy A → T'}</div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />

      {/* heading before the tabs come in */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center', opacity: 1 - tabsIn}}>
        <div style={{fontSize: 44, fontWeight: 800}}>Same TO · 28 stops · Who drives less?</div>
        <div style={{fontSize: 26, color: colors.muted}}>Cùng 1 phiếu TO · 28 điểm · Xe nào chạy ít hơn?</div>
      </div>
      <div style={{opacity: tabsIn, transform: `translateY(${(1 - tabsIn) * -20}px)`}}>
        <ProblemTabs states={states} glow={glow} checkScale={check} />
      </div>

      <RoutePanel {...panel('algo')}>
        {frame < T.p2 ? (
          <Callout
            kind="algo"
            placement="top"
            large
            p={callP1}
            en={<>Handles the <Hl c="#0a8f5a">4 nearby stops</Hl> back to back – one visit to this area</>}
            vi="Hạ hàng 4 điểm gần nhau liên tiếp, chỉ vào khu vực này một lần"
          />
        ) : (
          <Callout
            kind="algo"
            p={callP2}
            en={<>Changes aisle at the <Hl c="#0a8f5a">nearest cross aisle</Hl> on the way</>}
            vi="Đổi lối ngay ở lối ngang gần nhất; các điểm gần cửa được hạ hàng trên đường quay về"
          />
        )}
      </RoutePanel>
      <RoutePanel {...panel('current')}>
        {frame < T.p2 ? (
          <Callout
            kind="current"
            placement="top"
            large
            p={callP1}
            en={<>#19 #20 → drives <Hl c="#d23c3a">far away</Hl> → comes back for #23 #24</>}
            vi="Hạ #19 #20, rời đi xa rồi quay lại hạ #23 #24"
          />
        ) : (
          <Callout
            kind="current"
            p={callP2}
            en={<>Back to the <Hl c="#d23c3a">front</Hl> to change aisle, then deep again</>}
            vi="Chạy về đầu dãy để đổi lối, rồi lại vào sâu"
          />
        )}
      </RoutePanel>
      <VsBadge />
      <FinishChip kind="algo" />
      <FinishChip kind="current" />

      {ropesOn ? <Ropes frame={frame} start={T.p3Ropes} waste={T.p3Waste} tracks={TRACK} /> : null}
      <CaptionBar icon={cap.icon} en={cap.en} vi={cap.vi} opacity={capOpacity} />
    </AbsoluteFill>
  );
};
