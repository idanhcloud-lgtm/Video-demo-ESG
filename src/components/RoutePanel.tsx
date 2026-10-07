import {interpolate} from 'remotion';
import {Stop, routeLength, routePolyline, stopPoint} from '../map/route';
import {colors} from '../theme';
import {Viewport, WarehouseMap, fy} from './WarehouseMap';

type Pt = [number, number];

function pointAt(pts: Pt[], d: number): Pt {
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    if (left <= seg) {
      const t = seg === 0 ? 0 : left / seg;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

const cumulative = (pts: Pt[]) => {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
  }
  return out;
};

const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${fy(y)}`).join(' ');

export interface PanelProps {
  kind: 'algo' | 'current';
  stops: Stop[];
  doorId: string;
  traveled: number;
  view: Viewport;
  width: number;
  mapHeight: number;
  highlightCross?: number;
  /** Legs (1-based index into the visit order: leg i goes stop i → stop i+1) to emphasise. */
  highlightLegs?: number[];
  highlight?: number;
}

export const RoutePanel: React.FC<PanelProps> = ({
  kind,
  stops,
  doorId,
  traveled,
  view,
  width,
  mapHeight,
  highlightCross = 0,
  highlightLegs = [],
  highlight = 0,
}) => {
  const accent = kind === 'algo' ? colors.green : colors.red;
  const {pts, stopIdx} = routePolyline(stops, doorId);
  const cum = cumulative(pts);
  const total = routeLength(stops, doorId);
  const d = Math.min(traveled, total);
  const visited = stopIdx.filter((i) => cum[i] <= d + 1e-6).length;
  const truck = pointAt(pts, d);
  const finished = traveled >= total;

  return (
    <div
      style={{
        width,
        background: colors.panel,
        borderRadius: 16,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 30px ${accent}33`,
        overflow: 'hidden',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', padding: '14px 22px', gap: 16}}>
        <div style={{flex: 1}}>
          <div style={{fontSize: 16, fontWeight: 700, letterSpacing: 2, color: accent}}>
            ● {kind === 'algo' ? 'ALGORITHM' : 'CURRENT'}
          </div>
          <div style={{fontSize: 30, fontWeight: 800}}>{kind === 'algo' ? 'Optimized route' : 'Aisle order A → T'}</div>
          <div style={{fontSize: 17, color: colors.muted}}>
            {kind === 'algo' ? 'Lộ trình tối ưu · S-shape + 2-opt' : 'Hiện tại · Lấy theo dãy A → T'}
          </div>
        </div>
        <div style={{textAlign: 'right'}}>
          <div style={{fontSize: 56, fontWeight: 800, color: accent, lineHeight: 1}}>
            {Math.round(d).toLocaleString('en-US')}
            <span style={{fontSize: 24, marginLeft: 6}}>m</span>
          </div>
          <div style={{fontSize: 17, color: colors.muted}}>
            {visited} / {stops.length} stops · điểm
          </div>
        </div>
      </div>
      <div style={{position: 'relative'}}>
        <WarehouseMap view={view} width={width} height={mapHeight} accent={accent} highlightCross={highlightCross} doorId={doorId}
          labelRacks={[...new Set(stops.map((s) => s.rack))]}>
          <path d={toPath(pts)} fill="none" stroke={accent} strokeOpacity={0.12} strokeWidth={0.7} />
          <path
            d={toPath(pts)}
            fill="none"
            stroke={accent}
            strokeWidth={0.9}
            strokeLinejoin="round"
            strokeDasharray={`${d} ${total + 10}`}
            style={{filter: `drop-shadow(0 0 0.6px ${accent})`}}
          />
          {highlightLegs.map((leg) => {
            const seg = pts.slice(stopIdx[leg - 1], stopIdx[leg] + 1);
            return (
              <path
                key={leg}
                d={toPath(seg)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.3}
                strokeLinejoin="round"
                opacity={highlight}
              />
            );
          })}
          {stops.map((s, i) => {
            const [x, y] = stopPoint(s);
            const done = i < visited;
            return (
              <g key={i}>
                <circle cx={x} cy={fy(y)} r={2.1} fill={done ? accent : '#0d1626'} stroke={accent} strokeWidth={0.45} />
                <text x={x} y={fy(y) + 0.8} fontSize={2.2} fontWeight={800} textAnchor="middle" fill={done ? '#0b1220' : accent}>
                  {i + 1}
                </text>
              </g>
            );
          })}
          <g transform={`translate(${truck[0]} ${fy(truck[1])})`} opacity={finished ? 0 : 1}>
            <rect x={-2} y={-1.3} width={4} height={2.6} rx={0.6} fill={colors.yellow} stroke="#0b1220" strokeWidth={0.3} />
          </g>
        </WarehouseMap>
        {finished ? (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 24,
              transform: `translateX(-50%) scale(${interpolate(traveled - total, [0, 12], [0.6, 1], {extrapolateRight: 'clamp'})})`,
              background: '#ffffff',
              color: '#0b1220',
              borderRadius: 12,
              padding: '10px 22px',
              textAlign: 'center',
              boxShadow: `0 0 0 3px ${accent}`,
            }}
          >
            <div style={{fontSize: 26, fontWeight: 800}}>✓ FINISHED · Về đích</div>
            <div style={{fontSize: 18, fontWeight: 700, color: kind === 'algo' ? '#0a8f5a' : '#c4363b'}}>
              {Math.round(total)} m · {stops.length} / {stops.length} stops
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
