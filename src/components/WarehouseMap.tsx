import {AISLE_WIDTH_M, DOORS, NUM_AISLES, RACKS, aisleY, rackBand, xOfVT} from '../map/khoC';
import {colors} from '../theme';

export interface Viewport {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

// SVG y grows downward; flip so lane 1 (rack CAT) sits at the bottom like the real floor plan.
const Y_TOP = 200;
export const fy = (y: number) => Y_TOP - y;

export const TUNNEL_VT = [34, 75];

/**
 * Kho C floor plan drawn in metres. Children are drawn on top in the same metre coordinates
 * (use `fy` for y). `highlightCross` (0–1) brightens the cross points.
 */
export const WarehouseMap: React.FC<{
  view: Viewport;
  width: number;
  height: number;
  accent: string;
  highlightCross?: number;
  doorId?: string;
  /** Rack codes to label (others stay unlabeled to keep the map readable). */
  labelRacks?: string[];
  children?: React.ReactNode;
}> = ({view, width, height, accent, highlightCross = 0, doorId, labelRacks = [], children}) => {
  const vb = `${view.x0} ${fy(view.y1)} ${view.x1 - view.x0} ${view.y1 - view.y0}`;
  const pid = `bins-${accent.replace('#', '')}`;
  const crossLabel = (x: number, en: string, vi: string) => (
    <g opacity={0.55 + 0.45 * highlightCross}>
      <text x={x} y={fy(view.y1) + 3.2} fontSize={2.3} fontWeight={700} fill={highlightCross > 0.5 ? accent : colors.muted} textAnchor="middle">
        {en}
      </text>
      <text x={x} y={fy(view.y1) + 5.8} fontSize={1.8} fill={colors.muted} textAnchor="middle">
        {vi}
      </text>
    </g>
  );
  return (
    <svg width={width} height={height} viewBox={vb} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={pid} width={1.4} height={400} patternUnits="userSpaceOnUse">
          <rect x={0.18} y={0} width={1.04} height={400} fill="#1e3550" />
        </pattern>
      </defs>
      <rect x={view.x0 - 50} y={fy(view.y1) - 50} width={400} height={400} fill="#0d1626" />
      {/* aisles */}
      {Array.from({length: NUM_AISLES}, (_, i) => (
        <rect
          key={i}
          x={0}
          y={fy(aisleY(i + 1) + AISLE_WIDTH_M / 2)}
          width={xOfVT(RACKS.filter((r) => r.lane === i + 1).reduce((m, r) => Math.max(m, r.vtMax), 0))}
          height={AISLE_WIDTH_M}
          fill="#101c2e"
        />
      ))}
      {/* racks */}
      {RACKS.map((r) => {
        const [y0, y1] = rackBand(r.code);
        return (
          <g key={r.code}>
            <rect x={0} y={fy(y1)} width={xOfVT(r.vtMax)} height={y1 - y0} fill="#15263b" />
            <rect x={0} y={fy(y1) + 0.25} width={xOfVT(r.vtMax)} height={y1 - y0 - 0.5} fill={`url(#${pid})`} />
            {labelRacks.includes(r.code) ? (
              <text x={0.6} y={fy((y0 + y1) / 2) + 0.7} fontSize={2} fontWeight={700} fill="#c9d3e3" textAnchor="start" paintOrder="stroke" stroke="#0d1626" strokeWidth={0.6}>
                {r.code}
              </text>
            ) : null}
          </g>
        );
      })}
      {/* cross points: front of the rows and the two floor tunnels */}
      <rect x={-4} y={fy(view.y1) - 10} width={3} height={400} fill={accent} opacity={0.04 + 0.12 * highlightCross} />
      {TUNNEL_VT.map((vt) => (
        <rect
          key={vt}
          x={xOfVT(vt - 1)}
          y={fy(view.y1) - 10}
          width={2.8}
          height={400}
          fill={accent}
          opacity={0.08 + 0.22 * highlightCross}
        />
      ))}
      <rect x={view.x0 - 5} y={fy(view.y1) - 5} width={view.x1 - view.x0 + 10} height={12} fill="#0d1626" opacity={0.85} />
      {crossLabel(-2.5, 'FRONT', 'Đầu dãy')}
      {crossLabel(xOfVT(34), 'TUNNEL 1 · VT 34', 'Hầm 1')}
      {crossLabel(xOfVT(75), 'TUNNEL 2 · VT 75', 'Hầm 2')}
      {crossLabel(xOfVT(105), 'ROW END', 'Cuối dãy')}
      {/* doors */}
      {DOORS.map((d) => (
        <g key={d.id}>
          <rect x={d.x - 1.2} y={fy(d.y) - 1.2} width={2.4} height={2.4} rx={0.4} fill={d.id === doorId ? colors.yellow : '#5b4a14'} />
          {d.id === doorId ? (
            <text x={d.x - 1.8} y={fy(d.y) + 0.8} fontSize={2.2} fontWeight={700} fill={colors.yellow} textAnchor="end">
              D{d.id}
            </text>
          ) : null}
        </g>
      ))}
      {children}
    </svg>
  );
};
