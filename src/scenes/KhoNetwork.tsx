import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {KHO, PLACES, type Kho} from '../data/khoDT';
import vnMap from '../data/vnMap.json';
import {colors, fontFamily} from '../theme';

/**
 * Duy Tan warehouse network, no voice: the whole map of Vietnam with every warehouse, then the camera flies to each
 * warehouse in turn and its card shows the figures; it ends on a summary of all seven.
 * Vietnamese is the large line, English the small one.
 */
const FPS = 30;
const BLUE = '#1f6fe5';

// ---- projection: lon/lat → world px (1 at zoom 1), equirectangular around 16°N ----
const K = 58;
const COSL = Math.cos((16 * Math.PI) / 180);
const wx = (lon: number) => (lon - 109.5) * K * COSL;
const wy = (lat: number) => -(lat - 15.4) * K;
const ringPath = (r: number[][]) => r.map(([lo, la], i) => `${i ? 'L' : 'M'}${wx(lo).toFixed(1)} ${wy(la).toFixed(1)}`).join('') + 'Z';
const linePath = (r: number[][]) => r.map(([lo, la], i) => `${i ? 'L' : 'M'}${wx(lo).toFixed(1)} ${wy(la).toFixed(1)}`).join('');
const VN_D = (vnMap.vn as number[][][]).map(ringPath).join('');
const NB_D = (vnMap.neighbours as number[][][]).map(ringPath).join('');
const RIV_D = (vnMap.rivers as number[][][]).map(linePath).join('');

// ---- camera keyframes ----
type Cam = {lon: number; lat: number; z: number; sx: number}; // sx: screen x of the camera centre
const OVERVIEW: Cam = {lon: 109.2, lat: 15.6, z: 1, sx: 960};
const CARD_SX = 650; // map centre while a card is open on the right
const camFor = (k: Kho): Cam => ({lon: k.lon, lat: k.lat, z: k.region === 'north' ? 9 : k.hub ? 34 : 30, sx: CARD_SX});

// ---- timeline (seconds) ----
const T_TITLE_OUT = 4.5;
const T_MAP = 4.0;
const T_PINS = 6.0;
const FLY = 1.8;
const STAY = (k: Kho) => (k.hub ? 10 : k.estimated ? 6.5 : 7.5);
type Seg = {kho: Kho; at: number; arrive: number; leave: number};
const SEGS: Seg[] = [];
const KEYS: {at: number; cam: Cam}[] = [{at: 0, cam: OVERVIEW}, {at: 12.5, cam: OVERVIEW}];
{
  let t = 12.5;
  KHO.forEach((k, i) => {
    // north → south: back out to the whole map on the way
    if (i > 0 && KHO[i - 1].region !== k.region) {
      KEYS.push({at: t + FLY, cam: {...OVERVIEW, lat: 14.5, z: 1.4, sx: 900}});
      t += FLY;
    }
    const arrive = t + FLY;
    KEYS.push({at: arrive, cam: camFor(k)});
    const leave = arrive + STAY(k);
    KEYS.push({at: leave, cam: camFor(k)});
    SEGS.push({kho: k, at: t, arrive, leave});
    t = leave;
  });
  KEYS.push({at: t + 2.2, cam: {lon: 108.4, lat: 15.6, z: 1, sx: 620}});
}
const T_SUMMARY = KEYS[KEYS.length - 1].at;
const T_END = T_SUMMARY + 9;
export const KHO_NETWORK_SECONDS = Math.ceil(T_END + 4);

const camAt = (t: number): Cam => {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].at <= t) i++;
  if (i >= KEYS.length - 1) return KEYS[KEYS.length - 1].cam;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const u = Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))));
  const lz = Math.log(a.cam.z) + (Math.log(b.cam.z) - Math.log(a.cam.z)) * u;
  return {lon: a.cam.lon + (b.cam.lon - a.cam.lon) * u, lat: a.cam.lat + (b.cam.lat - a.cam.lat) * u, z: Math.exp(lz), sx: a.cam.sx + (b.cam.sx - a.cam.sx) * u};
};

const nf = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Duy Tan logo on its white plate. */
const Logo: React.FC<{h: number}> = ({h}) => (
  <div style={{background: '#fff', borderRadius: h * 0.18, padding: `${h * 0.14}px ${h * 0.3}px`, boxShadow: '0 4px 16px rgba(0,0,0,0.45)', display: 'inline-flex'}}>
    <Img src={staticFile('brand/duytan.png')} style={{height: h, display: 'block'}} />
  </div>
);

const STAT_DEFS: {key: keyof Kho['stats']; vi: string; en: string; unit: string}[] = [
  {key: 'area', vi: 'Diện tích', en: 'Area', unit: 'm²'},
  {key: 'capacity', vi: 'Sức chứa', en: 'Capacity', unit: 'tấn'},
  {key: 'pallets', vi: 'Vị trí pallet', en: 'Pallet positions', unit: ''},
  {key: 'sku', vi: 'Mã hàng', en: 'SKU', unit: ''},
  {key: 'forklifts', vi: 'Xe nâng', en: 'Forklifts', unit: ''},
  {key: 'staff', vi: 'Nhân sự', en: 'Employees', unit: ''},
];

const Card: React.FC<{seg: Seg; t: number}> = ({seg, t}) => {
  const k = seg.kho;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const inn = interpolate(t, [seg.arrive - 0.5, seg.arrive + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const out = interpolate(t, [seg.leave - 0.1, seg.leave + 0.5], [1, 0], clamp);
  const o = inn * out;
  if (o <= 0) return null;
  const count = interpolate(t, [seg.arrive, seg.arrive + 1.2], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', right: 56, top: 112, width: 700, opacity: o, transform: `translateX(${(1 - inn) * 60}px)`,
      background: 'rgba(9,15,30,0.94)', border: `2px solid ${k.hub ? colors.green : '#2a3b62'}`, borderRadius: 24, padding: '30px 34px',
      boxShadow: '0 16px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 16}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
        {k.hub ? <span style={{fontSize: 18, fontWeight: 800, letterSpacing: 1.5, color: '#06251a', background: colors.green, borderRadius: 999, padding: '4px 14px'}}>KHO TRUNG TÂM · HUB</span> : null}
        <span style={{fontSize: 18, fontWeight: 700, letterSpacing: 1.5, color: '#cfe0ff', background: '#1a2c55', borderRadius: 999, padding: '4px 14px'}}>
          {k.region === 'north' ? 'MIỀN BẮC · NORTH' : 'MIỀN NAM · SOUTH'}
        </span>
        {k.estimated ? <span style={{fontSize: 18, fontWeight: 700, color: '#2a1d00', background: colors.amber, borderRadius: 999, padding: '4px 14px'}}>Số liệu tạm tính · Estimated</span> : null}
      </div>
      <div>
        <div style={{fontSize: 40, fontWeight: 800, lineHeight: 1.15}}>{k.vi}</div>
        <div style={{fontSize: 22, color: colors.muted}}>{k.en}</div>
      </div>
      <div style={{fontSize: 24, fontWeight: 600, color: colors.green}}>
        {k.role[0]} <span style={{fontSize: 19, fontWeight: 500, color: colors.muted}}>· {k.role[1]}</span>
      </div>
      <div style={{fontSize: 19, color: '#c9d1e3', lineHeight: 1.4, borderLeft: `3px solid ${BLUE}`, paddingLeft: 12}}>{k.address}</div>
      <div style={{display: 'flex', gap: 12, height: 210}}>
        {k.photos.length ? (
          k.photos.map((p) => <Img key={p} src={staticFile(p)} style={{flex: 1, minWidth: 0, height: 210, objectFit: 'cover', borderRadius: 14}} />)
        ) : (
          <div style={{flex: 1, borderRadius: 14, border: '2px dashed #3a4a70', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.muted}}>
            <div style={{fontSize: 24, fontWeight: 600}}>Hình ảnh đang cập nhật</div>
            <div style={{fontSize: 18}}>Photo coming soon</div>
          </div>
        )}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10}}>
        {STAT_DEFS.map((d) => {
          const v = k.stats[d.key];
          const txt = v === null ? '—' : typeof v === 'number' ? nf(v * count) : v;
          return (
            <div key={d.key} style={{background: '#101a33', borderRadius: 14, padding: '12px 16px'}}>
              <div style={{fontSize: typeof v === 'string' ? 20 : 34, fontWeight: 800, lineHeight: 1.15, color: k.estimated ? '#f0d58a' : '#fff', minHeight: 40}}>
                {txt}
                {d.unit && typeof v === 'number' ? <span style={{fontSize: 18, fontWeight: 600, color: colors.muted}}> {d.unit}</span> : null}
              </div>
              <div style={{fontSize: 18, fontWeight: 600, color: '#c9d1e3'}}>
                {d.vi} <span style={{fontSize: 15, fontWeight: 500, color: colors.muted}}>· {d.en}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Summary: React.FC<{t: number}> = ({t}) => {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const o = interpolate(t, [T_SUMMARY - 0.4, T_SUMMARY + 0.4, T_END - 0.5, T_END], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  const maxA = Math.max(...KHO.map((k) => k.stats.area));
  const totA = KHO.reduce((s, k) => s + k.stats.area, 0);
  const totP = KHO.reduce((s, k) => s + k.stats.pallets, 0);
  const rows = [...KHO].sort((a, b) => b.stats.area - a.stats.area);
  return (
    <div style={{position: 'absolute', right: 56, top: 112, width: 760, opacity: o, background: 'rgba(9,15,30,0.94)', border: '2px solid #2a3b62', borderRadius: 24,
      padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 14}}>
      <div>
        <div style={{fontSize: 38, fontWeight: 800}}>7 kho · 2 miền</div>
        <div style={{fontSize: 22, color: colors.muted}}>7 warehouses · 2 regions</div>
      </div>
      {rows.map((k, i) => {
        const g = interpolate(t, [T_SUMMARY + 0.2 + i * 0.12, T_SUMMARY + 1.0 + i * 0.12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return (
          <div key={k.id} style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{width: 230, fontSize: 21, fontWeight: k.hub ? 800 : 600, color: k.hub ? colors.green : '#fff', whiteSpace: 'nowrap'}}>
              {k.vi.replace(/ \(.*\)/, '').replace('Kho ', '')}
              {k.estimated ? <span style={{color: colors.amber}}> *</span> : null}
            </div>
            <div style={{flex: 1, height: 22, background: '#101a33', borderRadius: 6, overflow: 'hidden'}}>
              <div style={{width: `${(k.stats.area / maxA) * 100 * g}%`, height: '100%', borderRadius: 6,
                background: k.hub ? colors.green : k.estimated ? `repeating-linear-gradient(45deg, ${colors.amber}, ${colors.amber} 8px, #b8892d 8px, #b8892d 16px)` : BLUE}} />
            </div>
            <div style={{width: 130, textAlign: 'right', fontSize: 21, fontWeight: 700}}>{nf(k.stats.area)} m²</div>
          </div>
        );
      })}
      <div style={{display: 'flex', gap: 12, marginTop: 6}}>
        {[
          {v: `${nf(totA)} m²`, vi: 'Tổng diện tích', en: 'Total area'},
          {v: nf(totP), vi: 'Tổng vị trí pallet', en: 'Total pallet positions'},
        ].map((s) => (
          <div key={s.vi} style={{flex: 1, background: '#101a33', borderRadius: 14, padding: '12px 16px'}}>
            <div style={{fontSize: 34, fontWeight: 800}}>{s.v}</div>
            <div style={{fontSize: 18, fontWeight: 600, color: '#c9d1e3'}}>
              {s.vi} <span style={{fontSize: 15, color: colors.muted}}>· {s.en}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{fontSize: 17, color: colors.amber}}>* Số liệu tạm tính, cập nhật sau · Estimated, to be confirmed</div>
    </div>
  );
};

export const KhoNetwork: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const cam = camAt(t);
  const toScreen = (lon: number, lat: number): [number, number] => [cam.sx + (wx(lon) - wx(cam.lon)) * cam.z, 560 + (wy(lat) - wy(cam.lat)) * cam.z];
  const mapIn = interpolate(t, [T_MAP, T_MAP + 1.5], [0, 1], clamp);
  const titleO = interpolate(t, [0.3, 1.0, T_TITLE_OUT - 0.6, T_TITLE_OUT], [0, 1, 1, 0], clamp);
  const endO = interpolate(t, [T_END, T_END + 0.8], [0, 1], clamp);
  const seg = SEGS.find((s) => t >= s.at && t < s.leave + 0.6);
  const active = seg && t >= seg.arrive - 0.6 ? seg.kho.id : null;
  // labels next to pins only once the camera is close enough to keep them apart
  const showNames = cam.z > 6;
  const sat = vnMap as unknown as {hoangSa: number[][]; truongSa: number[][]};
  const hs = toScreen(112.0, 17.0);
  const ts = toScreen(115.0, 9.4);

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 45% 50%, #0d1c3a 0%, #060a16 75%)', fontFamily, color: '#fff'}}>
      {/* map */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: mapIn}}>
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d3d78" />
            <stop offset="1" stopColor="#163265" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g transform={`translate(${cam.sx - wx(cam.lon) * cam.z} ${560 - wy(cam.lat) * cam.z}) scale(${cam.z})`}>
          <path d={NB_D} fill="#111b33" stroke="#22304f" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={VN_D} fill="#3d7bff" opacity={0.35} filter="url(#glow)" />
          <path d={VN_D} fill="url(#land)" stroke="#5a9bff" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <path d={RIV_D} fill="none" stroke="#4f86d8" strokeWidth={cam.z > 6 ? 1.6 : 0.8} opacity={0.55} vectorEffect="non-scaling-stroke" />
        </g>
        {/* archipelagos: islands as dots so they read at any zoom */}
        {[...sat.hoangSa, ...sat.truongSa].map(([lo, la], i) => {
          const [x, y] = toScreen(lo, la);
          return <circle key={i} cx={x} cy={y} r={2.6} fill="#7fb0ff" />;
        })}
      </svg>
      <div style={{position: 'absolute', left: hs[0] + 14, top: hs[1] - 46, opacity: mapIn * (cam.z < 2 ? 1 : 0), fontSize: 18, fontWeight: 600, color: '#9ec3ff', whiteSpace: 'nowrap'}}>
        Quần đảo Hoàng Sa
      </div>
      <div style={{position: 'absolute', left: ts[0] - 60, top: ts[1] + 40, opacity: mapIn * (cam.z < 2 ? 1 : 0), fontSize: 18, fontWeight: 600, color: '#9ec3ff', whiteSpace: 'nowrap'}}>
        Quần đảo Trường Sa
      </div>
      <div style={{position: 'absolute', left: toScreen(112.6, 13.2)[0], top: toScreen(112.6, 13.2)[1], opacity: mapIn * 0.6 * (cam.z < 2 ? 1 : 0), fontSize: 22, fontWeight: 600,
        letterSpacing: 6, color: '#5d86c9', whiteSpace: 'nowrap', transform: 'translateX(-50%)'}}>
        BIỂN ĐÔNG
      </div>

      {/* place names for orientation */}
      {PLACES.map((p) => {
        const [x, y] = toScreen(p.lon, p.lat);
        const show = p.size === 'big' || cam.z > 6;
        // close in, a city next to a warehouse puts its name above the dot, clear of the warehouse labels
        const near = cam.z > 6 && KHO.some((k) => Math.abs(k.lon - p.lon) < 0.2 && Math.abs(k.lat - p.lat) < 0.2);
        return (
          <div key={p.vi} style={{position: 'absolute', left: x, top: y, opacity: mapIn * (show ? 0.8 : 0), transform: 'translate(-50%, -50%)', display: 'flex',
            flexDirection: near ? 'column-reverse' : 'row', alignItems: 'center', gap: 6}}>
            <div style={{width: 7, height: 7, borderRadius: 4, background: '#9fb3d9'}} />
            <div style={{fontSize: cam.z > 6 ? 22 : 17, fontWeight: 600, color: '#b8c7e6', whiteSpace: 'nowrap'}}>{p.vi}</div>
          </div>
        );
      })}

      {/* warehouse pins */}
      {KHO.map((k, i) => {
        const [x, y] = toScreen(k.lon, k.lat);
        const pop = spring({frame: frame - (T_PINS + i * 0.35) * fps, fps, config: {damping: 11}});
        const on = active === k.id;
        const r = k.hub ? 15 : 11;
        const pulse = on ? (t * 1.2) % 1 : 0;
        const col = k.hub ? colors.green : k.estimated ? colors.amber : BLUE;
        const labelOn = showNames || on;
        return (
          <div key={k.id} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})`, opacity: mapIn}}>
            {on ? <div style={{position: 'absolute', left: -r * 3 + r, top: -r * 3 + r, width: r * 4, height: r * 4, borderRadius: '50%', border: `3px solid ${col}`,
              transform: `scale(${0.6 + pulse * 1.4})`, opacity: 1 - pulse}} /> : null}
            <div style={{width: r * 2, height: r * 2, borderRadius: '50%', background: col, border: '3px solid #fff', boxShadow: `0 0 18px ${col}`}} />
            <div style={{position: 'absolute', left: r * 2 + 10, top: r - 15, whiteSpace: 'nowrap', fontSize: on ? 24 : 19, fontWeight: on ? 800 : 600,
              color: on ? '#fff' : '#dbe6ff', opacity: labelOn ? 1 : 0, textShadow: '0 2px 6px rgba(0,0,0,0.9)'}}>
              {k.vi.replace(/ \(.*\)/, '')}
            </div>
          </div>
        );
      })}

      {/* overview chip and legend */}
      <div style={{position: 'absolute', left: 56, bottom: 52, opacity: mapIn * Math.min(interpolate(t, [T_PINS + 2.5, T_PINS + 3.2], [0, 1], clamp),
        // only on the whole map: close in it would sit on the warehouse labels
        interpolate(cam.z, [1.6, 2.6], [1, 0], clamp)),
        display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(9,15,30,0.85)', border: '1px solid #2a3b62', borderRadius: 16, padding: '16px 22px'}}>
        <div style={{fontSize: 30, fontWeight: 800}}>
          7 kho · 2 miền <span style={{fontSize: 20, fontWeight: 500, color: colors.muted}}>7 warehouses · 2 regions</span>
        </div>
        <div style={{display: 'flex', gap: 22, fontSize: 18, color: '#c9d1e3'}}>
          {[
            {c: colors.green, vi: 'Kho trung tâm', en: 'Hub'},
            {c: BLUE, vi: 'Kho vệ tinh', en: 'Satellite'},
            {c: colors.amber, vi: 'Số liệu tạm tính', en: 'Estimated'},
          ].map((l) => (
            <div key={l.vi} style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <div style={{width: 14, height: 14, borderRadius: 7, background: l.c, border: '2px solid #fff'}} />
              {l.vi} <span style={{color: colors.muted}}>· {l.en}</span>
            </div>
          ))}
        </div>
      </div>

      {SEGS.map((s) => <Card key={s.kho.id} seg={s} t={t} />)}
      <Summary t={t} />

      {/* logo in the corner once the map is up */}
      <div style={{position: 'absolute', left: 56, top: 40, opacity: interpolate(t, [T_MAP + 0.5, T_MAP + 1.2], [0, 1], clamp) * (1 - endO)}}>
        <Logo h={38} />
      </div>

      {/* title */}
      <AbsoluteFill style={{opacity: titleO, alignItems: 'center', justifyContent: 'center', gap: 26, background: 'rgba(6,10,22,0.9)'}}>
        <Logo h={64} />
        <div style={{fontSize: 76, fontWeight: 800, letterSpacing: 2, transform: `translateY(${interpolate(t, [0.3, 1.2], [20, 0], clamp)}px)`}}>
          Hệ thống kho <span style={{color: '#5aa2ff'}}>Duy Tân</span>
        </div>
        <div style={{fontSize: 32, color: colors.muted}}>Duy Tan Warehouse Network</div>
      </AbsoluteFill>

      {/* end */}
      <AbsoluteFill style={{opacity: endO, alignItems: 'center', justifyContent: 'center', gap: 22, background: 'rgba(6,10,22,0.92)'}}>
        <Logo h={64} />
        <div style={{fontSize: 56, fontWeight: 800}}>
          Hệ thống kho <span style={{color: '#5aa2ff'}}>Duy Tân</span>
        </div>
        <div style={{fontSize: 26, color: colors.muted}}>Duy Tan Warehouse Network</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

