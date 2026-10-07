import {LAYOUT} from '../layout';
import {colors} from '../theme';

export const PROBLEMS = [
  {en: 'Nearby bins not grouped', vi: 'Không gom vị trí gần nhau'},
  {en: 'Cross aisles not optimally used', vi: 'Lối ngang chưa được sử dụng tối ưu'},
  {en: 'Scattered items', vi: 'Hàng rải rác nhiều dãy'},
  {en: 'Morning congestion', vi: 'Ùn tắc dãy đầu buổi sáng'},
];

export type TabState = 'idle' | 'solving' | 'solved';

const Chip: React.FC<{text: string; dark: boolean}> = ({text, dark}) => (
  <div
    style={{
      position: 'absolute',
      left: 20,
      top: -13,
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: 1,
      background: dark ? '#0b1222' : '#ffffff',
      color: dark ? '#ffffff' : '#0b1222',
    }}
  >
    {text}
  </div>
);

/** Problem tab bar. `glow` (0–1) lights the solving tab; `hidden` hides a tab (while its card is shown). */
export const ProblemTabs: React.FC<{states: TabState[]; glow?: number; hidden?: number; checkScale?: number}> = ({
  states,
  glow = 0,
  hidden,
  checkScale = 1,
}) => (
  <>
    {PROBLEMS.map((p, i) => {
      const st = states[i];
      const solved = st === 'solved';
      const solving = st === 'solving';
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: LAYOUT.tabs.xs[i],
            top: LAYOUT.tabs.y,
            width: LAYOUT.tabs.w,
            height: LAYOUT.tabs.h,
            boxSizing: 'border-box',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '0 24px',
            background: solved ? '#eef1f7' : solving ? '#0a1020' : '#0a101e',
            border: `2px solid ${solved || solving ? '#ffffff' : '#141c2e'}`,
            boxShadow: solving ? `0 0 ${40 * glow}px rgba(255,255,255,${0.45 * glow})` : solved ? '0 0 24px rgba(255,255,255,0.15)' : 'none',
            opacity: hidden === i ? 0 : 1,
          }}
        >
          {solved ? <Chip text="SOLVED · ĐÃ GIẢI QUYẾT" dark /> : solving ? <Chip text="SOLVING · ĐANG GIẢI QUYẾT" dark={false} /> : null}
          <div style={{fontSize: 42, fontWeight: 800, color: solved ? '#0b1222' : solving ? '#ffffff' : '#27314a'}}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <div>
            <div style={{fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: solved ? '#0b1222' : solving ? '#ffffff' : '#4f5a75'}}>{p.en}</div>
            <div style={{fontSize: 17, color: solved ? '#4a5470' : solving ? '#b8c2d8' : '#3b4560'}}>{p.vi}</div>
          </div>
          {solved ? (
            <div
              style={{
                position: 'absolute',
                right: -12,
                top: -14,
                width: 46,
                height: 46,
                borderRadius: 23,
                background: '#0b1222',
                border: '3px solid #ffffff',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 800,
                transform: `scale(${checkScale})`,
              }}
            >
              ✓
            </div>
          ) : null}
        </div>
      );
    })}
  </>
);
