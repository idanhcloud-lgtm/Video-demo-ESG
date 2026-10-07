import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {ProblemTabs} from '../components/ProblemTabs';
import {Callout, RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {LAYOUT} from '../layout';
import {aisleOrder} from '../map/route';
import {colors, fontFamily} from '../theme';

// Timeline (frames @30fps), same beats as problem 01 in video part 1.
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  zoomIn: 215,
  trace: 255,
  callout: 330,
  zoomOut: 500,
  solved: 540,
  end: 630,
};
export const PROBLEM02_DURATION = T.end;

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;

// Lanes 3–5. Legs are 1-based: leg i goes from stop i to stop i+1.
// Current: 5 (lane 3, VT 70) → 6 (VT 20) → front → 7 (lane 4, VT 12) → 8 (VT 62).
const CURRENT_LEGS = [5, 6, 7];
// Algorithm: 5 (lane 3, VT 70) → tunnel 2 → 6 (lane 5, VT 98); front stops on the way back: 25 → 26 → 27 → 28.
const ALGO_LEGS = [5, 25, 26, 27];

// Camera: zoom 1.45× on lanes 2–6, front to tunnel 2, keeping the focus above the callouts.
const ZOOM = {k: 1.45, tx: -1.45 * 60, ty: 240 - 1.45 * 500};

const Hl: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => <span style={{color: c}}>{children}</span>;

export const Problem02: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  const glow = interpolate(frame, [T.glow, T.glow + 15], [0, 1], clamp);
  const cardIn = spring({frame: frame - T.cardIn, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 20], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const panels = spring({frame: frame - T.panelsIn, fps, config: {damping: 200}});
  const zoom =
    interpolate(frame, [T.zoomIn, T.zoomIn + 35], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) -
    interpolate(frame, [T.zoomOut, T.zoomOut + 35], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const camera = {k: 1 + (ZOOM.k - 1) * zoom, tx: ZOOM.tx * zoom, ty: ZOOM.ty * zoom};
  const traceCur = interpolate(frame, [T.trace, T.callout - 10], [0, CURRENT_LEGS.length], clamp);
  const traceAlgo = interpolate(frame, [T.trace, T.callout - 10], [0, ALGO_LEGS.length], clamp);
  const callout = spring({frame: frame - T.callout, fps, config: {damping: 200}}) * interpolate(frame, [T.zoomOut - 10, T.zoomOut + 5], [1, 0], clamp);
  const hideOthers = interpolate(frame, [T.zoomOut, T.zoomOut + 30], [0, 1], clamp);
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const caption =
    frame < T.solved
      ? {icon: '02', en: 'Back to the front to change aisle — then deep again', vi: 'Chạy về đầu dãy để đổi lối, rồi lại vào sâu'}
      : {icon: 'check', en: 'Aisle changed at the cross aisle on the way → problem 02 solved', vi: 'Đổi lối ngay tại lối ngang trên đường đi → vấn đề 02 đã giải quyết'};
  const capStart = frame < T.solved ? T.panelsIn : T.solved;
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  // Problem card: centred, then shrinks into the tab slot.
  const slot = {x: LAYOUT.tabs.xs[1] + LAYOUT.tabs.w / 2, y: LAYOUT.tabs.y + LAYOUT.tabs.h / 2};
  const cardX = interpolate(cardOut, [0, 1], [960, slot.x]);
  const cardY = interpolate(cardOut, [0, 1], [400, slot.y]);
  const cardScale = interpolate(cardOut, [0, 1], [1, 0.33]) * (0.9 + 0.1 * cardIn);
  const cardOpacity = cardIn * interpolate(cardOut, [0.6, 1], [1, 0], clamp);

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs
        states={['solved', solved ? 'solved' : 'solving', 'idle', 'idle']}
        glow={glow}
        hidden={frame >= T.cardIn && frame < T.cardOut + 15 ? 1 : undefined}
        checkScale={solved ? check : 1}
      />

      {/* Problem card */}
      <div
        style={{
          position: 'absolute',
          left: cardX,
          top: cardY,
          transform: `translate(-50%, -50%) scale(${cardScale})`,
          opacity: cardOpacity,
          textAlign: 'center',
          width: 1760,
        }}
      >
        <div style={{display: 'inline-block', background: '#fff', color: '#0b1222', fontWeight: 700, fontSize: 26, letterSpacing: 3, padding: '8px 26px', borderRadius: 30, marginBottom: -22, position: 'relative', zIndex: 2}}>
          PROBLEM 02 · VẤN ĐỀ 02
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 40, border: '4px solid #fff', borderRadius: 34, padding: '56px 70px', margin: '0 180px', background: '#0a1020', boxShadow: '0 0 70px rgba(255,255,255,0.25)', textAlign: 'left'}}>
          <div style={{fontSize: 130, fontWeight: 800}}>02</div>
          <div>
            <div style={{fontSize: 66, fontWeight: 700, lineHeight: 1.15}}>Cross aisles not optimally used</div>
            <div style={{fontSize: 44, color: colors.muted}}>Lối đi ngang chưa được sử dụng tối ưu</div>
          </div>
        </div>
        <div style={{marginTop: 50, fontSize: 34, fontWeight: 700, opacity: 1 - cardOut}}>The printed order decides where the truck changes aisle, not the nearest cross aisle</div>
        <div style={{fontSize: 26, color: colors.muted, opacity: 1 - cardOut}}>Thứ tự in trên phiếu quyết định chỗ đổi lối, không phải lối ngang gần nhất</div>
      </div>

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <RoutePanel kind="algo" stops={algo} doorId={TO28_DOOR} traveled={Infinity} camera={camera} focusLegs={ALGO_LEGS} focusProgress={traceAlgo} hideOthers={hideOthers}>
          <Callout
            kind="algo"
            p={callout}
            en={<>Changes aisle at <Hl c="#0a8f5a">tunnel 2</Hl> right where it is; front stops on the way back</>}
            vi="Đổi lối ngay ở hầm 2; các điểm đầu dãy lấy trên đường về"
          />
        </RoutePanel>
        <RoutePanel kind="current" stops={current} doorId={TO28_DOOR} traveled={Infinity} camera={camera} focusLegs={CURRENT_LEGS} focusProgress={traceCur} hideOthers={hideOthers}>
          <Callout
            kind="current"
            p={callout}
            en={<>#5 VT 70 → back to the <Hl c="#d23c3a">front</Hl> to change aisle → deep again to #8</>}
            vi="Từ #5 (VT 70) chạy về đầu dãy để đổi lối, rồi lại vào sâu tới #8"
          />
        </RoutePanel>
        <VsBadge />
        <CaptionBar icon={caption.icon} en={caption.en} vi={caption.vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
