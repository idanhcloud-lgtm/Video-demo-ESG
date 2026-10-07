import {interpolate} from 'remotion';
import {LAYOUT} from '../layout';
import {colors} from '../theme';

/** Centred problem card that shrinks into its tab slot (`out` 0 → 1). */
export const ProblemCard: React.FC<{n: number; en: string; vi: string; descEn: string; descVi: string; enter: number; out: number}> = ({
  n,
  en,
  vi,
  descEn,
  descVi,
  enter,
  out,
}) => {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const num = String(n).padStart(2, '0');
  const slot = {x: LAYOUT.tabs.xs[n - 1] + LAYOUT.tabs.w / 2, y: LAYOUT.tabs.y + LAYOUT.tabs.h / 2};
  const x = interpolate(out, [0, 1], [960, slot.x]);
  const y = interpolate(out, [0, 1], [400, slot.y]);
  const scale = interpolate(out, [0, 1], [1, 0.33]) * (0.9 + 0.1 * enter);
  const opacity = enter * interpolate(out, [0.6, 1], [1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})`, opacity, textAlign: 'center', width: 1760}}>
      <div style={{display: 'inline-block', background: '#fff', color: '#0b1222', fontWeight: 700, fontSize: 26, letterSpacing: 3, padding: '8px 26px', borderRadius: 30, marginBottom: -22, position: 'relative', zIndex: 2}}>
        PROBLEM {num} · VẤN ĐỀ {num}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 40, border: '4px solid #fff', borderRadius: 34, padding: '56px 70px', margin: '0 180px', background: '#0a1020', boxShadow: '0 0 70px rgba(255,255,255,0.25)', textAlign: 'left'}}>
        <div style={{fontSize: 130, fontWeight: 800}}>{num}</div>
        <div>
          <div style={{fontSize: 66, fontWeight: 700, lineHeight: 1.15}}>{en}</div>
          <div style={{fontSize: 44, color: colors.muted}}>{vi}</div>
        </div>
      </div>
      <div style={{marginTop: 50, fontSize: 34, fontWeight: 700, opacity: 1 - out}}>{descEn}</div>
      <div style={{fontSize: 26, color: colors.muted, opacity: 1 - out}}>{descVi}</div>
    </div>
  );
};
