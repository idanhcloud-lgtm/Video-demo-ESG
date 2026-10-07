import {Stop, routeLength, routePolyline, stopPoint} from '../map/route';
import {LAYOUT, MAP, project} from '../layout';
import {colors} from '../theme';
import {MapBase} from './MapBase';

type Pt = [number, number];

const segLen = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

export function pointAtFraction(pts: Pt[], f: number): Pt {
  const total = pts.slice(1).reduce((s, p, i) => s + segLen(pts[i], p), 0);
  let left = Math.max(0, Math.min(1, f)) * total;
  for (let i = 1; i < pts.length; i++) {
    const l = segLen(pts[i - 1], pts[i]);
    if (left <= l) {
      const t = l === 0 ? 0 : left / l;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    left -= l;
  }
  return pts[pts.length - 1];
}

/** Route polyline in map pixels and the polyline index where each stop is reached. */
export function routePixels(stops: Stop[], doorId: string) {
  const {pts, stopIdx} = routePolyline(stops, doorId);
  return {pts: pts.map(([x, y]) => project(x, y)), stopIdx};
}

const RouteIcon: React.FC<{kind: 'algo' | 'current'}> = ({kind}) => {
  const c = kind === 'algo' ? colors.green : colors.red;
  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 13,
        border: `2px solid ${c}66`,
        background: kind === 'algo' ? '#123a30' : '#3a1820',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {kind === 'algo' ? (
        <svg width={32} height={32} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round">
          <path d="M5 6 L9 10 M9 6 L5 10" />
          <circle cx={11} cy={22} r={3} />
          <circle cx={20} cy={15} r={3} />
          <circle cx={27} cy={7} r={3} />
          <path d="M13 20 L18 17 M22 13 L25 9" />
        </svg>
      ) : (
        <svg width={32} height={32} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round">
          <path d="M12 8 H27 M12 16 H27 M12 24 H27" />
          <path d="M5 6 V12 M5 20 V26" />
        </svg>
      )}
    </div>
  );
};

export interface RoutePanelProps {
  kind: 'algo' | 'current';
  stops: Stop[];
  doorId: string;
  /** Metres driven so far (Infinity = route complete). */
  traveled: number;
  /** Map camera: scale and translation in map pixels. */
  camera?: {k: number; tx: number; ty: number};
  /** Legs to trace in white (1-based: leg i goes stop i → stop i+1), drawn in order. */
  focusLegs?: number[];
  /** 0…focusLegs.length: how far the white trace has progressed. */
  focusProgress?: number;
  /** 0–1: hide stop markers outside the focus legs. */
  hideOthers?: number;
  /** Stop (1-based) where the way back starts; from there the route is drawn in a lighter tint. */
  splitStop?: number;
  splitMix?: number;
  /** 0–1: fade the route so highlighted parts stand out. */
  dim?: number;
  /** Extra SVG drawn in map coordinates: under the route / on top of everything. */
  underlay?: React.ReactNode;
  overlay?: React.ReactNode;
  children?: React.ReactNode;
}

export const RoutePanel: React.FC<RoutePanelProps> = ({
  kind,
  stops,
  doorId,
  traveled,
  camera = {k: 1, tx: 0, ty: 0},
  focusLegs = [],
  focusProgress = 0,
  hideOthers = 0,
  splitStop,
  splitMix = 0,
  dim = 0,
  underlay,
  overlay,
  children,
}) => {
  const accent = kind === 'algo' ? colors.green : colors.red;
  const {pts: ptsM, stopIdx} = routePolyline(stops, doorId);
  const pts = ptsM.map(([x, y]) => project(x, y));
  const total = routeLength(stops, doorId);
  // Metre distance along the route at each polyline vertex (route legs are axis-aligned in metres).
  const cumM = [0];
  for (let i = 1; i < ptsM.length; i++) {
    cumM.push(cumM[i - 1] + Math.abs(ptsM[i][0] - ptsM[i - 1][0]) + Math.abs(ptsM[i][1] - ptsM[i - 1][1]));
  }
  const d = Math.min(traveled, total);
  const visited = stopIdx.filter((i) => cumM[i] <= d + 1e-6).length;
  // Driven part of the polyline in pixels.
  const driven: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (cumM[i] <= d) {
      driven.push(pts[i]);
    } else {
      const t = (d - cumM[i - 1]) / (cumM[i] - cumM[i - 1]);
      driven.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      break;
    }
  }
  const focusStops = new Set(focusLegs.flatMap((leg) => [leg - 1, leg]));
  // Leg n (n = number of stops) is the way back from the last stop to the door.
  const legPts = (leg: number) => pts.slice(stopIdx[leg - 1], leg < stops.length ? stopIdx[leg] + 1 : pts.length);
  const BACK = '#7cc4ff';
  const textOnFill = kind === 'algo' ? '#062016' : '#ffffff';

  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.panelLeft[kind],
        top: LAYOUT.panelTop,
        width: LAYOUT.panelW,
        height: LAYOUT.panelH,
        boxSizing: 'border-box',
        borderRadius: 16,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        borderTop: `3px solid ${accent}`,
        boxShadow: `0 -6px 26px ${accent}40`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: LAYOUT.headerH - 3,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 24px 0 28px',
          background: colors.panelHeader,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <RouteIcon kind={kind} />
        <div style={{flex: 1}}>
          <div style={{fontSize: 14, fontWeight: 700, letterSpacing: 3, color: accent}}>● {kind === 'algo' ? 'ALGORITHM' : 'CURRENT'}</div>
          <div style={{fontSize: 29, fontWeight: 700, lineHeight: 1.15}}>{kind === 'algo' ? 'Optimized route' : 'Aisle order A → T'}</div>
          <div style={{fontSize: 17, color: colors.muted}}>{kind === 'algo' ? 'Lộ trình tối ưu · S-shape + 2-opt' : 'Hiện tại · Lấy theo dãy A → T'}</div>
        </div>
        <div style={{textAlign: 'right', paddingRight: kind === 'algo' ? 28 : 0}}>
          <div style={{fontSize: 58, fontWeight: 800, color: accent, lineHeight: 1}}>
            {Math.round(d).toLocaleString('en-US')}
            <span style={{fontSize: 24, fontWeight: 600, color: colors.muted, marginLeft: 6}}>m</span>
          </div>
          <div style={{fontSize: 18, color: colors.muted, marginTop: 4}}>
            {visited} / {stops.length} stops · điểm
          </div>
        </div>
      </div>
      <svg width={MAP.w} height={MAP.h} style={{display: 'block'}}>
        <g transform={`translate(${camera.tx} ${camera.ty}) scale(${camera.k})`}>
          <MapBase startDoor={doorId} />
          {underlay}
          <path d={toPath(pts)} fill="none" stroke={accent} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="4 6" />
          <path
            d={toPath(driven)}
            fill="none"
            stroke={accent}
            strokeWidth={5.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={1 - 0.75 * Math.max(splitMix, dim)}
            style={{filter: `drop-shadow(0 0 5px ${accent})`}}
          />
          {splitStop && splitMix > 0 ? (
            <g opacity={splitMix}>
              <path
                d={toPath(pts.slice(0, stopIdx[splitStop - 1] + 1))}
                fill="none"
                stroke={accent}
                strokeWidth={5.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{filter: `drop-shadow(0 0 5px ${accent})`}}
              />
              <path
                d={toPath(pts.slice(stopIdx[splitStop - 1]))}
                fill="none"
                stroke={BACK}
                strokeWidth={5.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{filter: `drop-shadow(0 0 5px ${BACK})`}}
              />
            </g>
          ) : null}
          {focusLegs.map((leg, i) => {
            const p = Math.max(0, Math.min(1, focusProgress - i));
            if (p <= 0) return null;
            const lp = legPts(leg);
            const head = pointAtFraction(lp, p);
            return (
              <g key={leg}>
                <path
                  d={toPath(lp)}
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={1 - p}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={6}
                  strokeLinejoin="round"
                  style={{filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))'}}
                />
                {p < 1 ? <circle cx={head[0]} cy={head[1]} r={9} fill="#ffffff" stroke={accent} strokeWidth={3} /> : null}
              </g>
            );
          })}
          {stops.map((s, i) => {
            const [x, y] = project(...stopPoint(s));
            const done = i < visited;
            const op = focusStops.has(i) ? 1 : 1 - hideOthers;
            if (op <= 0.01) return null;
            return (
              <g key={i} opacity={op}>
                <circle cx={x} cy={y} r={15.5} fill={done ? accent : colors.panel} stroke={accent} strokeWidth={2.5} />
                <text x={x} y={y + 5} textAnchor="middle" fontSize={14.5} fontWeight={700} fill={done ? textOnFill : '#ffffff'}>
                  {i + 1}
                </text>
              </g>
            );
          })}
          {overlay}
        </g>
      </svg>
      {children}
    </div>
  );
};

export const VsBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 960 - 40,
      top: LAYOUT.panelTop + 8,
      width: 80,
      height: 80,
      boxSizing: 'border-box',
      borderRadius: 40,
      background: colors.bg,
      border: '3px solid #ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      fontWeight: 800,
      zIndex: 3,
    }}
  >
    VS
  </div>
);

export const Callout: React.FC<{kind: 'algo' | 'current'; en: React.ReactNode; vi: string; p: number; placement?: 'top' | 'bottom'}> = ({
  kind,
  en,
  vi,
  p,
  placement = 'bottom',
}) => {
  const accent = kind === 'algo' ? colors.green : colors.red;
  return (
    <div
      style={{
        position: 'absolute',
        left: 30,
        right: 30,
        top: placement === 'bottom' ? 513 : LAYOUT.headerH + 14,
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${accent}`,
        boxShadow: `0 10px 34px #000a, 0 0 22px ${accent}55`,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      <div style={{background: accent, color: '#0b1222', fontWeight: 700, fontSize: 19, letterSpacing: 2.5, padding: '10px 24px'}}>
        {kind === 'algo' ? 'ALGORITHM · THUẬT TOÁN' : 'CURRENT · HIỆN TẠI'}
      </div>
      <div style={{background: '#f3f5f9', padding: '16px 24px 18px'}}>
        <div style={{fontSize: 28, fontWeight: 700, color: '#141a2b', lineHeight: 1.25}}>{en}</div>
        <div style={{fontSize: 20, color: '#5b6478', marginTop: 6}}>{vi}</div>
      </div>
    </div>
  );
};
