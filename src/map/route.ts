import {DOORS, RACKS, aisleY, dist, distFromDoor, legPath, xOfVT} from './khoC';

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

/** Current practice: TO printed by bin code, i.e. rack A → T, then VT ascending. */
export function aisleOrder(stops: Stop[]) {
  return [...stops].sort((a, b) => a.rack.localeCompare(b.rack) || a.vt - b.vt);
}

/** S-shape: lanes nearest the door first, alternating direction per lane; then 2-opt. */
export function optimizedOrder(stops: Stop[], doorId: string) {
  const lanes = [...new Set(stops.map((s) => laneOf(s.rack)))].sort((a, b) => a - b);
  const startLane = laneOf(stops[0].rack);
  if (Math.abs(aisleY(lanes[lanes.length - 1]) - doorY(doorId)) < Math.abs(aisleY(lanes[0]) - doorY(doorId))) {
    lanes.reverse();
  }
  void startLane;
  let route: Stop[] = [];
  lanes.forEach((lane, i) => {
    const inLane = stops.filter((s) => laneOf(s.rack) === lane).sort((a, b) => a.vt - b.vt);
    route = route.concat(i % 2 === 0 ? inLane : inLane.reverse());
  });
  return twoOpt(route, doorId);
}

function twoOpt(route: Stop[], doorId: string) {
  let best = route;
  let bestLen = routeLength(best, doorId);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const trial = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const len = routeLength(trial, doorId);
        if (len < bestLen - 1e-9) {
          best = trial;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
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
