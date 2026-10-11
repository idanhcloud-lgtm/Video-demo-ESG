import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {PROBLEMS, ProblemTabs} from '../components/ProblemTabs';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second). Slow pace: one problem every 5 s, then a long hold.
const T = {
  title: 20,
  rows: [100, 250, 400, 550],
  closing: 720,
  end: 990,
};
export const SUMMARY_DURATION = toFrames(T.end);

const ROWS = [
  {
    curEn: 'Nearby bins in different aisles are picked far apart',
    curVi: 'Điểm gần nhau nhưng khác dãy bị tách xa trên phiếu',
    algoEn: 'Nearby bins picked in the same pass',
    algoVi: 'Gom các điểm gần nhau vào cùng một lượt',
  },
  {
    curEn: 'Drives back to the front to change aisle',
    curVi: 'Chạy về đầu dãy để đổi lối',
    algoEn: 'Changes aisle at the cross aisle on the way',
    algoVi: 'Đổi lối ngay ở lối ngang trên đường đi',
  },
  {
    curEn: 'Items spread over many aisles – a lot of wasted travel',
    curVi: 'Hàng rải nhiều dãy – xe chạy thừa rất nhiều',
    algoEn: 'Optimized route cuts the wasted travel',
    algoVi: 'Lộ trình tối ưu cắt bỏ quãng đường lãng phí',
  },
  {
    curEn: 'Every TO starts in aisles A, B – trucks get stuck',
    curVi: 'Các TO đều bắt đầu từ dãy A, B – xe kẹt',
    algoEn: 'Trucks turn off at the cross aisles – less congestion',
    algoVi: 'Xe rẽ qua lối ngang – giảm ùn tắc dãy A, B',
  },
];

const ROW_TOP = 300;
const ROW_H = 140;
const ROW_GAP = 10;

const Pill: React.FC<{kind: 'algo' | 'current'; en: string; vi: string; p: number}> = ({kind, en, vi, p}) => {
  const accent = kind === 'algo' ? colors.green : colors.red;
  return (
    <div
      style={{
        flex: 1,
        height: ROW_H - 24,
        boxSizing: 'border-box',
        borderRadius: 14,
        border: `2px solid ${accent}`,
        background: kind === 'algo' ? 'rgba(52, 227, 158, 0.10)' : 'rgba(242, 95, 92, 0.10)',
        padding: '12px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        opacity: p,
        transform: `translateX(${(1 - p) * (kind === 'algo' ? 40 : -40)}px)`,
      }}
    >
      <div style={{fontSize: 15, fontWeight: 700, letterSpacing: 2.5, color: accent}}>{kind === 'algo' ? 'ALGORITHM · THUẬT TOÁN' : 'CURRENT · HIỆN TẠI'}</div>
      <div style={{fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 4}}>{vi}</div>
      <div style={{fontSize: 18, color: colors.muted}}>{en}</div>
    </div>
  );
};

export const Summary: React.FC = () => {
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  const title = spring({frame: frame - T.title, fps, config: {damping: 200}});
  const closing = spring({frame: frame - T.closing, fps, config: {damping: 200}});
  const active = T.rows.reduce((a, t, i) => (frame >= t ? i : a), -1);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);

  const caption =
    frame < T.closing
      ? {icon: active >= 0 ? String(active + 1).padStart(2, '0') : '✓', en: 'Summary of the 4 limitations', vi: 'Tổng kết 4 hạn chế của quy trình hiện tại'}
      : {icon: 'check', en: '4 limitations – 1 cause: the fixed A → T print order', vi: '4 hạn chế – 1 nguyên nhân: phiếu in theo thứ tự A → T cố định'};
  const capStart = frame < T.closing ? T.title : T.closing;
  const capOpacity = interpolate(frame, [capStart, capStart + 15], [0, 1], clamp);

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs states={['solved', 'solved', 'solved', 'solved']} />

      {/* title */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 182, textAlign: 'center', opacity: title, transform: `translateY(${(1 - title) * 20}px)`}}>
        <div style={{display: 'inline-block', background: '#ffffff', color: '#0b1222', fontWeight: 700, fontSize: 24, letterSpacing: 3, padding: '7px 26px', borderRadius: 30}}>
          SUMMARY · TỔNG KẾT
        </div>
        <div style={{fontSize: 40, fontWeight: 800, marginTop: 14}}>4 limitations of the current process · 4 hạn chế của quy trình hiện tại</div>
      </div>

      {/* rows */}
      {ROWS.map((r, i) => {
        const p = spring({frame: frame - T.rows[i], fps, config: {damping: 200, mass: 1.4}});
        const pCur = spring({frame: frame - T.rows[i] - 20, fps, config: {damping: 200, mass: 1.4}});
        const pArrow = interpolate(frame, [T.rows[i] + 55, T.rows[i] + 75], [0, 1], clamp);
        const pAlgo = spring({frame: frame - T.rows[i] - 70, fps, config: {damping: 200, mass: 1.4}});
        const isActive = i === active && frame < T.closing;
        const dimmed = active > i && frame < T.closing ? 0.55 : 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: ROW_TOP + i * (ROW_H + ROW_GAP),
              height: ROW_H,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              padding: '0 22px',
              borderRadius: 18,
              background: colors.panel,
              border: `2px solid ${isActive ? `rgba(255,255,255,${0.5 + 0.5 * pulse})` : colors.line}`,
              boxShadow: isActive ? '0 0 30px rgba(255,255,255,0.18)' : 'none',
              opacity: p * dimmed,
              transform: `translateY(${(1 - p) * 30}px)`,
            }}
          >
            <div style={{width: 470, display: 'flex', alignItems: 'center', gap: 18}}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  background: '#ffffff',
                  color: '#0b1222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <div style={{fontSize: 24, fontWeight: 700, lineHeight: 1.2}}>{PROBLEMS[i].vi}</div>
                <div style={{fontSize: 18, color: colors.muted}}>{PROBLEMS[i].en}</div>
              </div>
            </div>
            <Pill kind="current" en={r.curEn} vi={r.curVi} p={pCur} />
            <svg width={56} height={40} viewBox="0 0 56 40" style={{opacity: pArrow, flexShrink: 0}}>
              <path d="M4 20 H44 M32 8 L48 20 L32 32" fill="none" stroke={colors.yellow} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Pill kind="algo" en={r.algoEn} vi={r.algoVi} p={pAlgo} />
          </div>
        );
      })}

      {/* backdrop behind the closing banner */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, height: 740, background: 'rgba(6, 10, 22, 0.82)', opacity: closing}} />

      {/* closing banner */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 170,
          height: 740,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: closing,
          transform: `scale(${0.92 + 0.08 * closing})`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#0a1020',
            border: '4px solid #ffffff',
            borderRadius: 30,
            padding: '36px 64px',
            textAlign: 'center',
            boxShadow: '0 0 80px rgba(0,0,0,0.9), 0 0 60px rgba(255,255,255,0.18)',
          }}
        >
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: 3, color: colors.yellow}}>4 HẠN CHẾ – 1 NGUYÊN NHÂN</div>
          <div style={{fontSize: 52, fontWeight: 800, marginTop: 10}}>Phiếu in theo thứ tự A → T cố định</div>
          <div style={{fontSize: 30, color: colors.muted, marginTop: 6}}>The fixed A → T print order</div>
          <div style={{height: 2, background: '#ffffff33', margin: '24px 0'}} />
          <div style={{fontSize: 40, fontWeight: 800, color: colors.green}}>Giải pháp: sắp lại lộ trình theo vị trí hàng</div>
          <div style={{fontSize: 26, color: colors.muted, marginTop: 6}}>Solution: re-sequence each TO by item location</div>
        </div>
      </div>

      <div style={{opacity: interpolate(frame, [T.title, T.title + 15], [0, 1], clamp)}}>
        <CaptionBar icon={caption.icon} en={caption.en} vi={caption.vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
