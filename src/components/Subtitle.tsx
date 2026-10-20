import {colors, fontFamily} from '../theme';

/** Bilingual subtitle in the strip reserved at the bottom of the frame (below the map panels). */
/** enFirst: English is the main (large) line, Vietnamese the small one. */
export const Subtitle: React.FC<{vi: string; en: string; opacity?: number; enFirst?: boolean}> = ({vi, en, opacity = 1, enFirst = false}) => (
  <div style={{position: 'absolute', left: 120, right: 120, top: 922, textAlign: 'center', opacity, fontFamily, zIndex: 20}}>
    <div
      style={{
        display: 'inline-block',
        background: 'rgba(0, 0, 0, 0.62)',
        borderRadius: 10,
        padding: '8px 22px 10px',
      }}
    >
      <div style={{fontSize: 34, fontWeight: 600, lineHeight: 1.25, color: '#ffffff'}}>{enFirst ? en : vi}</div>
      <div style={{fontSize: 28, lineHeight: 1.25, color: '#c9d1e3'}}>{enFirst ? vi : en}</div>
    </div>
  </div>
);
