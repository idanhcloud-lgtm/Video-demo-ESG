import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Track, pose} from '../map/track';
import {TIMELINE_FPS, colors} from '../theme';
import {Forklift} from './Forklift';

/** Truck driving along a track (map pixels); hidden before start and after arrival. */
export const Truck: React.FC<{t: Track; d: number; show: boolean}> = ({t, d, show}) => {
  if (!show || d <= 0 || d >= t.total) return null;
  const {p, angle} = pose(t, d);
  return <Forklift x={p[0]} y={p[1]} angle={angle} />;
};


/** Both routes straightened into two ropes at true scale; the extra length of the current one is the waste. */
export const Ropes: React.FC<{frame: number; start: number; waste: number; tracks: {algo: Track; current: Track}}> = ({frame, start, waste: wasteAt, tracks: TRACK}) => {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const card = spring({frame: frame - start, fps: TIMELINE_FPS, config: {damping: 200}});
  const grow = interpolate(frame, [start + 15, start + 75], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const waste = interpolate(frame, [wasteAt, wasteAt + 15], [0, 1], clamp);
  const pulse = 0.6 + 0.4 * Math.sin(frame / 4);
  const W = 1500;
  const scale = W / TRACK.current.total;
  const x0 = 200;
  const lenG = TRACK.algo.total * scale;
  const lenR = TRACK.current.total * scale;
  const rope = (kind: 'algo' | 'current', y: number) => {
    const t = TRACK[kind];
    const len = t.total * scale * grow;
    const accent = kind === 'algo' ? colors.green : colors.red;
    return (
      <g>
        <text x={x0 - 8} y={y - 30} fontSize={30} fontWeight={800} fill={accent}>
          {kind === 'algo' ? 'ALGORITHM · Lộ trình tối ưu' : 'CURRENT · Theo dãy A → T'}
        </text>
        <line x1={x0} y1={y} x2={x0 + len} y2={y} stroke={accent} strokeWidth={16} strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px ${accent})`}} />
        {t.stopAt
          .filter((a) => a * scale <= len)
          .map((a, i) => (
            <circle key={i} cx={x0 + a * scale} cy={y} r={6} fill="#ffffff" stroke="#0b1222" strokeWidth={2} />
          ))}
        <g transform={`translate(${x0 + len} ${y})`}>
          <Forklift x={0} y={0} angle={0} />
        </g>
      </g>
    );
  };
  return (
    <AbsoluteFill style={{opacity: card}}>
      <div style={{position: 'absolute', left: 40, top: 176, width: 1840, height: 727, background: 'rgba(6, 10, 22, 0.86)', borderRadius: 16}} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <text x={960} y={300} textAnchor="middle" fontSize={40} fontWeight={800} fill="#ffffff">
          Same 28 stops – routes straightened out
        </text>
        <text x={960} y={340} textAnchor="middle" fontSize={26} fill={colors.muted}>
          Cùng 28 điểm – duỗi thẳng hai lộ trình để so độ dài
        </text>
        {rope('algo', 470)}
        {rope('current', 640)}
        {/* end of the optimized rope, projected onto the current rope */}
        <line x1={x0 + lenG} y1={430} x2={x0 + lenG} y2={680} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="8 7" opacity={waste} />
        <g opacity={waste}>
          <rect x={x0 + lenG} y={624} width={lenR - lenG} height={32} rx={6} fill={colors.red} opacity={0.35 + 0.45 * pulse} />
          <rect x={x0 + (lenG + lenR) / 2 - 275} y={690} width={550} height={92} rx={14} fill="#ffffff" stroke={colors.red} strokeWidth={4} />
          <text x={x0 + (lenG + lenR) / 2} y={735} textAnchor="middle" fontSize={34} fontWeight={800} fill="#d23c3a">
            EXTRA TRAVEL
          </text>
          <text x={x0 + (lenG + lenR) / 2} y={766} textAnchor="middle" fontSize={22} fontWeight={600} fill="#5b6478">
            Quãng đường chạy thừa
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

