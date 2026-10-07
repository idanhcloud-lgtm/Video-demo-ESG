import {DOORS, DOOR_X_M, RACKS, VT_WIDTH_M, aisleY, dist, distFromDoor, legPath, xOfVT} from './khoC';

export interface Stop {
  rack: string;
  vt: number;
}

const laneOf = (rack: string) => RACKS.find((r) => r.code === rack)!.lane;

// Visual x of the front cross aisle (between doors and VT 0); distances still follow the app formula.
export const FRONT_AISLE_X = -2.5;

export const doorY = (doorId: string) => DOORS.find((d) => d.id === doorId)!.y;

/** Total distance door → stops in order → door, same formula as the optimization app. */
export function routeLength(stops: Stop[], doorId: string) {
  if (stops.length === 0) return 0;
  const dy = doorY(doorId);
  let total = distFromDoor(dy, laneOf(stops[0].rack), stops[0].vt);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    total += dist(laneOf(a.rack), a.vt, laneOf(b.rack), b.vt);
  }
  const last = stops[stops.length - 1];
  return total + distFromDoor(dy, laneOf(last.rack), last.vt);
}

// Ported from the optimization app (ESG/so-sanh-lo-trinh-kho-c.html) so the video uses the same ordering.

/** Current practice ("sweepOrder" in the app): aisles in A→T order; each aisle swept in one direction,
 *  entering from the end nearer to where the truck is, never passing a stop and coming back. */
export function aisleOrder(stops: Stop[]) {
  const lanes = [...new Set(stops.map((s) => laneOf(s.rack)))].sort((x, y) => x - y);
  const out: Stop[] = [];
  let curV = DOOR_X_M / VT_WIDTH_M;
  lanes.forEach((lane) => {
    const g = stops.filter((s) => laneOf(s.rack) === lane).sort((x, y) => x.vt - y.vt);
    const lo = g[0].vt;
    const hi = g[g.length - 1].vt;
    if (Math.abs(curV - lo) > Math.abs(curV - hi)) g.reverse();
    out.push(...g);
    curV = out[out.length - 1].vt;
  });
  return out;
}

/** App's serpentine key: even lanes by VT ascending, odd lanes by VT descending. */
const serp = (s: Stop) => {
  const a = laneOf(s.rack);
  return a % 2 === 0 ? a * 1e5 + s.vt : a * 1e5 + (99999 - s.vt);
};

/** Optimized route ("optimise" in the app): serpentine start, then 2-opt until no gain (max 40 rounds). */
export function optimizedOrder(stops: Stop[], doorId: string) {
  let seq = [...stops].sort((x, y) => serp(x) - serp(y));
  const n = seq.length;
  if (n > 120) return seq;
  let improved = true;
  let guard = 0;
  let cur = routeLength(seq, doorId);
  while (improved && guard < 40) {
    improved = false;
    guard++;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const cand = [...seq.slice(0, i), ...seq.slice(i, j + 1).reverse(), ...seq.slice(j + 1)];
        const L = routeLength(cand, doorId);
        if (L < cur - 1e-3) {
          seq = cand;
          cur = L;
          improved = true;
        }
      }
    }
  }
  return seq;
}

function doorLeg(dy: number, lane: number, vt: number): [number, number][] {
  return [
    [-7, dy],
    [FRONT_AISLE_X, dy],
    [FRONT_AISLE_X, aisleY(lane)],
    [xOfVT(vt), aisleY(lane)],
  ];
}

/** Polyline in metres for drawing/animating; index of the point where each stop is reached. */
export function routePolyline(stops: Stop[], doorId: string) {
  const dy = doorY(doorId);
  const pts: [number, number][] = [];
  const stopIdx: number[] = [];
  const push = (p: [number, number]) => {
    const prev = pts[pts.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) pts.push(p);
  };
  doorLeg(dy, laneOf(stops[0].rack), stops[0].vt).forEach(push);
  stopIdx.push(pts.length - 1);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    legPath(laneOf(a.rack), a.vt, laneOf(b.rack), b.vt)
      .map(([x, y]): [number, number] => [x === 0 ? FRONT_AISLE_X : x, y])
      .forEach(push);
    stopIdx.push(pts.length - 1);
  }
  const last = stops[stops.length - 1];
  doorLeg(dy, laneOf(last.rack), last.vt).reverse().forEach(push);
  return {pts, stopIdx};
}

export const stopPoint = (s: Stop): [number, number] => [xOfVT(s.vt), aisleY(laneOf(s.rack))];

/** Split a route's distance (same formula as routeLength) by kind of movement. */
export function routeBreakdown(stops: Stop[], doorId: string) {
  const dy = doorY(doorId);
  let between = 0;
  let changes = 0;
  let within = 0;
  const withinLegs: number[] = [];
  for (let i = 1; i < stops.length; i++) {
    const la = laneOf(stops[i - 1].rack);
    const lb = laneOf(stops[i].rack);
    const d = dist(la, stops[i - 1].vt, lb, stops[i].vt);
    if (la === lb) {
      within += d;
      withinLegs.push(i);
    } else {
      between += d;
      changes++;
    }
  }
  const first = stops[0];
  const last = stops[stops.length - 1];
  const door = distFromDoor(dy, laneOf(first.rack), first.vt) + distFromDoor(dy, laneOf(last.rack), last.vt);
  return {between, changes, within, door, withinLegs};
}
