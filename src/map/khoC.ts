// Bản đồ Kho C – DTLA. Sinh tự động từ app tối ưu lộ trình (AppChinh-ToiUuLoTrinh-KhoC.html).
// Đơn vị: mét. x chạy dọc dãy kệ (VT 0 ở phía cửa), y chạy ngang qua các lối (lối 1 / dãy CAT ở dưới cùng).

export const VT_WIDTH_M = 1.4;       // mỗi ô vị trí (VT) dài 1,4 m
export const AISLE_PITCH_M = 8.65;  // tim lối này sang tim lối kế bên
export const AISLE_WIDTH_M = 3.2;
// Chỉ dùng để vẽ: kệ lấp phần còn lại giữa hai lối, không ảnh hưởng quãng đường.
export const RACK_DEPTH_M = (AISLE_PITCH_M - AISLE_WIDTH_M) / 2;
export const NUM_AISLES = 18;
export const DOOR_X_M = -7.0;     // cửa xuất nằm trước VT 0 khoảng 7 m
export const MAX_VT = 104;

/** Chỗ xe sang được lối khác: đầu dãy (VT 0), hầm 1 (VT 34), hầm 2 (VT 75), hoặc vòng cuối dãy. */
export const CROSS_VT = [0, 34, 75];
export const TUNNELS = [
  { name: "Hầm 1", vtFrom: 33, vtTo: 35 },
  { name: "Hầm 2", vtFrom: 74, vtTo: 76 },
] as const;

export type RackSide = "T" | "P";
export interface Rack { code: string; lane: number; side: RackSide; vtMax: number; }

/** 35 dãy kệ. Mỗi lối kẹp giữa dãy T (phía dưới lối) và dãy P (phía trên lối). */
export const RACKS: Rack[] = [
  { code: "CAT", lane: 1, side: "T", vtMax: 76 },
  { code: "CBP", lane: 1, side: "P", vtMax: 76 },
  { code: "CBT", lane: 2, side: "T", vtMax: 76 },
  { code: "CCP", lane: 2, side: "P", vtMax: 76 },
  { code: "CCT", lane: 3, side: "T", vtMax: 80 },
  { code: "CDP", lane: 3, side: "P", vtMax: 80 },
  { code: "CDT", lane: 4, side: "T", vtMax: 104 },
  { code: "CEP", lane: 4, side: "P", vtMax: 104 },
  { code: "CET", lane: 5, side: "T", vtMax: 104 },
  { code: "CFP", lane: 5, side: "P", vtMax: 104 },
  { code: "CFT", lane: 6, side: "T", vtMax: 104 },
  { code: "CGP", lane: 6, side: "P", vtMax: 104 },
  { code: "CGT", lane: 7, side: "T", vtMax: 104 },
  { code: "CHP", lane: 7, side: "P", vtMax: 104 },
  { code: "CHT", lane: 8, side: "T", vtMax: 104 },
  { code: "CIP", lane: 8, side: "P", vtMax: 104 },
  { code: "CIT", lane: 9, side: "T", vtMax: 104 },
  { code: "CKP", lane: 9, side: "P", vtMax: 104 },
  { code: "CKT", lane: 10, side: "T", vtMax: 104 },
  { code: "CLP", lane: 10, side: "P", vtMax: 104 },
  { code: "CLT", lane: 11, side: "T", vtMax: 104 },
  { code: "CMP", lane: 11, side: "P", vtMax: 104 },
  { code: "CMT", lane: 12, side: "T", vtMax: 104 },
  { code: "CNP", lane: 12, side: "P", vtMax: 104 },
  { code: "CNT", lane: 13, side: "T", vtMax: 104 },
  { code: "COP", lane: 13, side: "P", vtMax: 104 },
  { code: "COT", lane: 14, side: "T", vtMax: 104 },
  { code: "CPP", lane: 14, side: "P", vtMax: 104 },
  { code: "CPT", lane: 15, side: "T", vtMax: 104 },
  { code: "CQP", lane: 15, side: "P", vtMax: 104 },
  { code: "CQT", lane: 16, side: "T", vtMax: 104 },
  { code: "CRP", lane: 16, side: "P", vtMax: 104 },
  { code: "CRT", lane: 17, side: "T", vtMax: 104 },
  { code: "CSP", lane: 17, side: "P", vtMax: 104 },
  { code: "CTP", lane: 18, side: "P", vtMax: 96 },
];
/** Dãy tường: xe nâng không chạy xuyên hầm qua các dãy này. */
export const NO_TUNNEL = ["CAT", "CTP"];
/** Đoạn không có kệ (CAT VT 9–14 là cửa phụ). */
export const GAPS: Record<string, [number, number][]> = {"CAT": [[9, 14]]};

export const ZONES = [
  { name: "Đầu kho", vtFrom: 0, vtTo: 33 },
  { name: "Giữa kho", vtFrom: 34, vtTo: 74 },
  { name: "Cuối kho", vtFrom: 75, vtTo: 104 },
] as const;

/** 25 cửa xuất xếp đều dọc phía đầu dãy. */
export const DOORS = Array.from({ length: 25 }, (_, i) => ({
  id: String(i + 1).padStart(2, "0"),
  x: DOOR_X_M,
  y: (i * (NUM_AISLES - 1) * AISLE_PITCH_M) / 24,
}));

const RACK_BY_CODE = Object.fromEntries(RACKS.map((r) => [r.code, r]));
const LANE_MAX: Record<number, number> = {};
for (const r of RACKS) LANE_MAX[r.lane] = Math.max(LANE_MAX[r.lane] ?? 0, r.vtMax);

/** Toạ độ y (mét) của tim lối a. */
export const aisleY = (lane: number) => (lane - 1) * AISLE_PITCH_M;
/** Toạ độ x (mét) của vị trí VT. */
export const xOfVT = (vt: number) => vt * VT_WIDTH_M;
/** Dải y [dưới, trên] của một dãy kệ. */
export function rackBand(code: string): [number, number] {
  const r = RACK_BY_CODE[code];
  const y = aisleY(r.lane);
  return r.side === "T"
    ? [y - AISLE_WIDTH_M / 2 - RACK_DEPTH_M, y - AISLE_WIDTH_M / 2]
    : [y + AISLE_WIDTH_M / 2, y + AISLE_WIDTH_M / 2 + RACK_DEPTH_M];
}
/** Khung bao của cả kho (mét). */
export const BOUNDS = { xMin: DOOR_X_M, xMax: MAX_VT * VT_WIDTH_M, yMin: rackBand("CAT")[0], yMax: rackBand("CTP")[1] };

/** Đọc mã bin "CDT-015-4" → dãy, lối, VT, tầng. */
export function parseBin(bin: string) {
  const m = /^([A-Z]{3})-(\d{1,3})-(\d{1,2})$/.exec(bin.trim().toUpperCase());
  if (!m || !RACK_BY_CODE[m[1]]) return null;
  return { rack: m[1], lane: RACK_BY_CODE[m[1]].lane, vt: Number(m[2]), level: Number(m[3]) };
}

function maxBetween(a1: number, a2: number) {
  let m = 0;
  for (let k = Math.min(a1, a2); k <= Math.max(a1, a2); k++) m = Math.max(m, LANE_MAX[k] ?? 0);
  return m;
}
/** Quãng đường xe chạy thật (mét) giữa hai điểm trong lối — cùng công thức với app tối ưu lộ trình. */
export function dist(lane1: number, vt1: number, lane2: number, vt2: number) {
  if (lane1 === lane2) return Math.abs(vt1 - vt2) * VT_WIDTH_M;
  const dy = Math.abs(aisleY(lane1) - aisleY(lane2));
  let best = Infinity;
  for (const p of [...CROSS_VT, maxBetween(lane1, lane2) + 1]) {
    best = Math.min(best, (Math.abs(vt1 - p) + Math.abs(vt2 - p)) * VT_WIDTH_M + dy);
  }
  return best;
}
/** Quãng đường từ cửa (toạ độ y của cửa) tới một điểm trong lối. */
export function distFromDoor(doorY: number, lane: number, vt: number) {
  const dy = Math.abs(doorY - aisleY(lane));
  const doorVT = DOOR_X_M / VT_WIDTH_M;
  let best = Infinity;
  for (const p of [...CROSS_VT, maxBetween(1, lane) + 1]) {
    best = Math.min(best, (Math.abs(doorVT - p) + Math.abs(vt - p)) * VT_WIDTH_M + dy);
  }
  return best;
}
/**
 * Các điểm gấp khúc (mét) của đường xe đi từ (lane1, vt1) tới (lane2, vt2):
 * chạy dọc lối tới chỗ băng ngang tốt nhất, băng qua, rồi chạy dọc tới đích. Dùng để vẽ/animate lộ trình.
 */
export function legPath(lane1: number, vt1: number, lane2: number, vt2: number): [number, number][] {
  if (lane1 === lane2) return [[xOfVT(vt1), aisleY(lane1)], [xOfVT(vt2), aisleY(lane2)]];
  let bestP = CROSS_VT[0], best = Infinity;
  for (const p of [...CROSS_VT, maxBetween(lane1, lane2) + 1]) {
    const d = Math.abs(vt1 - p) + Math.abs(vt2 - p);
    if (d < best) { best = d; bestP = p; }
  }
  const pts: [number, number][] = [[xOfVT(vt1), aisleY(lane1)], [xOfVT(bestP), aisleY(lane1)], [xOfVT(bestP), aisleY(lane2)], [xOfVT(vt2), aisleY(lane2)]];
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}
/**
 * Đổi toạ độ mét → pixel cho Remotion/SVG. Lật trục y để lối 1 (dãy CAT) nằm dưới cùng như mặt bằng thật.
 * scale = số pixel cho 1 mét; pad = lề.
 */
export function toScreen(x: number, y: number, scale: number, pad = 0): [number, number] {
  return [pad + (x - BOUNDS.xMin) * scale, pad + (BOUNDS.yMax - y) * scale];
}
