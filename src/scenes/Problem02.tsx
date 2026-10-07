import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel} from '../components/RoutePanel';
import {Viewport} from '../components/WarehouseMap';
import {PROBLEM02_DOOR, PROBLEM02_STOPS} from '../data/problem02';
import {aisleOrder, optimizedOrder, routeLength} from '../map/route';
import {colors, fontFamily} from '../theme';

// Timeline (frames @30fps)
const T = {
  cardOut: 130,
  panelsIn: 150,
  crossHi: 165,
  raceStart: 210,
  raceEnd: 630,
  calloutIn: 650,
  solved: 800,
  end: 900,
};
export const PROBLEM02_DURATION = T.end;

const PANEL_W = 900;
const MAP_H = 610;
const FULL: Viewport = {x0: -20, x1: 150, y0: -4, y1: 152};
const ZOOM: Viewport = {x0: -20, x1: 132, y0: 43.25 - 49.5, y1: 43.25 + 49.5};

const lerpView = (a: Viewport, b: Viewport, t: number): Viewport => ({
  x0: a.x0 + (b.x0 - a.x0) * t,
  x1: a.x1 + (b.x1 - a.x1) * t,
  y0: a.y0 + (b.y0 - a.y0) * t,
  y1: a.y1 + (b.y1 - a.y1) * t,
});

const current = aisleOrder(PROBLEM02_STOPS);
const algo = optimizedOrder(PROBLEM02_STOPS, PROBLEM02_DOOR);
const lenCurrent = routeLength(current, PROBLEM02_DOOR);
const lenAlgo = routeLength(algo, PROBLEM02_DOOR);
const saved = lenCurrent - lenAlgo;
// Both trucks drive at the same speed; the current route takes the whole race window.
const SPEED = lenCurrent / (T.raceEnd - T.raceStart);

// Legs crossing lane 6 → 7 and 7 → 8 (where the routes differ).
const legsBetweenLanes67and78 = (order: typeof current) =>
  order
    .map((s, i) => ({s, i}))
    .filter(({s, i}) => i > 0 && ['CGT', 'CHT'].includes(s.rack) && order[i - 1].rack !== s.rack)
    .map(({i}) => i);

const Caption: React.FC<{en: string; vi: string; icon: string; opacity: number}> = ({en, vi, icon, opacity}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity}}>
    <div style={{fontSize: 40, color: colors.yellow, width: 44, textAlign: 'center'}}>{icon}</div>
    <div>
      <div style={{fontSize: 34, fontWeight: 700}}>{en}</div>
      <div style={{fontSize: 22, color: colors.muted}}>{vi}</div>
    </div>
  </div>
);

const Callout: React.FC<{kind: 'algo' | 'current'; title: string; en: string; vi: string; p: number}> = ({kind, title, en, vi, p}) => {
  const accent = kind === 'algo' ? colors.green : colors.red;
  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: 24,
        background: '#ffffff',
        color: '#0b1220',
        borderRadius: 12,
        overflow: 'hidden',
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
        boxShadow: '0 10px 30px #0008',
      }}
    >
      <div style={{background: accent, color: '#0b1220', fontWeight: 800, fontSize: 16, letterSpacing: 1.5, padding: '6px 16px'}}>{title}</div>
      <div style={{padding: '10px 16px'}}>
        <div style={{fontSize: 23, fontWeight: 700}}>{en}</div>
        <div style={{fontSize: 17, color: '#4a5568'}}>{vi}</div>
      </div>
    </div>
  );
};

export const Problem02: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cardIn = spring({frame, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 15], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const panels = spring({frame: frame - T.cardOut, fps, config: {damping: 200}});
  const zoom = interpolate(frame, [T.panelsIn, T.panelsIn + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const view = lerpView(FULL, ZOOM, zoom);
  const crossHi = interpolate(frame, [T.crossHi, T.crossHi + 10, T.raceStart, T.raceStart + 15], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const traveled = Math.max(0, frame - T.raceStart) * SPEED;
  const callout = spring({frame: frame - T.calloutIn, fps, config: {damping: 200}});
  const legHi = interpolate(frame, [T.calloutIn, T.calloutIn + 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    (0.75 + 0.25 * Math.sin(frame / 5));
  const solved = spring({frame: frame - T.solved, fps, config: {damping: 12}});
  const savedBadge = spring({frame: frame - T.raceEnd - 10, fps, config: {damping: 200}});

  const phase = frame < T.raceStart ? 0 : frame < T.calloutIn ? 1 : frame < T.solved ? 2 : 3;
  const captions = [
    {icon: '◎', en: 'Three ways to change aisle: front, tunnel 1, tunnel 2', vi: 'Ba chỗ sang lối: đầu dãy, hầm 1, hầm 2'},
    {icon: '▶', en: `Same TO · ${PROBLEM02_STOPS.length} put-away stops · both leave door D${PROBLEM02_DOOR}`, vi: `Cùng 1 phiếu TO · ${PROBLEM02_STOPS.length} điểm hạ hàng · cùng xuất phát cửa D${PROBLEM02_DOOR}`},
    {icon: '◎', en: 'Same tunnels – but the current truck then drives back', vi: 'Cùng qua hầm, nhưng xe hiện tại phải chạy ngược lại'},
    {icon: '✓', en: 'Cross aisles used in the driving direction → problem 02 solved', vi: 'Qua lối ngang theo đúng chiều đang đi → vấn đề 02 đã giải quyết'},
  ];
  const capFade = (start: number) => interpolate(frame, [start, start + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const capStart = [T.panelsIn, T.raceStart, T.calloutIn, T.solved][phase];

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily, color: colors.text}}>
      <div style={{position: 'absolute', top: 24, left: 0, right: 0}}>
        <ProblemTabs active={2} solved={[1]} activeSolved={solved} />
      </div>

      {/* Intro card */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: cardOut}}>
        <div style={{opacity: cardIn, transform: `scale(${0.92 + 0.08 * cardIn})`, textAlign: 'center'}}>
          <div style={{display: 'inline-block', background: '#fff', color: '#0b1220', fontWeight: 800, fontSize: 22, letterSpacing: 3, padding: '6px 22px', borderRadius: 30, marginBottom: 24}}>
            PROBLEM 02 · VẤN ĐỀ 02
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 36, border: '3px solid #fff', borderRadius: 28, padding: '40px 64px', background: '#0d1626', boxShadow: '0 0 60px #ffffff22'}}>
            <div style={{fontSize: 120, fontWeight: 800}}>02</div>
            <div style={{textAlign: 'left'}}>
              <div style={{fontSize: 60, fontWeight: 800}}>Cross aisles not optimally utilized</div>
              <div style={{fontSize: 40, color: colors.muted}}>Lối đi ngang chưa được sử dụng tối ưu</div>
            </div>
          </div>
          <div style={{marginTop: 36, fontSize: 32, fontWeight: 700}}>After changing aisle, the truck drives back to the lowest bin</div>
          <div style={{fontSize: 24, color: colors.muted}}>Sang lối mới xong, xe phải chạy ngược về BIN nhỏ nhất của dãy</div>
        </div>
      </AbsoluteFill>

      {/* Race */}
      <div style={{position: 'absolute', top: 124, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <div style={{position: 'relative'}}>
          <RoutePanel kind="algo" stops={algo} doorId={PROBLEM02_DOOR} traveled={traveled} view={view} width={PANEL_W} mapHeight={MAP_H}
            highlightCross={crossHi} highlightLegs={legsBetweenLanes67and78(algo)} highlight={legHi} />
          <Callout kind="algo" p={callout} title="ALGORITHM · THUẬT TOÁN"
            en="Crosses at tunnel 2, keeps going: VT 70 → 36 → tunnel 1"
            vi="Qua hầm 2 rồi đi tiếp cùng chiều: VT 70 → 36 → hầm 1" />
        </div>
        <div style={{position: 'absolute', left: '50%', top: 34, transform: 'translateX(-50%)', width: 64, height: 64, borderRadius: 32, background: colors.bg, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, zIndex: 2}}>
          VS
        </div>
        <div style={{position: 'relative'}}>
          <RoutePanel kind="current" stops={current} doorId={PROBLEM02_DOOR} traveled={traveled} view={view} width={PANEL_W} mapHeight={MAP_H}
            highlightCross={crossHi} highlightLegs={legsBetweenLanes67and78(current)} highlight={legHi} />
          <Callout kind="current" p={callout} title="CURRENT · HIỆN TẠI"
            en="Crosses at tunnel 2, drives back to VT 36, then forward again"
            vi="Qua hầm 2, chạy ngược về VT 36 rồi lại chạy lên" />
        </div>
      </div>

      {/* Saved badge */}
      <div style={{position: 'absolute', right: 48, bottom: 36, opacity: savedBadge, transform: `scale(${0.8 + 0.2 * savedBadge})`, background: '#0f2a22', border: `2px solid ${colors.green}`, borderRadius: 12, padding: '10px 22px', textAlign: 'right'}}>
        <div style={{fontSize: 40, fontWeight: 800, color: colors.green}}>
          −{Math.round(saved)} m · −{((saved / lenCurrent) * 100).toFixed(1)}%
        </div>
        <div style={{fontSize: 18, color: colors.muted}}>Saved on this TO · Tiết kiệm trên phiếu này</div>
      </div>

      {/* Caption bar */}
      <div style={{position: 'absolute', left: 48, bottom: 36, opacity: panels}}>
        <Caption {...captions[phase]} opacity={capFade(capStart)} />
      </div>
    </AbsoluteFill>
  );
};
