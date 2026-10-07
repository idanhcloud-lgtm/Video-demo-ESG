import {colors} from '../theme';

/** Top-view reach truck (yellow, pallet on the forks, headlight), pointing along `angle` degrees. */
export const Forklift: React.FC<{x: number; y: number; angle: number; light?: number; alert?: number}> = ({x, y, angle, light = 1, alert = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`}>
    <defs>
      <linearGradient id="beam" x1="0" x2="1">
        <stop offset="0" stopColor="#fff6c8" stopOpacity={0.55} />
        <stop offset="1" stopColor="#fff6c8" stopOpacity={0} />
      </linearGradient>
    </defs>
    {alert > 0 ? <circle r={22} fill="none" stroke={colors.red} strokeWidth={3} opacity={alert} /> : null}
    <path d="M16 -5 L58 -17 L58 17 L16 5 Z" fill="url(#beam)" opacity={light} />
    <rect x={12} y={-6} width={12} height={2} fill="#9aa3b5" />
    <rect x={12} y={4} width={12} height={2} fill="#9aa3b5" />
    <rect x={13} y={-7.5} width={10} height={15} rx={1.5} fill="#c99a5b" stroke="#7a5a30" strokeWidth={1} />
    <rect x={-13} y={-8} width={25} height={16} rx={3.5} fill={colors.yellow} stroke="#8a6a12" strokeWidth={1.2} />
    <rect x={-8} y={-5} width={10} height={10} rx={2} fill="#1d2433" />
    <rect x={-13} y={-8} width={4} height={16} rx={1.5} fill="#d9a41e" />
  </g>
);
