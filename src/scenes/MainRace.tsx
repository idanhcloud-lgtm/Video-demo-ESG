import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {Subtitle} from '../components/Subtitle';
import {TabState, ProblemTabs} from '../components/ProblemTabs';
import {Ropes, Truck} from '../components/Ropes';
import {Callout, RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {LAYOUT, project} from '../layout';
import {aisleOrder, routeLength, stopPoint} from '../map/route';
import {track} from '../map/track';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useBi, useFlip, useViFirst} from '../lang';
import {useTimelineFrame} from '../timeline';

/**
 * Condensed version: the opening race, then problems 01–03 explained on the same map by moving the camera.
 * Timeline in 30-per-second units.
 */
const T0 = {
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
  // optional: highlight the left / right panel while the voice introduces it
  spotL: -1,
  spotR: -1,
  spotEnd: -1,
  // optional: distance comparison after the race. With dist set, both panel headers count metres during the race;
  // at dist the two header counters turn into white cards and fly to the centre, at distDiff the difference pops.
  dist: -1,
  distDiff: -1,
};
export type MainRaceBeats = Partial<typeof T0>;
export const MAIN_RACE_DURATION = toFrames(T0.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const TRACK = {current: track(current, TO28_DOOR), algo: track(algo, TO28_DOOR)};
// The race always lasts raceEnd - race of T0, so beat overrides keep the same truck speed.
const SPEED = TRACK.current.total / (T0.raceEnd - T0.race);
// Route lengths in metres (same formula as the routing app).
const LEN = {algo: routeLength(algo, TO28_DOOR), current: routeLength(current, TO28_DOOR)};

// Problem 01 (same example as video part 1): current visits #19 #20, drives far left for #21 #22,
// then comes back for #23 #24; the algorithm takes the same four stops in one pass (#8–#11).
const P1 = {current: [19, 20, 21, 22, 23], algo: [8, 9, 10], cam: {k: 1.4, tx: -1.4 * 200, ty: 250 - 1.4 * 146.5}};
// Problem 02 (lanes 3–5): current goes back to the front to change aisle; algorithm turns at the cross aisle at VT 75.
const P2 = {current: [5, 6, 7], algo: [5, 25, 26, 27], cam: {k: 1.45, tx: -1.45 * 60, ty: 240 - 1.45 * 500}};
const NO_CAM = {k: 1, tx: 0, ty: 0};

type Cam = typeof NO_CAM;
const mix = (a: Cam, b: Cam, t: number): Cam => ({k: a.k + (b.k - a.k) * t, tx: a.tx + (b.tx - a.tx) * t, ty: a.ty + (b.ty - a.ty) * t});

const Hl: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => <span style={{color: c}}>{children}</span>;

/** clean: no caption bar (bottom strip kept for subtitles); demoSubtitle shows how a subtitle sits there. */
export const MainRace: React.FC<{clean?: boolean; demoSubtitle?: boolean; beats?: MainRaceBeats}> = ({clean = false, demoSubtitle = false, beats}) => {
  const bi = useBi();
  const flip = useFlip();
  const T = {...T0, ...beats};
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
  const flashIdx = solvedAt.findIndex((s) => s === lastSolved);
  const flashP = Number.isFinite(lastSolved) ? interpolate(frame - lastSolved, [0, 8, 40, 70], [0, 1, 1, 0], clamp) : 0;
  // header numbers lift off as the comparison cards (DistanceCompare) while those are on screen
  const lifted = T.dist >= 0 && frame >= T.dist + 2 ? 0 : 1;
  const statsOpacity = interpolate(frame, [T.tabs, T.tabs + 20], [1, clean ? 0 : 1], clamp) * lifted;

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
    showDistance: T.dist >= 0,
    showPlanned: false,
    camera: cam,
    statsOpacity,
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
    const out = T.dist >= 0 ? T.dist : T.tabs;
    const p = spring({frame: frame - t0, fps, config: {damping: 14}}) * interpolate(frame, [out - 10, out + 5], [1, 0], clamp);
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
        <div style={{fontSize: 30, fontWeight: 800}}>✓ {flip('FINISHED · VỀ ĐÍCH')}</div>
        <div style={{fontSize: 18, color: '#5b6478'}}>{flip(kind === 'algo' ? 'Optimized route · Lộ trình tối ưu' : 'Aisle order · Theo dãy A → T')}</div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />

      {/* heading before the tabs come in */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center', opacity: 1 - tabsIn}}>
        <div style={{fontSize: 44, fontWeight: 800}}>{bi('Same TO · 28 stops · Who drives less?', 'Cùng 1 phiếu TO · 28 điểm · Xe nào chạy ít hơn?')[0]}</div>
        <div style={{fontSize: 26, color: colors.muted}}>{bi('Same TO · 28 stops · Who drives less?', 'Cùng 1 phiếu TO · 28 điểm · Xe nào chạy ít hơn?')[1]}</div>
      </div>
      <div style={{opacity: tabsIn, transform: `translateY(${(1 - tabsIn) * -20}px)`}}>
        <ProblemTabs states={states} glow={glow} checkScale={check} flash={clean ? {index: flashIdx, p: flashP} : undefined} />
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
            en={<>Runs back to the <Hl c="#d23c3a">front</Hl> for one more stop, then changes aisle</>}
            vi="Chạy ngược ra đầu dãy hạ thêm 1 điểm, rồi mới đổi lối"
          />
        )}
      </RoutePanel>
      {(['algo', 'current'] as const).map((kind) => {
        const s0 = kind === 'algo' ? T.spotL : T.spotR;
        const s1 = kind === 'algo' ? T.spotR : T.spotEnd;
        if (s0 < 0) return null;
        const o = interpolate(frame, [s0, s0 + 8, s1 - 6, s1], [0, 1, 1, 0], clamp);
        return (
          <div
            key={kind}
            style={{
              position: 'absolute',
              left: LAYOUT.panelLeft[kind] - 8,
              top: LAYOUT.panelTop - 8,
              width: LAYOUT.panelW + 16,
              height: LAYOUT.panelH + 16,
              borderRadius: 22,
              border: `5px solid ${kind === 'algo' ? colors.green : colors.red}`,
              boxShadow: `0 0 40px ${kind === 'algo' ? colors.green : colors.red}`,
              opacity: o,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        );
      })}
      <VsBadge />
      <FinishChip kind="algo" />
      <FinishChip kind="current" />

      {T.dist >= 0 ? <DistanceCompare frame={frame} at={T.dist} diffAt={T.distDiff} out={T.tabs} /> : null}
      {ropesOn ? <Ropes frame={frame} start={T.p3Ropes} waste={T.p3Waste} tracks={TRACK} /> : null}
      {clean ? null : <CaptionBar icon={cap.icon} en={cap.en} vi={cap.vi} opacity={capOpacity} />}
      {demoSubtitle && frame >= T.p1 && frame < T.p2 ? (
        <Subtitle
          vi="Một: các điểm gần nhau không được hạ hàng liên tiếp..."
          en="One: nearby stops are not handled in sequence..."
          opacity={interpolate(frame, [T.p1 + 10, T.p1 + 20], [0, 1], clamp)}
        />
      ) : null}
    </AbsoluteFill>
  );
};



/** The two header counters turn white, lift off their maps and meet in the centre; then the difference appears. */
const DistanceCompare: React.FC<{frame: number; at: number; diffAt: number; out: number}> = ({frame, at, diffAt, out}) => {
  const bi = useBi();
  const flip = useFlip();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const fps = TIMELINE_FPS;
  if (frame < at || frame > out) return null;
  const white = interpolate(frame, [at, at + 10], [0, 1], clamp);
  const fly = interpolate(frame, [at + 12, at + 45], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const fade = interpolate(frame, [out - 14, out], [1, 0], clamp);
  const pop = frame >= diffAt ? spring({frame: frame - diffAt, fps, config: {damping: 12}}) : 0;
  const diff = LEN.current - LEN.algo;
  const W = 300;
  const H = 96;
  const K = 1.75; // card scale in the centre
  const cards = [
    {kind: 'algo' as const, left: LAYOUT.panelLeft.algo + LAYOUT.panelW - 52 - W, cx: 960 - 300, c: colors.green, ink: '#0a8f5a', vi: 'Lộ trình tối ưu', en: 'Optimized route'},
    {kind: 'current' as const, left: LAYOUT.panelLeft.current + LAYOUT.panelW - 24 - W, cx: 960 + 300, c: colors.red, ink: '#d23c3a', vi: 'Theo dãy A → T', en: 'Aisle order A → T'},
  ];
  const top = LAYOUT.panelTop + 2;
  const cy = 450;
  const mix = (a: number, b: number) => a + (b - a) * fly;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, zIndex: 9}}>
      <div style={{position: 'absolute', inset: 0, background: '#050912', opacity: 0.72 * fly}} />
      {cards.map((k) => {
        const x0 = k.left + W / 2;
        const y0 = top + H / 2;
        return (
          <div
            key={k.kind}
            style={{
              position: 'absolute',
              left: k.left,
              top,
              width: W,
              height: H,
              boxSizing: 'border-box',
              transform: `translate(${mix(x0, k.cx) - x0}px, ${mix(y0, cy) - y0}px) scale(${mix(1, K)})`,
              borderRadius: 14,
              background: `rgba(255,255,255,${white})`,
              boxShadow: `0 0 0 ${3 * white}px ${k.c}, 0 ${18 * fly}px ${40 * fly}px #000a`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{position: 'absolute', top: -30, fontSize: 18, fontWeight: 800, color: k.c, opacity: fly, whiteSpace: 'nowrap'}}>
              {bi(k.en, k.vi)[0]} <span style={{fontWeight: 700, color: '#ffffff'}}>· {bi(k.en, k.vi)[1]}</span>
            </div>
            <div style={{fontSize: 58, fontWeight: 800, lineHeight: 1, color: white > 0.5 ? k.ink : k.c}}>
              {Math.round(LEN[k.kind]).toLocaleString('en-US')}
              <span style={{fontSize: 24, fontWeight: 600, color: white > 0.5 ? '#5b6478' : colors.muted, marginLeft: 6}}>m</span>
            </div>
            <div style={{fontSize: 16, color: white > 0.5 ? '#5b6478' : colors.muted, marginTop: 4}}>{flip('28 / 28 stops · 28 / 28 điểm hạ hàng')}</div>
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: cy + (H * K) / 2 + 40,
          transform: `translateX(-50%) scale(${0.6 + 0.4 * pop})`,
          opacity: Math.min(1, pop),
          background: colors.green,
          color: '#062016',
          borderRadius: 50,
          padding: '14px 44px',
          whiteSpace: 'nowrap',
          boxShadow: '0 16px 40px #000a',
        }}
      >
        <span style={{fontSize: 56, fontWeight: 800}}>−{Math.round(diff).toLocaleString('en-US')} m</span>
        <span style={{fontSize: 40, fontWeight: 800, marginLeft: 20}}>−{Math.round((100 * diff) / LEN.current)}%</span>
        <span style={{fontSize: 24, fontWeight: 600, marginLeft: 20}}>{flip('shorter · ngắn hơn')}</span>
      </div>
    </div>
  );
};
