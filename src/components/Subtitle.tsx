import {colors, fontFamily} from '../theme';

/** Bilingual subtitle in the strip reserved at the bottom of the frame (below the map panels). */
export const Subtitle: React.FC<{vi: string; en: string; opacity?: number}> = ({vi, en, opacity = 1}) => (
  <div style={{position: 'absolute', left: 120, right: 120, top: 922, textAlign: 'center', opacity, fontFamily}}>
    <div
      style={{
        display: 'inline-block',
        background: 'rgba(0, 0, 0, 0.62)',
        borderRadius: 10,
        padding: '8px 22px 10px',
      }}
    >
      <div style={{fontSize: 34, fontWeight: 600, lineHeight: 1.25, color: '#ffffff'}}>{vi}</div>
      <div style={{fontSize: 24, lineHeight: 1.25, color: colors.muted}}>{en}</div>
    </div>
  </div>
);
