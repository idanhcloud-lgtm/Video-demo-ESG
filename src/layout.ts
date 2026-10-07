import {AISLE_PITCH_M, DOOR_X_M, VT_WIDTH_M} from './map/khoC';

// Screen layout measured from video part 1 (856×480 source, scaled to 1920×1080).
export const LAYOUT = {
  panelTop: 176,
  panelW: 897,
  panelH: 727,
  headerH: 99,
  panelLeft: {algo: 40, current: 981} as const,
  caption: {x: 40, y: 914, w: 1840, h: 137},
  tabs: {y: 28, h: 129, w: 445, xs: [40, 505, 970, 1435]},
};

// Map projection inside a panel (map SVG local coordinates, below the header).
// Kept identical to video part 1: lanes and bins are spread to fill the panel.
export const MAP = {
  w: LAYOUT.panelW,
  h: LAYOUT.panelH - LAYOUT.headerH,
  vt0: 103.2,
  pxPerVT: 7.317,
  lane1Y: 596.3,
  lanePx: 32.12,
  doorX: 80,
  topLineY: 25.5,
};

export const vtX = (vt: number) => MAP.vt0 + vt * MAP.pxPerVT;
export const laneYpx = (lane: number) => MAP.lane1Y - (lane - 1) * MAP.lanePx;

/** Metres (Kho C coordinates) → map pixels. */
export function project(xm: number, ym: number): [number, number] {
  const x = xm <= DOOR_X_M + 0.01 ? MAP.doorX : vtX(xm / VT_WIDTH_M);
  return [x, MAP.lane1Y - (ym / AISLE_PITCH_M) * MAP.lanePx];
}
