import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {colors, fontFamily} from '../theme';

/**
 * ~20 s explainer without voice: what S-shape does, then how 2-opt improves it.
 * Simplified warehouse: 6 aisles of 100 m, 12 m apart, crossings at the front (0 m), a cross aisle (50 m) and the back (100 m).
 * The numbers on screen are computed here with the same rules as the routing app (serpentine start, first-improvement 2-opt).
 * Bins keep a fixed letter (A… in S-shape order); the strip above the map shows the visiting order, so a reversal is visible
 * as letters flipping, and on the map only the two connections that change are redrawn.
 */
type Bin = [number, number]; // [aisle, metres from the front]
const BINS: Bin[] = [[1, 95], [1, 8], [1, 70], [5, 61], [2, 78], [2, 64], [2, 94], [4, 27], [2, 41], [0, 88]];
const PITCH = 12;
const CROSS = [0, 50, 100];
const N = BINS.length;
const DOOR_BIN: Bin = [0, 0];
const node = (b: number): Bin => (b < 0 ? DOOR_BIN : BINS[b]);

const dist = (a: Bin, b: Bin) =>
  a[0] === b[0] ? Math.abs(a[1] - b[1]) : Math.abs(a[0] - b[0]) * PITCH + Math.min(...CROSS.map((c) => Math.abs(a[1] - c) + Math.abs(b[1] - c)));
const fromDoor = (b: Bin) => 8 + dist(DOOR_BIN, b);
const length = (s: number[]) => fromDoor(BINS[s[0]]) + s.slice(1).reduce((t, k, i) => t + dist(BINS[s[i]], BINS[k]), 0) + fromDoor(BINS[s[N - 1]]);

// S-shape: aisles in order, even aisles front → back, odd aisles back → front.
const SSHAPE = [...BINS.keys()].sort((p, q) => {
  const [a, x] = BINS[p];
  const [b, y] = BINS[q];
  return a !== b ? a - b : a % 2 === 0 ? x - y : y - x;
});
const LETTER = Object.fromEntries(SSHAPE.map((b, k) => [b, 'ABCDEFGHIJKLMNOP'[k]]));

// 2-opt, first improvement (as the app): try every stretch i..j in turn, keep a reversal as soon as it is shorter,
// repeat full passes until one finds nothing. Every try is logged so the strip can replay the scan.
type Try = {i: number; j: number; before: number[]; after: number[]; ok: boolean; len: number; prev: number; pass: number};
const TRY_LOG: Try[] = [];
{
  let s = [...SSHAPE];
  let cur = length(s);
  let improved = true;
  let pass = 0;
  while (improved) {
    improved = false;
    pass++;
    for (let i = 0; i < N - 1; i++) {
      for (let j = i + 1; j < N; j++) {
        const c = [...s.slice(0, i), ...s.slice(i, j + 1).reverse(), ...s.slice(j + 1)];
        const l = length(c);
        const ok = l < cur - 1e-6;
        TRY_LOG.push({i, j, before: s, after: ok ? c : s, ok, len: ok ? l : cur, prev: cur, pass});
        if (ok) {
          s = c;
          cur = l;
          improved = true;
        }
      }
    }
  }
}
const TRIES = TRY_LOG.length;
const KEPT = TRY_LOG.filter((x) => x.ok).length;
const L0 = length(SSHAPE);
const LF = TRY_LOG[TRIES - 1].len;

// ---- drawing ----
const X0 = 300;
const PXM = 13.5;
const Y0 = 870;
const LANE = 86;
const px = (m: number) => X0 + m * PXM;
const py = (lane: number) => Y0 - lane * LANE;
type Pt = [number, number];
const DOOR: Pt = [px(-8), py(0)];

function legPath(a: Bin, b: Bin): Pt[] {
  if (a[0] === b[0]) return [[px(a[1]), py(a[0])], [px(b[1]), py(b[0])]];
  const c = CROSS.reduce((best, k) => (Math.abs(a[1] - k) + Math.abs(b[1] - k) < Math.abs(a[1] - best) + Math.abs(b[1] - best) ? k : best), CROSS[0]);
  return [[px(a[1]), py(a[0])], [px(c), py(a[0])], [px(c), py(b[0])], [px(b[1]), py(b[0])]];
}
// one connection of the route; -1 = the door
function leg(a: number, b: number): Pt[] {
  const p = legPath(node(a), node(b));
  return [...(a < 0 ? [DOOR] : []), ...p, ...(b < 0 ? [DOOR] : [])];
}
const legsOf = (o: number[]) => [-1, ...o].map((a, e) => leg(a, e < N ? o[e] : -1));
const routePts = (o: number[]): Pt[] => legsOf(o).flatMap((l, k) => (k ? l.slice(1) : l));
const toD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const plen = (pts: Pt[]) => pts.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
const pointAt = (pts: Pt[], f: number): Pt => {
  let rest = plen(pts) * f;
  for (let k = 1; k < pts.length; k++) {
    const [a, b] = [pts[k - 1], pts[k]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= l && l > 0) return [a[0] + ((b[0] - a[0]) * rest) / l, a[1] + ((b[1] - a[1]) * rest) / l];
    rest -= l;
  }
  return pts[pts.length - 1];
};

// ---- timeline (seconds) ----
const FAST = 0.034; // a rejected try
const KEEP = 1.45; // a kept reversal: frame it, cut 2 connections, flip, reconnect
const T = {sDraw: 1.6, sDrawEnd: 5.4, opt: 6.4, done: 0, result: 0};
const TRY_AT: number[] = [];
{
  let at = T.opt + 0.5;
  for (const tr of TRY_LOG) {
    TRY_AT.push(at);
    at += tr.ok ? KEEP : FAST;
  }
  T.done = at;
}
T.result = T.done + 1.2;
export const SSHAPE_2OPT_SECONDS = T.result + 3.0;

const Path: React.FC<{pts: Pt[]; color: string; draw?: number; opacity?: number; w?: number; dash?: string}> = ({pts, color, draw = 1, opacity = 1, w = 7, dash}) => {
  const L = plen(pts);
  return (
    <path d={toD(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" opacity={opacity}
      strokeDasharray={dash ?? `${L * draw} ${L + 10}`} style={{filter: `drop-shadow(0 0 8px ${color}aa)`}} />
  );
};

const Tag: React.FC<{at: Pt; color: string; head: string; text?: string; opacity: number}> = ({at, color, head, text, opacity}) => (
  <div style={{position: 'absolute', left: at[0], top: at[1] - 30, transform: 'translate(-50%, -100%)', opacity, whiteSpace: 'nowrap',
    background: color, color: '#0b1222', borderRadius: 12, padding: '5px 14px', fontSize: 22, fontWeight: 800, boxShadow: '0 8px 24px #000a'}}>
    {head}
    {text ? <span style={{fontWeight: 600, marginLeft: 8}}>{text}</span> : null}
  </div>
);

// strip geometry
const CHIP = 64;
const GAP = 14;
const STRIP_Y = 212;
const stripX = (pos: number) => 960 + (pos - (N - 1) / 2) * (CHIP + GAP); // pos -1 / N = door chips

export const SShape2Opt: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};

  const mapIn = interpolate(t, [0.3, 1.1], [0, 1], clamp);
  const draw = interpolate(t, [T.sDraw, T.sDrawEnd], [0, 1], ease);
  const done = t >= T.done;

  // current try
  let k = -1;
  for (let n = 0; n < TRIES && TRY_AT[n] <= t; n++) k = n;
  const tr = k >= 0 ? TRY_LOG[k] : null;
  const u = tr ? t - TRY_AT[k] : 0;
  const keeping = !!tr && tr.ok && u < KEEP && !done;
  const cut = keeping ? interpolate(u, [0.3, 0.6], [0, 1], ease) : 0; // old connections fade
  const flip = keeping ? interpolate(u, [0.6, 1.0], [0, 1], ease) : 0; // letters flip, new connections draw
  const order = !tr ? SSHAPE : keeping && flip < 1 ? tr.before : tr.after;
  const meterLen = !tr ? Math.round(interpolate(t, [T.sDraw, T.sDrawEnd], [0, L0], ease)) : keeping ? Math.round(tr.prev + (tr.len - tr.prev) * flip) : Math.round(tr.after === tr.before ? tr.prev : tr.len);
  const routeColor = done ? colors.green : colors.yellow;

  const stage = t < T.opt ? 1 : t < T.done ? 2 : t < T.result ? 3 : 4;
  // English first (large), Vietnamese below (small)
  const captions: Record<number, [string, string]> = {
    1: ['① S-shape: snake through the aisles → an instant first route', 'Đi chữ S qua các lối có hàng → có ngay lộ trình ban đầu'],
    2: ['② 2-opt: try reversing each stretch in turn → keep it only if shorter', 'Thử đảo lần lượt từng đoạn → ngắn hơn thì giữ, dài hơn thì bỏ'],
    3: ['A full pass finds nothing shorter → stop', 'Thử hết một vòng không còn đoạn nào ngắn hơn → dừng'],
    4: ['S-shape builds the first route, 2-opt fixes its detours', 'S-shape tạo lộ trình ban đầu, 2-opt sửa các đoạn đi vòng'],
  };
  const capStart = [0, 0, T.opt, T.done, T.result][stage];
  const capIn = interpolate(t, [capStart, capStart + 0.35], [0, 1], clamp);
  const titleP = spring({frame, fps, config: {damping: 200}});
  const res = spring({frame: frame - T.result * fps, fps, config: {damping: 200}});
  const stripIn = interpolate(t, [T.opt - 0.4, T.opt], [0, 1], clamp);

  // map legs: during a kept reversal the two changing connections are drawn separately
  const legs = legsOf(order);
  const changing = keeping && flip < 1 ? [tr!.i, tr!.j + 1] : [];
  const before = tr?.before ?? SSHAPE;
  const newLegs = keeping ? [leg(tr!.i ? before[tr!.i - 1] : -1, before[tr!.j]), leg(before[tr!.i], tr!.j + 1 < N ? before[tr!.j + 1] : -1)] : [];
  const oldLegs = keeping ? [leg(tr!.i ? before[tr!.i - 1] : -1, before[tr!.i]), leg(before[tr!.j], tr!.j + 1 < N ? before[tr!.j + 1] : -1)] : [];
  const inStretch = (b: number) => keeping && before.slice(tr!.i, tr!.j + 1).includes(b);

  // strip: chips stay in place; the framed stretch flips like cards (letters swap at mid-flip)
  const stripOrder = keeping && flip >= 0.5 ? tr!.after : keeping ? tr!.before : order;
  const flipping = (p: number) => keeping && p >= tr!.i && p <= tr!.j;
  const frameColor = !tr || done ? null : keeping ? (u < 0.3 ? colors.amber : colors.green) : tr.ok ? colors.green : colors.red;

  return (
    <AbsoluteFill style={{fontFamily, color: colors.text}}>
      <Background />
      {/* title */}
      <div style={{position: 'absolute', left: 80, top: 46, opacity: titleP}}>
        <div style={{fontSize: 54, fontWeight: 800}}>
          S-shape <span style={{color: colors.green}}>+ 2-opt</span>
        </div>
        <div style={{fontSize: 24, color: colors.muted}}>How the algorithm orders the stops</div>
      </div>
      {/* meter */}
      <div style={{position: 'absolute', right: 80, top: 40, textAlign: 'right', opacity: t > T.sDraw - 0.3 ? 1 : 0}}>
        <div style={{fontSize: 20, color: colors.muted, letterSpacing: 2}}>
          <span style={{color: done ? colors.green : tr ? colors.red : colors.yellow, fontWeight: 800}}>{done ? 'S-SHAPE + 2-OPT' : tr ? '2-OPT' : 'S-SHAPE'}</span> · DISTANCE
        </div>
        <div style={{fontSize: 86, fontWeight: 800, lineHeight: 1, color: done ? colors.green : colors.yellow}}>
          {meterLen}
          <span style={{fontSize: 34, color: colors.muted, marginLeft: 8}}>m</span>
        </div>
      </div>

      {/* order strip: the visiting order, with the stretch being tried framed */}
      <div style={{position: 'absolute', inset: 0, opacity: stripIn}}>
        <div style={{position: 'absolute', left: stripX(-1) - CHIP / 2, top: STRIP_Y - 36, fontSize: 18, color: colors.muted, letterSpacing: 2}}>
          VISIT ORDER
        </div>
        <div style={{position: 'absolute', right: 1920 - stripX(N) - CHIP / 2, top: STRIP_Y - 36, fontSize: 18, color: colors.muted}}>
          {tr && !done ? `pass ${tr.pass} · try ${k + 1}` : done ? `${TRIES} tries · ${KEPT} kept` : ''}
        </div>
        {[-1, N].map((p) => (
          <div key={p} style={{position: 'absolute', left: stripX(p) - CHIP / 2, top: STRIP_Y, width: CHIP, height: CHIP, borderRadius: 12,
            background: colors.amber, color: '#0b1222', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            DOOR
          </div>
        ))}
        {stripOrder.map((b, p) => (
          <div key={p} style={{position: 'absolute', left: stripX(p) - CHIP / 2, top: STRIP_Y, width: CHIP, height: CHIP, borderRadius: 32,
            transform: `scaleX(${flipping(p) ? Math.max(0.04, Math.abs(Math.cos(Math.PI * flip))) : 1})`,
            background: flipping(p) ? frameColor ?? routeColor : routeColor, color: '#0b1222', fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {LETTER[b]}
          </div>
        ))}
        {frameColor ? (
          <div style={{position: 'absolute', left: stripX(tr!.i) - CHIP / 2 - 8, top: STRIP_Y - 8, width: stripX(tr!.j) - stripX(tr!.i) + CHIP + 16, height: CHIP + 16,
            border: `4px solid ${frameColor}`, borderRadius: 18, boxShadow: `0 0 16px ${frameColor}88`}} />
        ) : null}
        {keeping ? (
          <div style={{position: 'absolute', left: (stripX(tr!.i) + stripX(tr!.j)) / 2, top: STRIP_Y + CHIP + 14, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
            fontSize: 22, fontWeight: 800, color: u < 0.3 ? colors.amber : colors.green}}>
            {u < 0.3 ? `Reverse ${LETTER[before[tr!.i]]}…${LETTER[before[tr!.j]]}?` : `${Math.round(tr!.prev - tr!.len)} m shorter → keep`}
          </div>
        ) : tr && !done ? (
          <div style={{position: 'absolute', left: (stripX(tr.i) + stripX(tr.j)) / 2, top: STRIP_Y + CHIP + 14, transform: 'translateX(-50%)', fontSize: 22, fontWeight: 800, color: colors.red}}>
            ✗ longer → drop
          </div>
        ) : null}
      </div>

      {/* map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        {Array.from({length: 7}, (_, r) => r).map((r) => {
          const y = py(r - 0.5);
          return [[2, 48], [52, 98]].map(([a, b]) => (
            <rect key={`${r}-${a}`} x={px(a)} y={y - 17} width={(b - a) * PXM} height={34} rx={6} fill="#1a2440" stroke="#26365c" />
          ));
        })}
        {[0, 50, 100].map((c) => (
          <text key={c} x={px(c)} y={py(5.5) - 28} textAnchor="middle" fontSize={17} fontWeight={700} fill={colors.amber}>
            {c === 50 ? 'CROSS AISLE' : c === 0 ? 'FRONT' : 'BACK'}
          </text>
        ))}
        <rect x={DOOR[0] - 70} y={DOOR[1] - 26} width={70} height={52} rx={8} fill={colors.amber} />
        <text x={DOOR[0] - 35} y={DOOR[1] + 7} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0b1222">
          DOOR
        </text>

        {!tr ? (
          <Path pts={routePts(SSHAPE)} color={colors.yellow} draw={draw} />
        ) : (
          <>
            {legs.map((l, e) => (changing.includes(e) ? null : <Path key={e} pts={l} color={routeColor} />))}
            {oldLegs.map((l, n) => (
              <Path key={`o${n}`} pts={l} color={colors.red} w={9} opacity={interpolate(u, [0, 0.12, 0.3, 0.6], [0, 1, 1, 0], clamp)} dash={cut > 0 ? '14 12' : undefined} />
            ))}
            {newLegs.map((l, n) => (
              <Path key={`n${n}`} pts={l} color={colors.green} w={10} draw={flip} opacity={interpolate(u, [KEEP - 0.25, KEEP], [1, 0.0], clamp)} />
            ))}
          </>
        )}

        {BINS.map(([lane, m], b) => {
          const shown = !!tr || SSHAPE.indexOf(b) < Math.ceil(draw * N - 1e-6);
          return (
            <g key={b}>
              <circle cx={px(m)} cy={py(lane)} r={22} fill={shown ? (inStretch(b) ? (u < 0.3 ? colors.amber : colors.green) : routeColor) : '#8f9bb5'} stroke="#0b1222" strokeWidth={4} />
              <text x={px(m)} y={py(lane) + 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0b1222">
                {LETTER[b]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* map tags */}
      {!tr && t >= T.sDraw ? (
        <Tag at={pointAt(routePts(SSHAPE), draw)} color={colors.yellow} head="S-SHAPE" text={draw < 1 ? 'snake' : 'first route'}
          opacity={interpolate(t, [T.sDraw, T.sDraw + 0.3, T.opt - 0.3, T.opt], [0, 1, 1, 0], clamp)} />
      ) : null}
      {keeping
        ? oldLegs.map((l, n) => {
            const p = pointAt(l, 0.5);
            return (
              <div key={n} style={{position: 'absolute', left: p[0], top: p[1], transform: 'translate(-50%, -50%)', opacity: interpolate(u, [0.25, 0.35, 0.6, 0.75], [0, 1, 1, 0], clamp),
                width: 40, height: 40, borderRadius: 20, background: colors.red, color: '#fff', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                ✕
              </div>
            );
          })
        : null}

      {/* caption */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', opacity: capIn, zIndex: 5}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: '10px 28px'}}>
          <div style={{fontSize: 34, fontWeight: 700}}>{captions[stage][0]}</div>
          <div style={{fontSize: 22, color: colors.muted}}>{captions[stage][1]}</div>
        </div>
      </div>

      {/* result: dim + blur the map so only the takeaway is read */}
      {stage === 4 ? (
        <>
          <div style={{position: 'absolute', inset: 0, zIndex: 3, opacity: res, background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(7px)'}} />
          <div style={{position: 'absolute', left: 960, top: 500, zIndex: 4, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * res})`, opacity: res, textAlign: 'center',
            background: '#0e1628', border: '2px solid #ffffff2e', borderRadius: 28, padding: '34px 64px 30px', boxShadow: '0 30px 90px #000'}}>
            <div style={{fontSize: 30, fontWeight: 800}}>What 2-opt did to the S-shape route</div>
            <div style={{fontSize: 20, color: colors.muted, marginBottom: 18}}>2-opt sửa lại lộ trình ban đầu của S-shape</div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 46}}>
              <div>
                <div style={{fontSize: 22, color: colors.muted}}>S-shape (first route)</div>
                <div style={{fontSize: 70, fontWeight: 800, color: colors.yellow, whiteSpace: 'nowrap'}}>{Math.round(L0)} m</div>
              </div>
              <div style={{fontSize: 56, color: colors.muted}}>→</div>
              <div>
                <div style={{fontSize: 22, color: colors.muted}}>after 2-opt</div>
                <div style={{fontSize: 70, fontWeight: 800, color: colors.green, whiteSpace: 'nowrap'}}>{Math.round(LF)} m</div>
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18}}>
              {[`${TRIES} tries`, `${KEPT} kept`, `${Math.round(L0 - LF)} m of detours removed`].map((x) => (
                <div key={x} style={{fontSize: 24, fontWeight: 700, padding: '8px 20px', borderRadius: 30, background: '#ffffff12', border: '1px solid #ffffff22'}}>{x}</div>
              ))}
            </div>
            <div style={{fontSize: 18, color: colors.muted, marginTop: 16}}>Illustrative layout · Sơ đồ minh họa</div>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
