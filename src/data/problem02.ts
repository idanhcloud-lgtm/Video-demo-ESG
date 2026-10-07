import type {Stop} from '../map/route';

// Example TO for problem 02: 14 put-away stops on lanes 4–8, one rack side per lane.
export const PROBLEM02_DOOR = '06';
export const PROBLEM02_STOPS: Stop[] = (
  [
    ['CDT', [6, 18, 31]],
    ['CET', [37, 48, 60, 72]],
    ['CFT', [78, 90]],
    ['CGT', [36, 55, 70]],
    ['CHT', [12, 26]],
  ] as const
).flatMap(([rack, vts]) => vts.map((vt) => ({rack, vt})));
