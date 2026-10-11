import {AbsoluteFill, spring} from 'remotion';
import {Background} from '../components/Background';
import {ProblemTabs} from '../components/ProblemTabs';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

const T = {cause: 15, solution: 120, end: 300};
export const CLOSING_SHORT_DURATION = toFrames(T.end);

/** Short ending: all four tabs solved, the common cause, then the solution. */
export const ClosingShort: React.FC = () => {
  const frame = useTimelineFrame();
  const cause = spring({frame: frame - T.cause, fps: TIMELINE_FPS, config: {damping: 200}});
  const sol = spring({frame: frame - T.solution, fps: TIMELINE_FPS, config: {damping: 200}});
  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs states={['solved', 'solved', 'solved', 'solved']} />
      <AbsoluteFill style={{top: 170, alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center', border: '4px solid #ffffff', borderRadius: 30, padding: '44px 72px', background: '#0a1020', boxShadow: '0 0 60px rgba(255,255,255,0.18)'}}>
          <div style={{opacity: cause, transform: `translateY(${(1 - cause) * 20}px)`}}>
            <div style={{fontSize: 28, fontWeight: 700, letterSpacing: 3, color: colors.yellow}}>4 HẠN CHẾ – 1 NGUYÊN NHÂN</div>
            <div style={{fontSize: 60, fontWeight: 800, marginTop: 12}}>Phiếu in theo thứ tự A → T cố định</div>
            <div style={{fontSize: 32, color: colors.muted, marginTop: 6}}>4 limitations – 1 cause: the fixed A → T print order</div>
          </div>
          <div style={{height: 2, background: '#ffffff33', margin: '30px 0', opacity: sol}} />
          <div style={{opacity: sol, transform: `translateY(${(1 - sol) * 20}px)`}}>
            <div style={{fontSize: 46, fontWeight: 800, color: colors.green}}>Giải pháp: sắp lại lộ trình theo vị trí hàng</div>
            <div style={{fontSize: 28, color: colors.muted, marginTop: 6}}>Solution: re-sequence each TO by item location</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
