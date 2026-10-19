import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~20 s explainer without voice: how the pallet mover pairs pallets (2 per trip) by savings.
 * Toy example on one aisle, door at 0 m: a trip goes out to its farthest pallet and back.
 * Same rule as planMover in the routing app: saving(a, b) = alone(a) + alone(b) − together(a, b), best pairs first.
 */
const PAL: {name: string; m: number}[] = [
  {name: 'P1', m: 10},
  {name: 'P2', m: 12},
  {name: 'P3', m: 40},
  {name: 'P4', m: 45},
];
const alone = (i: number) => 2 * PAL[i].m;
const together = (i: number, j: number) => 2 * Math.max(PAL[i].m, PAL[j].m);
const PAIRS = PAL.flatMap((_, i) => PAL.map((__, j) => [i, j] as const).filter(([a, b]) => a < b))
  .map(([i, j]) => ({i, j, sep: alone(i) + alone(j), tog: together(i, j), save: alone(i) + alone(j) - together(i, j)}))
  .sort((p, q) => q.save - p.save || p.i - q.i || p.j - q.j);
// greedy matching on savings
const MATE: Record<number, number> = {};
const CHOSEN: number[] = []; // indexes into PAIRS, in pick order
PAIRS.forEach((p, k) => {
  if (MATE[p.i] === undefined && MATE[p.j] === undefined) {
    MATE[p.i] = p.j;
    MATE[p.j] = p.i;
    CHOSEN.push(k);
  }
});
const ALONE_TOTAL = PAL.reduce((t, _, i) => t + alone(i), 0);
const PAIRED_TOTAL = CHOSEN.reduce((t, k) => t + PAIRS[k].tog, 0);
const RANDOM_TOTAL = together(0, 2) + together(1, 3); // P1+P3, P2+P4: pairing that ignores distance

// ---- layout ----
const mx = (m: number) => 300 + m * 30;
const AISLE_Y = 480;
const DOOR_X = mx(0);

// ---- timeline (seconds) ----
const T = {pal: 1.0, alone: 3.4, aloneStep: 0.65, table: 7.0, pick1: 9.0, block: 9.9, pick2: 10.9, pair: 12.4, result: 16.0};
export const MOVER_PAIRING_SECONDS = 20;

const Bar: React.FC<{y: number; to: number; color: string; draw: number; label: string; opacity?: number}> = ({y, to, color, draw, label, opacity = 1}) => {
  const x1 = DOOR_X + (mx(to) - DOOR_X) * draw;
  return (
    <g opacity={draw > 0 ? opacity : 0}>
      <line x1={DOOR_X} y1={y} x2={x1} y2={y} stroke={color} strokeWidth={8} strokeLinecap="round" style={{filter: `drop-shadow(0 0 6px ${color}99)`}} />
      <line x1={mx(to)} y1={y} x2={mx(to)} y2={AISLE_Y - 60} stroke={color} strokeWidth={2} strokeDasharray="6 6" opacity={draw >= 1 ? 0.7 : 0} />
      <text x={x1 + 16} y={y + 9} fontSize={26} fontWeight={800} fill={color} opacity={draw >= 1 ? 1 : 0}>
        {label}
      </text>
    </g>
  );
};

export const MoverPairing: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const titleP = spring({frame, fps, config: {damping: 200}});
  const mapIn = interpolate(t, [0.2, 0.9], [0, 1], clamp);
  const aloneDraw = (i: number) => interpolate(t, [T.alone + i * T.aloneStep, T.alone + (i + 0.8) * T.aloneStep], [0, 1], ease);
  const aloneFade = interpolate(t, [T.pair - 0.4, T.pair], [1, 0], clamp);
  const pairDraw = (n: number) => interpolate(t, [T.pair + n * 0.9, T.pair + n * 0.9 + 0.8], [0, 1], ease);

  // meter
  const aloneSum = Math.round(PAL.reduce((s, _, i) => s + alone(i) * aloneDraw(i), 0));
  const toPaired = interpolate(t, [T.pair, T.pair + 1.8], [0, 1], ease);
  const meter = Math.round(aloneSum + (PAIRED_TOTAL - ALONE_TOTAL) * toPaired);
  const paired = t >= T.pair + 1.8;

  const stage = t < T.alone ? 1 : t < T.table ? 2 : t < T.pair ? 3 : t < T.result ? 4 : 5;
  const captions: Record<number, [string, string]> = {
    1: ['Xe mover chở 2 pallet mỗi chuyến → nên ghép pallet nào đi chung?', 'The mover carries 2 pallets per trip → which pallets should share a trip?'],
    2: [`① Nếu mỗi pallet đi riêng một chuyến: ${ALONE_TOTAL} m`, `One trip per pallet: ${ALONE_TOTAL} m`],
    3: ['② Tính mỗi cặp đi chung tiết kiệm bao nhiêu → chọn cặp tiết kiệm nhất trước', 'Saving of each pair → take the biggest saving first'],
    4: ['③ Pallet gần nhau đi chung một chuyến', 'Pallets close together share a trip'],
    5: ['Ghép theo mét tiết kiệm: cặp lợi nhất được chọn trước', 'Pair by metres saved: the best pair goes first'],
  };
  const capStart = [0, 0, T.alone, T.table, T.pair, T.result][stage];
  const capIn = interpolate(t, [capStart, capStart + 0.35], [0, 1], clamp);

  // table state
  const tableIn = (k: number) => interpolate(t, [T.table + k * 0.22, T.table + k * 0.22 + 0.35], [0, 1], clamp);
  const rowState = (k: number) => {
    const ci = CHOSEN.indexOf(k);
    if (ci >= 0) return t >= (ci === 0 ? T.pick1 : T.pick2) ? 'pick' : 'idle';
    const p = PAIRS[k];
    const first = PAIRS[CHOSEN[0]];
    const blockedByFirst = [first.i, first.j].includes(p.i) || [first.i, first.j].includes(p.j);
    if (blockedByFirst ? t >= T.block : t >= T.pick2 + 0.5) return 'block';
    return 'idle';
  };
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const tableFade = interpolate(t, [T.result - 0.3, T.result], [1, 0.25], clamp);

  // pallet colour: by trip once paired
  const palColor = (i: number) => {
    if (t < T.pick1) return colors.amber;
    const k = CHOSEN.findIndex((c) => PAIRS[c].i === i || PAIRS[c].j === i);
    const at = k === 0 ? T.pick1 : T.pick2;
    return t >= at ? (k === 0 ? colors.green : '#5aa9dc') : colors.amber;
  };
  const tripColors = [colors.green, '#5aa9dc'];

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      <div style={{position: 'absolute', left: 80, top: 46, opacity: titleP}}>
        <div style={{fontSize: 54, fontWeight: 800}}>
          Xe mover <span style={{color: colors.green}}>· ghép 2 pallet / chuyến</span>
        </div>
        <div style={{fontSize: 24, color: colors.muted}}>Thuật toán ghép chuyến theo mét tiết kiệm · Pairing pallets by savings</div>
      </div>
      <div style={{position: 'absolute', right: 80, top: 40, textAlign: 'right', opacity: t > T.alone - 0.2 ? 1 : 0}}>
        <div style={{fontSize: 20, color: colors.muted, letterSpacing: 2}}>
          <span style={{color: paired ? colors.green : colors.yellow, fontWeight: 800}}>{t >= T.pair ? 'GHÉP CẶP' : 'ĐI RIÊNG'}</span> · TỔNG QUÃNG ĐƯỜNG
        </div>
        <div style={{fontSize: 86, fontWeight: 800, lineHeight: 1, color: paired ? colors.green : colors.yellow}}>
          {meter}
          <span style={{fontSize: 34, color: colors.muted, marginLeft: 8}}>m</span>
        </div>
      </div>

      {/* aisle map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        <rect x={mx(0) + 20} y={AISLE_Y - 62} width={mx(48) - mx(0)} height={26} rx={6} fill="#1a2440" stroke="#26365c" />
        <rect x={mx(0) + 20} y={AISLE_Y + 36} width={mx(48) - mx(0)} height={26} rx={6} fill="#1a2440" stroke="#26365c" />
        {[0, 10, 20, 30, 40].map((m) => (
          <text key={m} x={mx(m)} y={AISLE_Y + 100} textAnchor="middle" fontSize={20} fill={colors.muted}>
            {m} m
          </text>
        ))}
        <rect x={DOOR_X - 90} y={AISLE_Y - 28} width={80} height={56} rx={8} fill={colors.amber} />
        <text x={DOOR_X - 50} y={AISLE_Y + 8} textAnchor="middle" fontSize={21} fontWeight={800} fill="#0b1222">
          CỬA
        </text>

        {/* trips: alone first, then paired */}
        {PAL.map((p, i) => (
          <Bar key={p.name} y={400 - i * 44} to={p.m} color={colors.yellow} draw={aloneDraw(i)} label={`${p.name}: ${alone(i)} m`} opacity={aloneFade} />
        ))}
        {CHOSEN.map((k, n) => {
          const p = PAIRS[k];
          const to = Math.max(PAL[p.i].m, PAL[p.j].m);
          return <Bar key={k} y={n === 0 ? 300 : 370} to={to} color={tripColors[n]} draw={pairDraw(n)} label={`${PAL[p.i].name} + ${PAL[p.j].name}: ${p.tog} m`} />;
        })}

        {PAL.map((p, i) => {
          const s = spring({frame: frame - (T.pal + i * 0.18) * fps, fps, config: {damping: 14}});
          return (
            <g key={p.name} transform={`translate(${mx(p.m)} ${AISLE_Y}) scale(${s})`}>
              <rect x={-24} y={-24} width={48} height={48} rx={8} fill={palColor(i)} stroke="#0b1222" strokeWidth={3} />
              <text y={8} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b1222">
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* savings table */}
      <div style={{position: 'absolute', left: 330, top: 600, width: 1260, opacity: tableFade}}>
        <div style={{display: 'flex', fontSize: 19, color: colors.muted, letterSpacing: 1.5, marginBottom: 6, opacity: tableIn(0)}}>
          <div style={{width: 150}}>CẶP</div>
          <div>MÉT TIẾT KIỆM KHI ĐI CHUNG = ĐI RIÊNG − ĐI CHUNG</div>
        </div>
        {PAIRS.map((p, k) => {
          const st = rowState(k);
          const col = st === 'pick' ? tripColors[CHOSEN.indexOf(k)] : st === 'block' ? '#4a5570' : colors.yellow;
          return (
            <div key={k} style={{display: 'flex', alignItems: 'center', height: 46, opacity: tableIn(k + 1) * (st === 'block' ? 0.55 : 1)}}>
              <div style={{width: 150, fontSize: 28, fontWeight: 800, color: st === 'block' ? colors.muted : colors.text, textDecoration: st === 'block' ? 'line-through' : 'none'}}>
                {PAL[p.i].name} + {PAL[p.j].name}
              </div>
              <div style={{width: p.save * 8, height: 24, borderRadius: 6, background: col}} />
              <div style={{marginLeft: 14, fontSize: 26, fontWeight: 800, color: col, width: 110}}>{p.save} m</div>
              <div style={{fontSize: 20, color: colors.muted, width: 200}}>
                = {p.sep} − {p.tog}
              </div>
              <div style={{fontSize: 24, fontWeight: 800, color: col}}>
                {st === 'pick' ? '✓ ghép' : st === 'block' ? 'đã có cặp → bỏ' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', opacity: capIn}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result */}
      {stage === 5 ? (
        <div style={{position: 'absolute', left: 960, top: 745, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * res})`, opacity: res,
          background: '#0b1222f2', border: '2px solid #ffffff33', borderRadius: 26, padding: '26px 54px', display: 'flex', alignItems: 'center', gap: 46, boxShadow: '0 30px 80px #000c'}}>
          {[
            ['Đi riêng', ALONE_TOTAL, colors.muted],
            ['Ghép bừa', RANDOM_TOTAL, colors.red],
            ['Ghép theo tiết kiệm', PAIRED_TOTAL, colors.green],
          ].map(([label, v, c]) => (
            <div key={label as string} style={{textAlign: 'center'}}>
              <div style={{fontSize: 24, color: colors.muted}}>{label}</div>
              <div style={{fontSize: 68, fontWeight: 800, color: c as string, whiteSpace: 'nowrap'}}>{v} m</div>
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
