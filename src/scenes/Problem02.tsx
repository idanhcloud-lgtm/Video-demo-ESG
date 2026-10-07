import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel} from '../components/RoutePanel';
import {Viewport} from '../components/WarehouseMap';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {aisleOrder, routeLength} from '../map/route';
import {colors, fontFamily} from '../theme';

// Timeline (frames @30fps)
const T = {
  cardOut: 130,
  crossHi: 190,
  zoom: 280,
  focus: 330,
  solved: 560,
  end: 650,
};
export const PROBLEM02_DURATION = T.end;

const PANEL_W = 900;
const MAP_H = 610;
// Viewports keep the panel aspect (900 × 610) so nothing is cropped unexpectedly.
const FULL: Viewport = {x0: -48, x1: 190, y0: -9, y1: -9 + 238 * (MAP_H / PANEL_W)};
const ZOOM: Viewport = {x0: -20, x1: 152, y0: -9, y1: -9 + 172 * (MAP_H / PANEL_W)};

const lerpView = (a: Viewport, b: Viewport, t: number): Viewport => ({
  x0: a.x0 + (b.x0 - a.x0) * t,
  x1: a.x1 + (b.x1 - a.x1) * t,
  y0: a.y0 + (b.y0 - a.y0) * t,
  y1: a.y1 + (b.y1 - a.y1) * t,
});

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const lenCurrent = routeLength(current, TO28_DOOR);
const lenAlgo = routeLength(algo, TO28_DOOR);

// Lanes 3–5. Legs are 1-based: leg i goes from stop i to stop i+1.
// Current: stop 5 (lane 3, VT 70) → 6 (VT 20) → front → 7 (lane 4, VT 12) → 8 (VT 62) → tunnel 1 → 9 → 10 (lane 5, VT 98).
const CURRENT_LEGS = [5, 6, 7, 8, 9];
// Algorithm: stop 5 → tunnel 2 → 6 (lane 5, VT 98); the front stops come last on the way back: 25 → 26 → 27 → 28.
const ALGO_LEGS = [5, 25, 26, 27];

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
        top: 116,
        background: '#ffffff',
        color: '#0b1220',
        borderRadius: 12,
        overflow: 'hidden',
        opacity: p,
        transform: `translateY(${(1 - p) * -20}px)`,
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
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  const cardIn = spring({frame, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 15], [1, 0], clamp);
  const panels = spring({frame: frame - T.cardOut, fps, config: {damping: 200}});
  const zoom = interpolate(frame, [T.zoom, T.zoom + 40], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const view = lerpView(FULL, ZOOM, zoom);
  const crossHi = interpolate(frame, [T.crossHi, T.crossHi + 12, T.zoom + 20, T.zoom + 40], [0, 1, 1, 0.35], clamp);
  const dim = interpolate(frame, [T.focus, T.focus + 15], [0, 1], clamp);
  const legHi = dim * (0.75 + 0.25 * Math.sin(frame / 5));
  const callout = spring({frame: frame - T.focus - 20, fps, config: {damping: 200}});
  const solved = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.crossHi ? 0 : frame < T.focus ? 1 : frame < T.solved ? 2 : 3;
  const captions = [
    {icon: '▶', en: 'Same transfer order · 28 put-away stops', vi: 'Cùng 1 phiếu TO · 28 điểm hạ hàng'},
    {icon: '◎', en: 'Four places to change aisle: front, tunnel 1, tunnel 2, row end', vi: 'Bốn chỗ sang lối: đầu dãy, hầm 1, hầm 2, cuối dãy'},
    {icon: '◎', en: 'Current truck goes deep, back to the front, then deep again', vi: 'Xe hiện tại vào sâu, ra đầu dãy, rồi lại vào sâu'},
    {icon: '✓', en: 'Each cross aisle used where it is on the way → problem 02 solved', vi: 'Dùng lối ngang nằm trên đường đi → vấn đề 02 đã giải quyết'},
  ];
  const capStart = [T.cardOut, T.crossHi, T.focus, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  const panelProps = {doorId: TO28_DOOR, view, width: PANEL_W, mapHeight: MAP_H, highlightCross: crossHi, highlight: legHi, dim, showFinished: false};

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
          <div style={{marginTop: 36, fontSize: 32, fontWeight: 700}}>The truck changes aisle where the printed order says, not where it is</div>
          <div style={{fontSize: 24, color: colors.muted}}>Xe sang lối theo thứ tự in trên phiếu, không theo vị trí đang đứng</div>
        </div>
      </AbsoluteFill>

      {/* Panels */}
      <div style={{position: 'absolute', top: 124, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <div style={{position: 'relative'}}>
          <RoutePanel kind="algo" stops={algo} traveled={lenAlgo + 100} highlightLegs={ALGO_LEGS} {...panelProps} />
          <Callout kind="algo" p={callout} title="ALGORITHM · THUẬT TOÁN"
            en="Deep stops linked through tunnel 2; front stops on the way back"
            vi="Điểm sâu nối qua hầm 2; điểm gần cửa lấy trên đường về" />
        </div>
        <div style={{position: 'absolute', left: '50%', top: 34, transform: 'translateX(-50%)', width: 64, height: 64, borderRadius: 32, background: colors.bg, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, zIndex: 2}}>
          VS
        </div>
        <div style={{position: 'relative'}}>
          <RoutePanel kind="current" stops={current} traveled={lenCurrent + 100} highlightLegs={CURRENT_LEGS} {...panelProps} />
          <Callout kind="current" p={callout} title="CURRENT · HIỆN TẠI"
            en="Lane 3 → front → lane 4 → tunnel 1 → lane 5: deep, front, deep"
            vi="Dãy 3 → đầu dãy → dãy 4 → hầm 1 → dãy 5: vào sâu, ra đầu, lại vào sâu" />
        </div>
      </div>

      {/* Caption bar */}
      <div style={{position: 'absolute', left: 48, bottom: 36, opacity: panels}}>
        <Caption {...captions[phase]} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
