import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {Forklift} from '../components/Forklift';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {MAP, project, vtX} from '../layout';
import {RACKS, VT_WIDTH_M} from '../map/khoC';
import {Stop, aisleOrder, routeLength, routePolyline} from '../map/route';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second), same beats as the other problems.
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  zones: 190,
  race: 245,
  raceEnd: 605,
  callout: 615,
  solved: 775,
  end: 865,
};
export const PROBLEM03_DURATION = toFrames(T.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const laneOf = (s: Stop) => RACKS.find((r) => r.code === s.rack)!.lane;
const LANES = new Set(TO28.map(laneOf)).size;

// The warehouse is split at VT 52 into the half near the doors and the deep half.
const MID_VT = 52;
const MID_X_M = MID_VT * VT_WIDTH_M;

type Pt = [number, number];
interface Track {
  pts: Pt[];
  cum: number[];
  total: number;
  /** Route distance (m) and position (m) of every crossing into the deep half. */
  entries: {at: number; p: Pt}[];
}
const track = (stops: Stop[]): Track => {
  const {pts} = routePolyline(stops, TO28_DOOR);
  const cum = [0];
  const entries: {at: number; p: Pt}[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    cum.push(cum[i - 1] + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]));
    if (a[0] < MID_X_M && b[0] >= MID_X_M) entries.push({at: cum[i - 1] + (MID_X_M - a[0]), p: [MID_X_M, a[1]]});
  }
  return {pts, cum, total: cum[cum.length - 1], entries};
};
const TRACK = {current: track(current), algo: track(algo)};
const ENTRIES = {current: TRACK.current.entries.length, algo: TRACK.algo.entries.length};
// Both trucks drive at the same speed; the current route uses the whole race window.
const SPEED = routeLength(current, TO28_DOOR) / (T.raceEnd - T.race);

function pose(t: Track, d: number): {p: Pt; angle: number} {
  for (let i = 1; i < t.pts.length; i++) {
    if (d <= t.cum[i] || i === t.pts.length - 1) {
      const [a, b] = [t.pts[i - 1], t.pts[i]];
      const seg = t.cum[i] - t.cum[i - 1];
      const k = seg === 0 ? 1 : Math.min(1, Math.max(0, (d - t.cum[i - 1]) / seg));
      const pa = project(...a);
      const pb = project(...b);
      return {
        p: [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k],
        angle: (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI,
      };
    }
  }
  return {p: project(...t.pts[0]), angle: 0};
}

/** Near / deep halves and the middle line, drawn under the route. */
const Zones: React.FC<{p: number; flash: number; accent: string}> = ({p, flash, accent}) => {
  const x = vtX(MID_VT);
  const top = MAP.topLineY + 4;
  return (
    <g opacity={p}>
      <rect x={vtX(0) - 6} y={top} width={x - vtX(0) + 6} height={MAP.h - top} fill="#3b82f6" opacity={0.07} />
      <rect x={x} y={top} width={vtX(105) - x} height={MAP.h - top} fill="#f59e0b" opacity={0.08} />
      <line x1={x} y1={top} x2={x} y2={MAP.h} stroke="#ffffff" strokeWidth={3 + 5 * flash} strokeDasharray="10 8" opacity={0.55 + 0.45 * flash} />
      <rect x={x - 70} y={MAP.h - 34} width={140} height={26} rx={7} fill="#0b1222" stroke={flash > 0.05 ? accent : '#ffffff55'} />
      <text x={x} y={MAP.h - 16} textAnchor="middle" fontSize={14} fontWeight={800} letterSpacing={1.5} fill="#ffffff">
        GIỮA KHO · VT {MID_VT}
      </text>
    </g>
  );
};

const ZoneLabels: React.FC<{p: number}> = ({p}) => (
  <g opacity={p}>
    {[
      {x: (vtX(0) + vtX(MID_VT)) / 2, t: 'NỬA GẦN CỬA', s: 'near half', c: '#7cb7ff'},
      {x: (vtX(MID_VT) + vtX(104)) / 2, t: 'NỬA SÂU', s: 'deep half', c: '#fbbf5a'},
    ].map((z) => (
      <g key={z.t}>
        <rect x={z.x - 100} y={MAP.topLineY + 10} width={200} height={46} rx={10} fill="#0b1222" opacity={0.9} stroke={z.c} strokeWidth={2} />
        <text x={z.x} y={MAP.topLineY + 33} textAnchor="middle" fontSize={19} fontWeight={800} fill={z.c}>
          {z.t}
        </text>
        <text x={z.x} y={MAP.topLineY + 50} textAnchor="middle" fontSize={13} fill={colors.muted}>
          {z.s}
        </text>
      </g>
    ))}
  </g>
);

/** Truck, and a numbered marker at each entry into the deep half. */
const RaceOverlay: React.FC<{t: Track; d: number; accent: string; show: number}> = ({t, d, accent, show}) => {
  const {p, angle} = pose(t, d);
  const done = d >= t.total;
  return (
    <g opacity={show}>
      {t.entries
        .filter((e) => e.at <= d)
        .map((e, i) => {
          const [x, y] = project(...e.p);
          const age = Math.min(1, (d - e.at) / 25);
          return (
            <g key={i} transform={`translate(${x} ${y - 24}) scale(${1.5 - 0.5 * age})`}>
              <path d="M0 14 L-6 6 L6 6 Z" fill={colors.yellow} />
              <rect x={-22} y={-14} width={44} height={22} rx={6} fill={colors.yellow} stroke="#0b1222" strokeWidth={2} />
              <text y={3} textAnchor="middle" fontSize={14} fontWeight={800} fill="#0b1222">
                #{i + 1}
              </text>
            </g>
          );
        })}
      {!done && d > 0 ? <Forklift x={p[0]} y={p[1]} angle={angle} /> : null}
    </g>
  );
};

export const Problem03: React.FC = () => {
  const frame = useTimelineFrame();
  const fps = TIMELINE_FPS;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const glow = interpolate(frame, [T.glow, T.glow + 15], [0, 1], clamp);
  const cardIn = spring({frame: frame - T.cardIn, fps, config: {damping: 200}});
  const cardOut = interpolate(frame, [T.cardOut, T.cardOut + 20], [0, 1], ease);
  const panels = spring({frame: frame - T.panelsIn, fps, config: {damping: 200}});
  const zones = interpolate(frame, [T.zones, T.zones + 20], [0, 1], clamp);
  const labels = interpolate(frame, [T.zones, T.zones + 20, T.race - 5, T.race + 15], [0, 1, 1, 0], clamp);
  const traveled = Math.max(0, frame - T.race) * SPEED;
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const count = (t: Track) => t.entries.filter((e) => e.at <= traveled).length;
  const flash = (t: Track) => {
    const last = t.entries.filter((e) => e.at <= traveled).pop();
    return last ? Math.max(0, 1 - (traveled - last.at) / 40) : 0;
  };

  const phase = frame < T.race ? 0 : frame < T.callout ? 1 : frame < T.solved ? 2 : 3;
  const captions = [
    {icon: '03', en: `28 stops on ${LANES} of 18 aisles – near the doors and deep inside`, vi: `28 điểm rải trên ${LANES}/18 lối – có điểm gần cửa, có điểm tận cuối kho`},
    {icon: '03', en: 'Yellow tag = one more trip into the deep half', vi: 'Mỗi thẻ vàng = thêm 1 lượt xe chạy vào nửa sâu của kho'},
    {icon: '03', en: `A → T goes back and forth: ${ENTRIES.current} trips · Deep zone first: ${ENTRIES.algo} trips`, vi: `Theo tên dãy A → T chạy tới lui đầu – cuối kho ${ENTRIES.current} lượt · Thuật toán lấy vùng sâu trước: ${ENTRIES.algo} lượt`},
    {icon: 'check', en: 'Route by zone, not by aisle name → problem 03 solved', vi: 'Đi theo vùng, không theo tên dãy → vấn đề 03 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.race, T.callout, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  const panel = (kind: 'algo' | 'current') => {
    const t = TRACK[kind];
    const accent = kind === 'algo' ? colors.green : colors.red;
    const n = count(t);
    return {
      kind,
      stops: kind === 'algo' ? algo : current,
      doorId: TO28_DOOR,
      traveled: frame < T.race ? Infinity : traveled,
      dim: frame < T.race ? 0.6 * zones : 0,
      header: {value: String(frame < T.race ? 0 : n), unit: n === 1 ? 'trip' : 'trips', sub: 'into the deep half · lượt vào nửa sâu'},
      underlay: <Zones p={zones} flash={flash(t)} accent={accent} />,
      overlay: (
        <>
          <ZoneLabels p={labels} />
          <RaceOverlay t={t} d={traveled} accent={accent} show={frame >= T.race ? 1 : 0} />
        </>
      ),
    };
  };

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <ProblemTabs
        states={['solved', 'solved', solved ? 'solved' : 'solving', 'idle']}
        glow={glow}
        hidden={frame >= T.cardIn && frame < T.cardOut + 15 ? 2 : undefined}
        checkScale={solved ? check : 1}
      />
      <ProblemCard
        n={3}
        en="Scattered items"
        vi="Hàng rải rác nhiều dãy"
        descEn="Items are spread over the whole warehouse – the A → T order follows aisle names, not zones"
        descVi="Hàng rải khắp kho – phiếu A → T đi theo tên dãy, không theo vùng"
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <RoutePanel {...panel('algo')} />
        <RoutePanel {...panel('current')} />
        <VsBadge />
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
    </AbsoluteFill>
  );
};
