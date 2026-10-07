import {LAYOUT} from '../layout';
import {colors} from '../theme';

export type CaptionIcon = 'play' | 'target' | 'check' | string;

const Icon: React.FC<{icon: CaptionIcon}> = ({icon}) => {
  if (icon === 'play') {
    return (
      <svg width={46} height={52} viewBox="0 0 46 52">
        <path d="M4 3 L43 26 L4 49 Z" fill={colors.yellow} />
      </svg>
    );
  }
  if (icon === 'target') {
    return (
      <svg width={46} height={46} viewBox="0 0 46 46">
        <circle cx={23} cy={23} r={19} fill="none" stroke={colors.yellow} strokeWidth={4} />
        <circle cx={23} cy={23} r={8} fill={colors.yellow} />
      </svg>
    );
  }
  if (icon === 'check') {
    return (
      <svg width={50} height={46} viewBox="0 0 50 46">
        <path d="M5 25 L19 40 L45 6" fill="none" stroke={colors.yellow} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <div style={{fontSize: 56, fontWeight: 800, color: colors.yellow}}>{icon}</div>;
};

export const CaptionBar: React.FC<{icon: CaptionIcon; en: string; vi: string; opacity?: number}> = ({icon, en, vi, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: LAYOUT.caption.x,
      top: LAYOUT.caption.y,
      width: LAYOUT.caption.w,
      height: LAYOUT.caption.h,
      boxSizing: 'border-box',
      background: colors.panel,
      border: `1px solid ${colors.line}`,
      borderRadius: 18,
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <div style={{width: 156, display: 'flex', justifyContent: 'center', opacity}}>
      <Icon icon={icon} />
    </div>
    <div style={{opacity}}>
      <div style={{fontSize: 42, fontWeight: 700, lineHeight: 1.2}}>{en}</div>
      <div style={{fontSize: 28, color: colors.muted}}>{vi}</div>
    </div>
  </div>
);
