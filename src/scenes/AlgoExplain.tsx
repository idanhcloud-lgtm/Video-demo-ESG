import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * Explainer without voice, without vehicles or warehouse: how the two mover algorithms work on plain points.
 *  Part 1 – Nearest neighbour: from where you stand, go to the closest point not visited yet; at the end, back to the start.
 *  Part 2 – Savings (Clarke–Wright, 2 points per trip as the mover): start with one out-and-back trip per point;
 *           saving(a, b) = d(a, start) + d(start, b) − d(a, b); merge the pairs with the biggest saving first.
 *  Part 3 – how the app uses them: savings decides who rides together, nearest neighbour orders the stops.
 * Distances are straight lines, shown in metres (1 m = 10 px).
 */
type Pt = [number, number];
const d = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const m = (px: number) => Math.round(px / 10);
const LET = 'ABCDEFGH';

// ---- part 1: nearest neighbour ----
const NN_START: Pt = [430, 820];
const NN_PTS: Pt[] = [[700, 700], [1010, 800], [880, 470], [1260, 610], [1450, 360], [1120, 300]];
const NN_ORDER: number[] = [];
{
  let cur = NN_START;
  const left = NN_PTS.map((_, i) => i);
  while (left.length) {
    left.sort((p, q) => d(cur, NN_PTS[p]) - d(cur, NN_PTS[q]));
    const n = left.shift()!;
    NN_ORDER.push(n);
    cur = NN_PTS[n];
  }
}
const SLOW = 3.0;
const FAST = 1.15;
const NN_T0 = 2.6;
const NN_STEP_AT: number[] = [];
{
  let at = NN_T0;
  for (let k = 0; k <= NN_ORDER.length; k++) {
    NN_STEP_AT.push(at);
    at += k < 2 ? SLOW : FAST;
  }
  NN_STEP_AT.push(at);
}
const NN_END = NN_STEP_AT[NN_STEP_AT.length - 1] + 1.8;

// ---- part 2: savings ----
const SV_START: Pt = [760, 880];
const SV_PTS: Pt[] = [[430, 430], [600, 330], [1010, 340], [1150, 470]];
const SPOKE = SV_PTS.map((p) => d(p, SV_START));
type Pair = {a: number; b: number; save: number; pick: number; blocked: number};
const PAIRS: Pair[] = [];
for (let a = 0; a < SV_PTS.length; a++)
  for (let b = a + 1; b < SV_PTS.length; b++) PAIRS.push({a, b, save: SPOKE[a] + SPOKE[b] - d(SV_PTS[a], SV_PTS[b]), pick: -1, blocked: -1});
PAIRS.sort((p, q) => q.save - p.save);
const PICKS: Pair[] = [];
{
  const used = new Set<number>();
  PAIRS.forEach((p) => {
    if (!used.has(p.a) && !used.has(p.b)) {
      p.pick = PICKS.length;
      PICKS.push(p);
      used.add(p.a);
      used.add(p.b);
    }
  });
  PAIRS.forEach((p) => {
    if (p.pick < 0) p.blocked = Math.min(...PICKS.filter((q) => [q.a, q.b].some((x) => x === p.a || x === p.b)).map((q) => q.pick));
  });
}
const EX = PICKS[0];
const SV_T0 = NN_END + 0.8;
const SV = {pts: SV_T0 + 1.6, spokes: SV_T0 + 2.4, ex: SV_T0 + 5.0, list: SV_T0 + 11.5, pick0: SV_T0 + 13.0, pickStep: 2.8};
const SV_END = SV.pick0 + PICKS.length * SV.pickStep + 1.6;
const pickAt = (k: number) => SV.pick0 + k * SV.pickStep;
const ALONE_TOTAL = SPOKE.reduce((t, x) => t + 2 * x, 0);

// ---- part 3 ----
const P3 = SV_END + 0.6;
export const ALGO_EXPLAIN_SECONDS = Math.ceil(P3 + 7);

const Line: React.FC<{a: Pt; b: Pt; color: string; w?: number; draw?: number; opacity?: number; dash?: string}> = ({a, b, color, w = 5, draw = 1, opacity = 1, dash}) =>
  draw > 0 && opacity > 0 ? (
    <line x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * draw} y2={a[1] + (b[1] - a[1]) * draw} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={opacity}
      strokeDasharray={dash} />
  ) : null;
const Label: React.FC<{a: Pt; b: Pt; text: string; color: string; opacity: number; size?: number}> = ({a, b, text, color, opacity, size = 22}) =>
  opacity > 0 ? (
    <text x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 - 10} textAnchor="middle" fontSize={size} fontWeight={800} fill={color} opacity={opacity}
      stroke="#0b1222" strokeWidth={6} style={{paintOrder: 'stroke'}}>
      {text}
    </text>
  ) : null;
const Dot: React.FC<{p: Pt; label: string; fill: string; scale?: number}> = ({p, label, fill, scale = 1}) => (
  <g transform={`translate(${p[0]} ${p[1]}) scale(${scale})`}>
    <circle r={26} fill={fill} stroke="#0b1222" strokeWidth={4} />
    <text y={9} textAnchor="middle" fontSize={26} fontWeight={800} fill="#0b1222">
      {label}
    </text>
  </g>
);
const Start: React.FC<{p: Pt; scale?: number}> = ({p, scale = 1}) => (
  <g transform={`translate(${p[0]} ${p[1]}) scale(${scale})`}>
    <rect x={-40} y={-26} width={80} height={52} rx={8} fill={colors.amber} />
    <text y={8} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b1222">
      START
    </text>
  </g>
);

export const AlgoExplain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  const fade = (a: number, b: number) => interpolate(t, [a, b], [0, 1], clamp);
  const pop = (at: number) => spring({frame: frame - at * fps, fps, config: {damping: 14}});

  const part = t < NN_END ? 1 : t < P3 ? 2 : 3;
  const partIn = part === 1 ? fade(0, 0.5) * (1 - fade(NN_END - 0.5, NN_END)) : part === 2 ? fade(SV_T0 - 0.6, SV_T0) * (1 - fade(P3 - 0.5, P3)) : fade(P3, P3 + 0.5);

  // ---- part 1 state ----
  const nnK = NN_STEP_AT.findIndex((s, i) => t >= s && t < NN_STEP_AT[i + 1]);
  const nnStep = t < NN_T0 ? -1 : nnK < 0 ? NN_ORDER.length + 1 : nnK; // step k: choose NN_ORDER[k] (k == n: return)
  const nnLocal = nnStep >= 0 && nnStep <= NN_ORDER.length ? (t - NN_STEP_AT[nnStep]) / (NN_STEP_AT[nnStep + 1] - NN_STEP_AT[nnStep]) : 1;
  const nnFrom = (k: number) => (k === 0 ? NN_START : NN_PTS[NN_ORDER[k - 1]]);
  const nnLen = (k: number) => d(nnFrom(k), k < NN_ORDER.length ? NN_PTS[NN_ORDER[k]] : NN_START);
  const nnDone = (k: number) => k < nnStep || (k === nnStep && nnLocal >= 0.62);
  const nnDraw = (k: number) => (k < nnStep ? 1 : k === nnStep ? interpolate(nnLocal, [0.62, 0.95], [0, 1], ease) : 0);
  const nnTotal = Math.round(Array.from({length: NN_ORDER.length + 1}, (_, k) => m(nnLen(k)) * nnDraw(k)).reduce((a, b) => a + b, 0));

  // ---- part 2 state ----
  const merged = (k: number) => interpolate(t, [pickAt(k) + 0.5, pickAt(k) + 1.5], [0, 1], ease);
  const mergedOf = (i: number) => PICKS.findIndex((p, k) => (p.a === i || p.b === i) && t >= pickAt(k) + 0.5);
  const exOn = t >= SV.ex && t < SV.list;
  const exP = (a: number, b: number) => interpolate(t, [SV.ex + a, SV.ex + b], [0, 1], clamp);
  const svTotal = Math.round(m(ALONE_TOTAL) - PICKS.reduce((s, p, k) => s + m(p.save) * merged(k), 0));

  const captions: Record<string, [string, string]> = {
    nn0: ['Nearest neighbour', 'Thuật toán láng giềng gần nhất'],
    nn1: ['From where you are, measure every point not visited yet', 'Từ chỗ đang đứng, đo tới mọi điểm chưa ghé'],
    nn2: ['Go to the closest one, then repeat', 'Đi tới điểm gần nhất, rồi lặp lại'],
    nn3: ['All visited → back to the start', 'Ghé hết → quay về điểm xuất phát'],
    sv0: ['Savings · 2 points per trip', 'Thuật toán Savings · mỗi chuyến 2 điểm'],
    sv1: ['Start: one trip per point, out and back', 'Ban đầu: mỗi điểm một chuyến riêng, đi rồi về'],
    sv2: [`Join ${LET[EX.a]} and ${LET[EX.b]} in one trip: one way back and one way out are no longer needed`, `Gộp ${LET[EX.a]} và ${LET[EX.b]} vào một chuyến: bớt được một lượt về và một lượt đi`],
    sv3: ['Score every pair by metres saved', 'Tính mét tiết kiệm cho mọi cặp'],
    sv4: ['Merge the biggest saving first; a point already paired is skipped', 'Gộp cặp tiết kiệm nhất trước; điểm đã có cặp thì bỏ qua'],
    p3: ['In the app, the two work together', 'Trong ứng dụng, hai thuật toán phối hợp'],
  };
  const capKey =
    part === 1
      ? t < NN_T0 ? 'nn0' : nnStep === 0 && nnLocal < 0.62 ? 'nn1' : nnStep < NN_ORDER.length ? 'nn2' : 'nn3'
      : part === 2
        ? t < SV.spokes ? 'sv0' : t < SV.ex ? 'sv1' : t < SV.list ? 'sv2' : t < SV.pick0 ? 'sv3' : 'sv4'
        : 'p3';
  const capAt: Record<string, number> = {nn0: 0, nn1: NN_T0, nn2: NN_STEP_AT[0] + 0.62 * SLOW, nn3: NN_STEP_AT[NN_ORDER.length], sv0: SV_T0, sv1: SV.spokes, sv2: SV.ex, sv3: SV.list, sv4: SV.pick0, p3: P3};
  const capIn = fade(capAt[capKey], capAt[capKey] + 0.35);

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />

      {/* header */}
      <div style={{position: 'absolute', left: 70, top: 44, opacity: partIn}}>
        <div style={{fontSize: 22, color: colors.muted, letterSpacing: 3}}>{part === 3 ? 'TOGETHER' : `ALGORITHM ${part} OF 2`}</div>
        <div style={{fontSize: 54, fontWeight: 800, color: part === 1 ? colors.yellow : part === 2 ? colors.green : colors.text}}>
          {part === 1 ? 'Nearest neighbour' : part === 2 ? 'Savings' : 'How the app uses them'}
        </div>
        <div style={{fontSize: 22, color: colors.muted}}>{part === 1 ? 'Láng giềng gần nhất' : part === 2 ? 'Tiết kiệm (Clarke–Wright)' : 'Cách ứng dụng kết hợp'}</div>
      </div>
      {part < 3 ? (
        <div style={{position: 'absolute', right: 80, top: 50, textAlign: 'right', opacity: partIn * (part === 1 ? fade(NN_T0, NN_T0 + 0.3) : fade(SV.spokes, SV.spokes + 0.6))}}>
          <div style={{fontSize: 20, color: colors.muted, letterSpacing: 2}}>TOTAL DISTANCE</div>
          <div style={{fontSize: 80, fontWeight: 800, lineHeight: 1, color: part === 1 ? colors.yellow : colors.green}}>
            {part === 1 ? nnTotal : svTotal}
            <span style={{fontSize: 32, color: colors.muted, marginLeft: 8}}>m</span>
          </div>
        </div>
      ) : null}

      {/* ---- part 1 ---- */}
      {part === 1 ? (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: partIn}}>
          {/* candidate lines of the current step */}
          {nnStep >= 0 && nnStep < NN_ORDER.length
            ? NN_ORDER.slice(nnStep).map((i) => {
                const from = nnFrom(nnStep);
                const best = i === NN_ORDER[nnStep];
                const show = interpolate(nnLocal, [0, 0.22], [0, 1], clamp);
                const keep = best ? 1 : interpolate(nnLocal, [0.42, 0.6], [1, 0], clamp);
                const slow = nnStep < 2;
                return (
                  <g key={i}>
                    <Line a={from} b={NN_PTS[i]} color={best && nnLocal > 0.42 ? colors.green : '#8f9bb5'} w={best && nnLocal > 0.42 ? 5 : 3} draw={show} opacity={keep * 0.9} dash="10 9" />
                    {slow ? <Label a={from} b={NN_PTS[i]} text={`${m(d(from, NN_PTS[i]))} m`} color={best && nnLocal > 0.42 ? colors.green : colors.muted} opacity={show * keep} /> : null}
                  </g>
                );
              })
            : null}
          {/* chosen legs */}
          {Array.from({length: NN_ORDER.length + 1}, (_, k) => (
            <Line key={k} a={nnFrom(k)} b={k < NN_ORDER.length ? NN_PTS[NN_ORDER[k]] : NN_START} color={colors.yellow} w={7} draw={nnDraw(k)} />
          ))}
          <Start p={NN_START} scale={pop(0.6)} />
          {NN_PTS.map((p, i) => {
            const k = NN_ORDER.indexOf(i);
            return <Dot key={i} p={p} label={nnDone(k) ? String(k + 1) : LET[i]} fill={nnDone(k) ? colors.yellow : '#8f9bb5'} scale={pop(0.9 + i * 0.15)} />;
          })}
          {/* you are here */}
          {nnStep >= 0 && nnStep <= NN_ORDER.length ? (
            <circle cx={nnFrom(nnStep)[0]} cy={nnFrom(nnStep)[1]} r={40 + 6 * Math.sin(t * 6)} fill="none" stroke="#fff" strokeWidth={3} opacity={nnLocal < 0.62 ? 0.9 : 0} />
          ) : null}
        </svg>
      ) : null}

      {/* ---- part 2 ---- */}
      {part === 2 ? (
        <>
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: partIn}}>
            {/* each point starts with an out lane (solid) and a back lane (dotted); merging a with b removes the back lane of a and the out lane of b, drawn as one dotted lane per point */}
            {SV_PTS.map((p, i) => {
              const k = mergedOf(i);
              const spokeIn = interpolate(t, [SV.spokes + i * 0.25, SV.spokes + i * 0.25 + 0.6], [0, 1], ease);
              const exRed = exOn && (i === EX.a || i === EX.b) ? exP(1.2, 1.6) : 0;
              const col = k >= 0 ? colors.green : exRed > 0 ? colors.red : '#8f9bb5';
              return (
                <g key={i}>
                  <Line a={SV_START} b={p} color={col} w={k >= 0 ? 7 : 5} draw={spokeIn} />
                  {/* the second (return) lane of an out-and-back trip */}
                  <Line a={[SV_START[0] + 12, SV_START[1]]} b={[p[0] + 12, p[1]]} color={exRed > 0 || (k >= 0 && merged(k) < 1) ? colors.red : '#8f9bb5'} w={4}
                    draw={spokeIn} opacity={k >= 0 ? 1 - merged(k) : exOn ? 1 - exP(3.0, 3.6) * 0.75 : 0.8} dash="2 10" />
                  {t >= SV.spokes && t < SV.list ? (
                    <Label a={SV_START} b={p} text={`${m(SPOKE[i])} m`} color={exRed > 0 ? colors.red : colors.muted} opacity={spokeIn * (1 - (k >= 0 ? 1 : 0))} size={20} />
                  ) : null}
                </g>
              );
            })}
            {/* worked example: the join edge */}
            {exOn ? (
              <>
                <Line a={SV_PTS[EX.a]} b={SV_PTS[EX.b]} color={colors.green} w={7} draw={exP(2.2, 2.9)} />
                <Label a={SV_PTS[EX.a]} b={SV_PTS[EX.b]} text={`${m(d(SV_PTS[EX.a], SV_PTS[EX.b]))} m`} color={colors.green} opacity={exP(2.7, 3.0)} />
              </>
            ) : null}
            {/* merged pairs: the join edge */}
            {PICKS.map((p, k) => (
              <Line key={k} a={SV_PTS[p.a]} b={SV_PTS[p.b]} color={colors.green} w={7} draw={merged(k)} />
            ))}
            <Start p={SV_START} scale={pop(SV_T0 + 0.8)} />
            {SV_PTS.map((p, i) => (
              <Dot key={i} p={p} label={LET[i]} fill={mergedOf(i) >= 0 ? colors.green : colors.amber} scale={pop(SV_T0 + 1.0 + i * 0.15)} />
            ))}
          </svg>
          {/* worked example formula */}
          {exOn ? (
            <div style={{position: 'absolute', left: 1240, top: 300, width: 600, opacity: exP(3.2, 3.6) * (1 - fade(SV.list - 0.4, SV.list))}}>
              <div style={{fontSize: 24, color: colors.muted, marginBottom: 10}}>
                Saving · Tiết kiệm ({LET[EX.a]}, {LET[EX.b]})
              </div>
              <div style={{fontSize: 40, fontWeight: 800, lineHeight: 1.5}}>
                <span style={{color: colors.red}}>{m(SPOKE[EX.a])}</span> + <span style={{color: colors.red}}>{m(SPOKE[EX.b])}</span> − <span style={{color: colors.green}}>{m(d(SV_PTS[EX.a], SV_PTS[EX.b]))}</span>
              </div>
              <div style={{fontSize: 64, fontWeight: 800, color: colors.green, opacity: exP(4.2, 4.6)}}>= {m(EX.save)} m</div>
              <div style={{fontSize: 20, color: colors.muted, marginTop: 8, opacity: exP(4.2, 4.6)}}>
                <span style={{color: colors.red}}>red</span> = removed · <span style={{color: colors.green}}>green</span> = added
              </div>
            </div>
          ) : null}
          {/* ranking */}
          <div style={{position: 'absolute', left: 1240, top: 250, width: 620, opacity: fade(SV.list, SV.list + 0.4) * partIn}}>
            <div style={{fontSize: 20, color: colors.muted, letterSpacing: 2, marginBottom: 8}}>EVERY PAIR · METRES SAVED</div>
            {PAIRS.map((p, r) => {
              const picked = p.pick >= 0 && t >= pickAt(p.pick);
              const blocked = p.blocked >= 0 && t >= pickAt(p.blocked) + 1.2;
              const col = picked ? colors.green : blocked ? '#4a5570' : colors.yellow;
              return (
                <div key={r} style={{display: 'flex', alignItems: 'center', height: 56, opacity: fade(SV.list + 0.2 + r * 0.12, SV.list + 0.5 + r * 0.12) * (blocked ? 0.45 : 1),
                  background: picked ? `${colors.green}22` : 'transparent', borderRadius: 10, paddingLeft: 10}}>
                  <div style={{width: 110, fontSize: 30, fontWeight: 800, textDecoration: blocked ? 'line-through' : 'none'}}>
                    {LET[p.a]}–{LET[p.b]}
                  </div>
                  <div style={{width: Math.max(6, m(p.save) * 4), height: 22, borderRadius: 5, background: col}} />
                  <div style={{marginLeft: 12, fontSize: 28, fontWeight: 800, color: col}}>{m(p.save)} m</div>
                  <div style={{marginLeft: 16, fontSize: 24, fontWeight: 800, color: col}}>{picked ? '✓' : blocked ? '✗' : ''}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* ---- part 3 ---- */}
      {part === 3 ? (
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60, opacity: partIn}}>
          {[
            {n: '1', name: 'Savings', col: colors.green, en: 'decides which pallets ride together', vi: 'quyết định pallet nào đi chung chuyến', at: P3 + 0.4},
            {n: '2', name: 'Nearest neighbour', col: colors.yellow, en: 'orders the stops inside each trip', vi: 'sắp thứ tự ghé trong từng chuyến', at: P3 + 1.6},
          ].map((c) => (
            <div key={c.n} style={{width: 640, padding: '36px 40px', borderRadius: 24, background: '#0e1628', border: `3px solid ${c.col}`, opacity: fade(c.at, c.at + 0.4),
              transform: `translateY(${(1 - fade(c.at, c.at + 0.4)) * 30}px)`}}>
              <div style={{fontSize: 24, color: colors.muted, letterSpacing: 2}}>STEP {c.n}</div>
              <div style={{fontSize: 52, fontWeight: 800, color: c.col}}>{c.name}</div>
              <div style={{fontSize: 32, fontWeight: 700, marginTop: 14}}>{c.en}</div>
              <div style={{fontSize: 22, color: colors.muted, marginTop: 6}}>{c.vi}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', opacity: capIn, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{captions[capKey][0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{captions[capKey][1]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
