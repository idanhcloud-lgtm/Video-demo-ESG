import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {Background} from '../components/Background';
import {CaptionBar} from '../components/CaptionBar';
import {ProblemCard} from '../components/ProblemCard';
import {ProblemTabs} from '../components/ProblemTabs';
import {RoutePanel, VsBadge} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {project} from '../layout';
import {RACKS} from '../map/khoC';
import {Stop, aisleOrder, routeBreakdown, stopPoint} from '../map/route';
import {TIMELINE_FPS, colors, fontFamily, toFrames} from '../theme';
import {useTimelineFrame} from '../timeline';

// Timeline (30 units per second), same beats as problems 01 and 02.
const T = {
  glow: 20,
  cardIn: 45,
  cardOut: 150,
  panelsIn: 175,
  scatter: 195,
  within: 300,
  chart: 420,
  solved: 630,
  end: 720,
};
export const PROBLEM03_DURATION = toFrames(T.end);

const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const laneOf = (s: Stop) => RACKS.find((r) => r.code === s.rack)!.lane;
const byLane = new Map<number, Stop[]>();
TO28.forEach((s) => byLane.set(laneOf(s), [...(byLane.get(laneOf(s)) ?? []), s]));
const LANES = byLane.size;
const pairs = [...byLane.values()].filter((v) => v.length === 2);

// Round the three parts so they always add up to the rounded total (largest remainder).
const roundedParts = (b: ReturnType<typeof routeBreakdown>) => {
  const raw = [b.between, b.within, b.door];
  const out = raw.map(Math.floor);
  const target = Math.round(raw.reduce((a, c) => a + c, 0));
  raw
    .map((v, i) => ({i, r: v - Math.floor(v)}))
    .sort((a, b2) => b2.r - a.r)
    .slice(0, target - out.reduce((a, c) => a + c, 0))
    .forEach(({i}) => out[i]++);
  return {...b, between: out[0], within: out[1], door: out[2]};
};
const BD = {algo: roundedParts(routeBreakdown(algo, TO28_DOOR)), current: roundedParts(routeBreakdown(current, TO28_DOOR))};
const m = (x: number) => Math.round(x).toLocaleString('en-US');

const SEG = [
  {key: 'between', en: 'Changing aisle', vi: 'Đổi lối', color: '#3b82f6'},
  {key: 'within', en: 'Along the same aisle', vi: 'Chạy trong cùng dãy', color: '#e0a526'},
  {key: 'door', en: 'Door ↔ first / last stop', vi: 'Cửa ↔ điểm đầu / cuối', color: '#8b5cf6'},
] as const;

// Same-aisle stop pairs: how far apart the items of one aisle are.
const PairMarks: React.FC<{p: number}> = ({p}) => (
  <g opacity={p}>
    {pairs.map((v) => {
      const [a, b] = v.map((s) => project(...stopPoint(s)));
      return (
        <g key={v[0].rack + v[0].vt}>
          <line x1={a[0]} y1={a[1] - 19} x2={b[0]} y2={b[1] - 19} stroke={colors.yellow} strokeWidth={2.5} strokeDasharray="6 5" />
          <line x1={a[0]} y1={a[1] - 25} x2={a[0]} y2={a[1] - 13} stroke={colors.yellow} strokeWidth={2.5} />
          <line x1={b[0]} y1={b[1] - 25} x2={b[0]} y2={b[1] - 13} stroke={colors.yellow} strokeWidth={2.5} />
        </g>
      );
    })}
  </g>
);

const BarRow: React.FC<{kind: 'algo' | 'current'; grow: number}> = ({kind, grow}) => {
  const bd = BD[kind];
  const accent = kind === 'algo' ? colors.green : colors.red;
  const scale = 1180 / BD.current.between / (1 + (BD.current.within + BD.current.door) / BD.current.between);
  let acc = 0;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 24, height: 96}}>
      <div style={{width: 260}}>
        <div style={{fontSize: 16, fontWeight: 700, letterSpacing: 2.5, color: kind === 'algo' ? '#0a8f5a' : '#d23c3a'}}>● {kind === 'algo' ? 'ALGORITHM' : 'CURRENT'}</div>
        <div style={{fontSize: 26, fontWeight: 700, color: '#141a2b'}}>{kind === 'algo' ? 'Optimized route' : 'Aisle order A → T'}</div>
      </div>
      <div style={{position: 'relative', width: 1180, height: 72}}>
        {SEG.map((sg) => {
          const v = bd[sg.key];
          const left = acc * scale;
          acc += v;
          const w = v * scale * grow;
          return (
            <div
              key={sg.key}
              style={{
                position: 'absolute',
                left: left * grow,
                top: 0,
                width: w,
                height: 72,
                background: sg.color,
                borderRight: '3px solid #ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {w >= 110 ? <div style={{fontSize: 26, fontWeight: 800, opacity: grow}}>{m(v)} m</div> : null}
              {sg.key === 'between' ? <div style={{fontSize: 16, opacity: grow}}>{bd.changes} lần đổi lối</div> : null}
            </div>
          );
        })}
        {/* Labels for segments too narrow to hold their number. */}
        {SEG.map((sg, k) => {
          const v = bd[sg.key];
          const before = SEG.slice(0, k).reduce((a, x) => a + bd[x.key], 0);
          const w = v * scale * grow;
          if (w >= 110 || grow < 0.95) return null;
          return (
            <div key={`l-${sg.key}`} style={{position: 'absolute', left: before * scale * grow + w / 2, top: 76, transform: 'translateX(-50%)', fontSize: 20, fontWeight: 800, color: sg.color, whiteSpace: 'nowrap'}}>
              {m(v)} m
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChartCard: React.FC<{p: number; grow: number; delta: number}> = ({p, grow, delta}) => {
  const d = {
    between: BD.algo.between - BD.current.between,
    within: BD.algo.within - BD.current.within,
    door: BD.algo.door - BD.current.door,
  };
  const sign = (x: number) => (x > 0 ? `+${m(x)}` : `−${m(-x)}`);
  return (
    <div
      style={{
        position: 'absolute',
        left: 960,
        top: 540,
        transform: `translate(-50%, -50%) scale(${0.92 + 0.08 * p})`,
        opacity: p,
        width: 1560,
        background: '#f3f5f9',
        borderRadius: 26,
        padding: '30px 44px 34px',
        boxShadow: '0 30px 80px #000c, 0 0 0 4px #ffffff',
        color: '#141a2b',
        zIndex: 5,
      }}
    >
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#5b6478'}}>SAME TO · 28 STOPS · CÙNG 1 PHIẾU</div>
          <div style={{fontSize: 38, fontWeight: 800}}>Where do the metres go?</div>
          <div style={{fontSize: 22, color: '#5b6478'}}>Quãng đường đi vào đâu?</div>
        </div>
        <div style={{display: 'flex', gap: 26}}>
          {SEG.map((sg) => (
            <div key={sg.key} style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <div style={{width: 22, height: 22, borderRadius: 5, background: sg.color}} />
              <div>
                <div style={{fontSize: 18, fontWeight: 700}}>{sg.en}</div>
                <div style={{fontSize: 15, color: '#5b6478'}}>{sg.vi}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14}}>
        <BarRow kind="current" grow={grow} />
        <BarRow kind="algo" grow={grow} />
      </div>
      <div style={{marginTop: 22, display: 'flex', gap: 18, opacity: delta, transform: `translateY(${(1 - delta) * 16}px)`}}>
        {SEG.map((sg) => {
          const v = d[sg.key];
          const up = v > 0;
          return (
            <div key={sg.key} style={{flex: 1, borderRadius: 14, padding: '12px 18px', background: '#ffffff', borderLeft: `8px solid ${sg.color}`}}>
              <div style={{fontSize: 34, fontWeight: 800, color: up ? '#d23c3a' : '#0a8f5a'}}>{sign(v)} m</div>
              <div style={{fontSize: 18, fontWeight: 700}}>
                {sg.en}
                {sg.key === 'between' ? ` · ${BD.algo.changes - BD.current.changes > 0 ? '+' : ''}${BD.algo.changes - BD.current.changes} lần` : ''}
              </div>
              <div style={{fontSize: 15, color: '#5b6478'}}>{sg.vi}</div>
            </div>
          );
        })}
      </div>
    </div>
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
  const scatter = interpolate(frame, [T.scatter, T.scatter + 15, T.within - 5, T.within + 10], [0, 1, 1, 0], clamp);
  const dim = interpolate(frame, [T.within, T.within + 15, T.chart, T.chart + 15], [0, 1, 1, 0.3], clamp);
  const traceCur = interpolate(frame, [T.within + 10, T.chart - 20], [0, BD.current.withinLegs.length], clamp);
  const traceAlgo = interpolate(frame, [T.within + 10, T.chart - 20], [0, BD.algo.withinLegs.length], clamp);
  const chart = spring({frame: frame - T.chart, fps, config: {damping: 200}}) * interpolate(frame, [T.solved - 15, T.solved], [1, 0], clamp);
  const grow = interpolate(frame, [T.chart + 15, T.chart + 60], [0, 1], ease);
  const delta = interpolate(frame, [T.chart + 80, T.chart + 95], [0, 1], clamp);
  const solved = frame >= T.solved;
  const check = spring({frame: frame - T.solved, fps, config: {damping: 12}});

  const phase = frame < T.within ? 0 : frame < T.chart ? 1 : frame < T.solved ? 2 : 3;
  const captions = [
    {icon: '03', en: `28 stops on ${LANES} of 18 aisles – and far apart inside the same aisle`, vi: `28 điểm trên ${LANES}/18 lối – hai điểm cùng dãy cũng cách xa nhau`},
    {icon: '03', en: `Driving along the same aisle: ${m(BD.current.within)} m vs ${m(BD.algo.within)} m`, vi: `Chạy dọc trong cùng dãy: ${m(BD.current.within)} m so với ${m(BD.algo.within)} m`},
    {icon: '03', en: `${BD.algo.changes - BD.current.changes} more aisle changes – but far less driving inside aisles and back to the door`, vi: `Đổi lối nhiều hơn ${BD.algo.changes - BD.current.changes} lần, nhưng bớt hẳn quãng chạy trong dãy và về cửa`},
    {icon: 'check', en: 'Each aisle entered only as far as needed → problem 03 solved', vi: 'Vào dãy vừa đủ tới điểm cần lấy → vấn đề 03 đã giải quyết'},
  ];
  const capStart = [T.panelsIn, T.within, T.chart, T.solved][phase];
  const capOpacity = interpolate(frame, [capStart, capStart + 12], [0, 1], clamp);

  const common = {showDistance: false, doorId: TO28_DOOR, traveled: Infinity, dim, underlay: <PairMarks p={scatter} />};

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
        descEn={`One TO touches ${LANES} of 18 aisles – the printed order drives each aisle end to end`}
        descVi={`Một phiếu rải ${LANES}/18 lối – phiếu in bắt xe chạy hết từng dãy`}
        enter={cardIn}
        out={cardOut}
      />

      <div style={{opacity: panels, transform: `translateY(${(1 - panels) * 40}px)`}}>
        <RoutePanel kind="algo" stops={algo} focusLegs={BD.algo.withinLegs} focusProgress={traceAlgo} {...common} />
        <RoutePanel kind="current" stops={current} focusLegs={BD.current.withinLegs} focusProgress={traceCur} {...common} />
        <VsBadge />
        <CaptionBar icon={captions[phase].icon} en={captions[phase].en} vi={captions[phase].vi} opacity={capOpacity} />
      </div>
      <ChartCard p={chart} grow={grow} delta={delta} />
    </AbsoluteFill>
  );
};
