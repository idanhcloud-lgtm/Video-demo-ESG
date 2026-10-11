import {AbsoluteFill} from 'remotion';
import {Forklift} from '../components/Forklift';
import {MapBase} from '../components/MapBase';
import {routePixels} from '../components/RoutePanel';
import {TO28, TO28_DOOR, TO28_OPTIMIZED} from '../data/to28';
import {MAP, laneYpx, project, vtX} from '../layout';
import {aisleOrder, stopPoint} from '../map/route';
import {colors, fontFamily} from '../theme';

/**
 * Static figures for the "limitations" slides (4–9): the demo map (doors left = dispatch,
 * far end = receiving) with the 28 stops of the demo TO, annotated per limitation.
 */
export type FigureVariant = 'overview' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
export const FIGURE = {width: 1800, height: 1494};

type Pt = [number, number];
const current = aisleOrder(TO28);
const algo = TO28_OPTIMIZED;
const CUR = routePixels(current, TO28_DOOR);
const ALG = routePixels(algo, TO28_DOOR);
const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const legs = (r: typeof CUR, from: number, to: number) => r.pts.slice(r.stopIdx[from - 1], r.stopIdx[to - 1] + 1);

// View box in map pixels: map (0..897) + receiving band on the right, heading strip on top.
const VB = {x: -6, y: -96, w: 966, h: 966 / (FIGURE.width / FIGURE.height)};
const RECV_X = 884;

const Dot: React.FC<{s: (typeof TO28)[number]; n?: number; color?: string; dim?: boolean; r?: number}> = ({s, n, color = colors.yellow, dim, r = 9}) => {
  const [x, y] = project(...stopPoint(s));
  return (
    <g opacity={dim ? 0.3 : 1}>
      <circle cx={x} cy={y} r={n ? 13 : r} fill={color} stroke="#0b1222" strokeWidth={2} />
      {n ? (
        <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill={color === colors.green ? '#062016' : '#ffffff'}>
          {n}
        </text>
      ) : null}
    </g>
  );
};

const Label: React.FC<{x: number; y: number; text: string; sub?: string; color: string; anchor?: 'start' | 'middle' | 'end'; w?: number}> = ({
  x,
  y,
  text,
  sub,
  color,
  anchor = 'middle',
  w = 250,
}) => {
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const h = sub ? 50 : 32;
  return (
    <g>
      <rect x={left} y={y - h / 2} width={w} height={h} rx={9} fill="#ffffff" stroke={color} strokeWidth={3} />
      <text x={left + w / 2} y={sub ? y - 4 : y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill={color === colors.green ? '#0a8f5a' : color === colors.red ? '#c4363b' : '#141a2b'}>
        {text}
      </text>
      {sub ? (
        <text x={left + w / 2} y={y + 16} textAnchor="middle" fontSize={13} fill="#5b6478">
          {sub}
        </text>
      ) : null}
    </g>
  );
};

const Badge: React.FC<{x: number; y: number; n: number}> = ({x, y, n}) => (
  <g>
    <circle cx={x} cy={y} r={20} fill="#ffffff" stroke="#0b1222" strokeWidth={3} />
    <text x={x} y={y + 7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b1222">
      {String(n).padStart(2, '0')}
    </text>
  </g>
);

const Route: React.FC<{pts: Pt[]; color: string; width?: number; opacity?: number; dash?: string}> = ({pts, color, width = 5, opacity = 1, dash}) => (
  <path d={toPath(pts)} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} strokeDasharray={dash} />
);

/** Receiving area at the far end of the aisles. */
const Receiving: React.FC = () => (
  <g>
    <rect x={RECV_X} y={MAP.topLineY} width={70} height={MAP.h - MAP.topLineY - 6} rx={6} fill="#13233a" stroke="#3b82f6" strokeWidth={2} strokeDasharray="8 6" />
    <text x={0} y={0} transform={`translate(${RECV_X + 41} ${(MAP.h + MAP.topLineY) / 2}) rotate(90)`} textAnchor="middle" fontSize={17} fontWeight={800} letterSpacing={2} fill="#7cb7ff">
      NHẬP HÀNG · RECEIVING
    </text>
  </g>
);

const Heading: React.FC<{left: string; right?: string}> = ({left, right}) => (
  <g>
    <text x={10} y={-58} fontSize={24} fontWeight={800} fill="#ffffff">
      {left}
    </text>
    {right ? (
      <text x={VB.x + VB.w - 14} y={-58} textAnchor="end" fontSize={17} fill={colors.muted}>
        {right}
      </text>
    ) : null}
    <g transform="translate(10 -30)">
      <text x={0} y={0} fontSize={15} fontWeight={700} fill={colors.amber}>
        ← XUẤT HÀNG · 25 cửa
      </text>
      <text x={VB.w - 30} y={0} textAnchor="end" fontSize={15} fontWeight={700} fill="#7cb7ff">
        NHẬP HÀNG →
      </text>
    </g>
  </g>
);

const Legend: React.FC = () => (
  <g transform={`translate(${VB.x + VB.w / 2 - 170} -36)`}>
    <line x1={0} y1={0} x2={34} y2={0} stroke={colors.red} strokeWidth={6} strokeLinecap="round" />
    <text x={42} y={6} fontSize={15} fill="#ffffff">
      Hiện tại (A → T)
    </text>
    <line x1={180} y1={0} x2={214} y2={0} stroke={colors.green} strokeWidth={6} strokeLinecap="round" />
    <text x={222} y={6} fontSize={15} fill="#ffffff">
      Thuật toán
    </text>
  </g>
);

const figures: Record<FigureVariant, React.FC> = {
  overview: () => (
    <>
      <Heading left="Phiếu TO mẫu · 28 điểm hạ hàng" right="Kho C · 18 lối · 35 dãy" />
      {TO28.map((s, i) => (
        <Dot key={i} s={s} />
      ))}
      <Badge x={vtX(80)} y={laneYpx(13.5)} n={1} />
      <Badge x={vtX(60)} y={laneYpx(3.5)} n={2} />
      <Badge x={vtX(48)} y={laneYpx(9.5)} n={3} />
      <Badge x={vtX(8)} y={laneYpx(2.5)} n={4} />
      <Badge x={vtX(98)} y={laneYpx(7)} n={5} />
    </>
  ),
  p1: () => (
    <>
      <Heading left="01 · Điểm gần nhau khác dãy không hạ liên tiếp" />
      <Legend />
      <Route pts={CUR.pts} color={colors.red} width={3} opacity={0.18} />
      {TO28.map((s, i) => (
        <Dot key={i} s={s} dim r={7} />
      ))}
      <Route pts={legs(CUR, 19, 24)} color={colors.red} width={6} />
      <Route pts={legs(ALG, 8, 11)} color={colors.green} width={6} dash="2 0" />
      {[19, 20, 21, 22, 23, 24].map((n) => (
        <Dot key={n} s={current[n - 1]} n={n} color={colors.red} />
      ))}
      <Label x={vtX(84)} y={laneYpx(18.6)} w={380} text="Hiện tại: vào khu vực này 2 lần" sub="Hạ #19 #20 → đi xa hạ #21 #22 → quay lại #23 #24" color={colors.red} />
      <Label x={vtX(84)} y={laneYpx(9.2)} w={380} text="Thuật toán: 4 điểm hạ liên tiếp" sub="Chỉ vào khu vực một lần" color={colors.green} />
    </>
  ),
  p2: () => (
    <>
      <Heading left="02 · Lối ngang chưa được sử dụng tối ưu" />
      <Legend />
      <Route pts={CUR.pts} color={colors.red} width={3} opacity={0.18} />
      {TO28.map((s, i) => (
        <Dot key={i} s={s} dim r={7} />
      ))}
      <Route pts={legs(CUR, 5, 8)} color={colors.red} width={6} />
      <Route pts={legs(ALG, 5, 6)} color={colors.green} width={6} />
      {[5, 6, 7, 8].map((n) => (
        <Dot key={n} s={current[n - 1]} n={n} color={colors.red} />
      ))}
      <Label x={vtX(30)} y={laneYpx(7.2)} w={360} text="Hiện tại: chạy về đầu dãy để đổi lối" sub="rồi lại vào sâu tới #8" color={colors.red} />
      <Label x={vtX(70)} y={laneYpx(11.5)} w={360} text="Thuật toán: đổi lối ở lối ngang" sub="ngay trên đường đang đi" color={colors.green} />
    </>
  ),
  p3: () => {
    const lenR = CUR.pts.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - CUR.pts[i][0]) + Math.abs(p[1] - CUR.pts[i][1]), 0);
    const lenG = ALG.pts.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - ALG.pts[i][0]) + Math.abs(p[1] - ALG.pts[i][1]), 0);
    const W = 560;
    return (
      <>
        <Heading left="03 · Hàng rải rác 15/18 dãy" />
        <Route pts={CUR.pts} color={colors.red} width={4} opacity={0.85} />
        {TO28.map((s, i) => (
          <Dot key={i} s={s} />
        ))}
        <g transform={`translate(${MAP.w - W - 30} ${MAP.h - 116})`}>
          <rect x={-20} y={-34} width={W + 40} height={124} rx={12} fill="#0b1222" opacity={0.92} stroke="#ffffff33" />
          <text x={0} y={-12} fontSize={15} fontWeight={700} fill="#ffffff">
            Duỗi thẳng hai lộ trình · cùng 28 điểm
          </text>
          <line x1={0} y1={14} x2={(W * lenG) / lenR} y2={14} stroke={colors.green} strokeWidth={12} strokeLinecap="round" />
          <line x1={0} y1={46} x2={W} y2={46} stroke={colors.red} strokeWidth={12} strokeLinecap="round" />
          <rect x={(W * lenG) / lenR} y={38} width={W - (W * lenG) / lenR} height={16} fill="#ffffff" opacity={0.35} />
          <text x={(W * (1 + lenG / lenR)) / 2} y={76} textAnchor="middle" fontSize={15} fontWeight={800} fill={colors.red}>
            QUÃNG ĐƯỜNG CHẠY THỪA
          </text>
        </g>
      </>
    );
  },
  p4: () => {
    const stuck: [number, number][] = [
      [1, 54], [1, 47], [1, 40], [2, 54], [2, 47], [2, 40],
    ];
    return (
      <>
        <Heading left="04 · Ùn tắc dãy A, B lúc 9:00 sáng" />
        {[1, 2].map((l) => (
          <rect key={l} x={vtX(-1.2) - 6} y={laneYpx(l) - 12} width={vtX(77) - vtX(-1.2) + 6} height={24} rx={12} fill={colors.red} opacity={0.25} />
        ))}
        <path d={`M${MAP.doorX} ${laneYpx(1.5)} H${vtX(30)}`} stroke={colors.red} strokeWidth={4} opacity={0.6} />
        {stuck.map(([l, v], i) => (
          <g key={i}>
            <circle cx={vtX(v)} cy={laneYpx(l)} r={20} fill="none" stroke={colors.red} strokeWidth={3} />
            <Forklift x={vtX(v)} y={laneYpx(l)} angle={0} light={0.3} />
          </g>
        ))}
        {[4, 6, 8].map((l, i) => (
          <g key={l}>
            <path d={`M${vtX(-1.2)} ${laneYpx(i % 2 ? 2 : 1)} H${vtX(34)} V${laneYpx(l)} H${vtX(50)}`} fill="none" stroke={colors.green} strokeWidth={4} opacity={0.8} />
            <Forklift x={vtX(50)} y={laneYpx(l)} angle={0} />
          </g>
        ))}
        <Label x={vtX(78)} y={laneYpx(3.2)} w={300} text="6 xe kẹt ở giữa dãy A, B" sub="Các TO đều bắt đầu từ dãy A, B" color={colors.red} />
        <text x={vtX(-0.2)} y={laneYpx(1) + 6} textAnchor="end" fontSize={16} fontWeight={800} fill={colors.amber}>
          A
        </text>
        <text x={vtX(-0.2)} y={laneYpx(2) + 6} textAnchor="end" fontSize={16} fontWeight={800} fill={colors.amber}>
          B
        </text>
        <g transform={`translate(${vtX(60)} ${laneYpx(14)})`}>
          <rect x={-90} y={-38} width={180} height={76} rx={14} fill="#d8323f" stroke="#ffffff" strokeWidth={3} />
          <text x={0} y={4} textAnchor="middle" fontSize={32} fontWeight={800} fill="#ffffff">
            9:00 AM
          </text>
          <text x={0} y={26} textAnchor="middle" fontSize={13} fill="#ffffff">
            Giờ cao điểm sáng
          </text>
        </g>
      </>
    );
  },
  p5: () => {
    const fast: [number, number][] = [
      [5, 96], [7, 92], [9, 99], [11, 94], [13, 97], [15, 92],
    ];
    return (
      <>
        <Heading left="05 · Lưu kho theo nhóm sản phẩm" />
        <rect x={vtX(0)} y={MAP.topLineY + 6} width={vtX(33) - vtX(0)} height={MAP.h - MAP.topLineY - 12} fill="#34e39e" opacity={0.08} />
        <text x={(vtX(0) + vtX(33)) / 2} y={MAP.h - 14} textAnchor="middle" fontSize={14} fontWeight={700} fill={colors.green}>
          Vùng gần cửa xuất
        </text>
        {fast.map(([l, v], i) => (
          <g key={i}>
            <path d={`M${vtX(v)} ${laneYpx(l)} H${MAP.doorX + 10}`} stroke={colors.red} strokeWidth={3} strokeDasharray="10 7" opacity={0.75} />
            <rect x={vtX(v) - 11} y={laneYpx(l) - 11} width={22} height={22} rx={4} fill={colors.red} stroke="#ffffff" strokeWidth={2} />
          </g>
        ))}
        <Label x={vtX(72)} y={laneYpx(17.3)} w={380} text="Hàng bán chạy nằm sâu, gần khu nhập" sub="Mỗi lần xuất phải chạy hết chiều dài dãy" color={colors.red} />
      </>
    );
  },
};

export const SlideFigure: React.FC<{variant: FigureVariant}> = ({variant}) => {
  const Fig = figures[variant];
  return (
    <AbsoluteFill style={{background: '#0a1120', fontFamily}}>
      <svg width={FIGURE.width} height={FIGURE.height} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
        <MapBase startDoor="" />
        <Receiving />
        <Fig />
      </svg>
    </AbsoluteFill>
  );
};
