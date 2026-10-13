import {AbsoluteFill, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

/** Closing card (voice V5): project title, then "next: 1-month simulation results". Beats in 30-per-second units. */
const T0 = {next: 160, end: 360};
export type EndCardBeats = Partial<typeof T0>;
export const END_CARD_DURATION = toFrames(T0.end);

export const EndCard: React.FC<{beats?: EndCardBeats}> = ({beats}) => {
  const T = {...T0, ...beats};
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const intro = spring({frame, fps, config: {damping: 200}});
  const next = spring({frame: frame - T.next, fps, config: {damping: 200}});
  const out = interpolate(frame, [T.end - 30, T.end], [1, 0], clamp);
  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 28, opacity: out}}>
        <div style={{background: colors.yellow, color: '#111', fontWeight: 700, fontSize: 22, letterSpacing: 2, padding: '6px 16px', borderRadius: 6, opacity: intro}}>
          DTLA WAREHOUSE TEAM · INNOVATION PROJECT
        </div>
        <div style={{textAlign: 'center', fontWeight: 800, fontSize: 76, lineHeight: 1.1, opacity: intro, transform: `translateY(${(1 - intro) * 30}px)`}}>
          Algorithm-Based Route Optimization
          <div style={{color: colors.green}}>for Reach Trucks</div>
        </div>
        <div style={{fontSize: 30, color: colors.muted, opacity: intro}}>Tối ưu lộ trình xe Reach Truck bằng thuật toán</div>
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '20px 40px',
            borderRadius: 20,
            border: `3px solid ${colors.green}`,
            background: colors.panel,
            opacity: next,
            transform: `translateY(${(1 - next) * 30}px)`,
          }}
        >
          <div style={{background: colors.green, color: '#062016', fontWeight: 800, fontSize: 22, letterSpacing: 2, padding: '8px 16px', borderRadius: 10}}>TIẾP THEO · NEXT</div>
          <div>
            <div style={{fontSize: 38, fontWeight: 800}}>Kết quả mô phỏng các phiếu TO trong 1 tháng</div>
            <div style={{fontSize: 24, color: colors.muted}}>Results of simulating one month of TOs</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
