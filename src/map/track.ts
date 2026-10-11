import {project} from '../layout';
import {Stop, routePolyline} from './route';

type Pt = [number, number];

/** A route as a polyline in metres, with cumulative distance and the distance at which each stop is reached. */
export interface Track {
  pts: Pt[];
  cum: number[];
  total: number;
  stopAt: number[];
}

export const track = (stops: Stop[], doorId: string): Track => {
  const {pts, stopIdx} = routePolyline(stops, doorId);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
  return {pts, cum, total: cum[cum.length - 1], stopAt: stopIdx.map((k) => cum[k])};
};

/** Truck position (map pixels) and heading after driving `d` metres. */
export function pose(t: Track, d: number): {p: Pt; angle: number} {
  for (let i = 1; i < t.pts.length; i++) {
    if (d <= t.cum[i] || i === t.pts.length - 1) {
      const pa = project(...t.pts[i - 1]);
      const pb = project(...t.pts[i]);
      const seg = t.cum[i] - t.cum[i - 1];
      const k = seg === 0 ? 1 : Math.min(1, Math.max(0, (d - t.cum[i - 1]) / seg));
      return {p: [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k], angle: (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI};
    }
  }
  return {p: project(...t.pts[0]), angle: 0};
}
