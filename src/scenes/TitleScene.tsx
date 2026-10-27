import {AbsoluteFill, interpolate, spring} from 'remotion';
import {useTimelineFrame} from '../timeline';
import {useViFirst} from '../lang';
import {TIMELINE_FPS, colors, fontFamily} from '../theme';

const stats = [
  {value: '30,900 m²', en: 'B2C warehouse', vi: 'Diện tích kho B2C'},
  {value: '35', en: 'Rack rows', vi: 'Dãy kệ'},
  {value: '36,849', en: 'Storage bins', vi: 'Vị trí lưu kho'},
  {value: '26', en: 'Forklifts', vi: 'Xe nâng'},
];

/** topGap: room above the title (the brand logos sit there in the branded cut). */
export const TitleScene: React.FC<{noStats?: boolean; topGap?: number}> = ({noStats = false, topGap = 0}) => {
  const vi = useViFirst();
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const intro = spring({frame, fps, config: {damping: 200}});

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        fontFamily,
        color: colors.text,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        paddingTop: topGap,
      }}
    >
      <div
        style={{
          background: colors.yellow,
          color: '#111',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 2,
          padding: '6px 16px',
          borderRadius: 6,
          opacity: intro,
        }}
      >
        DTLA WAREHOUSE TEAM · INNOVATION PROJECT
      </div>
      <div
        style={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 84,
          lineHeight: 1.1,
          opacity: intro,
          transform: `translateY(${interpolate(intro, [0, 1], [40, 0])}px)`,
        }}
      >
        {vi ? 'Tối ưu lộ trình xe Reach Truck' : 'Algorithm-Based Route Optimization'}
        <div style={{color: colors.green}}>{vi ? 'bằng thuật toán' : 'for Reach Trucks'}</div>
      </div>
      <div style={{fontSize: 30, color: colors.muted, opacity: intro}}>
        {vi ? 'Algorithm-Based Route Optimization for Reach Trucks' : 'Tối ưu lộ trình xe Reach Truck bằng thuật toán'}
      </div>
      <div style={{display: noStats ? 'none' : 'block', marginTop: 24, fontSize: 24, fontWeight: 800, letterSpacing: 3, color: colors.green, opacity: intro}}>
        {vi ? 'KHO B2C – DTLA' : 'B2C WAREHOUSE – DTLA'}
        <span style={{fontSize: 20, fontWeight: 600, color: colors.muted, letterSpacing: 2}}> · {vi ? 'B2C WAREHOUSE – DTLA' : 'KHO B2C – DTLA'}</span>
      </div>
      <div style={{display: noStats ? 'none' : 'flex', gap: 20, marginTop: -12}}>
        {stats.map((s, i) => {
          const p = spring({frame: frame - 20 - i * 6, fps, config: {damping: 200}});
          return (
            <div
              key={s.en}
              style={{
                width: 360,
                padding: '24px 0',
                textAlign: 'center',
                background: colors.panel,
                border: '1px solid #1f2a40',
                borderRadius: 12,
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
              }}
            >
              <div style={{fontSize: 48, fontWeight: 800}}>{s.value}</div>
              <div style={{fontSize: 22, fontWeight: 600}}>{vi ? s.vi : s.en}</div>
              <div style={{fontSize: 18, color: colors.muted}}>{vi ? s.en : s.vi}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
