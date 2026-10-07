import type {Stop} from '../map/route';

// The 28-stop put-away TO from video part 1 (positions read from the video; with the old
// 1.35 m / 5.4 m constants these orders reproduce its 1,440 m and 1,008 m exactly).
// Listed in the current A→T visit order.
export const TO28_DOOR = '01';
const RAW: [string, number][] = [
  ['CAT', 18], ['CAT', 28], ['CBT', 55], ['CBT', 68], ['CCT', 70], ['CDP', 20], ['CDT', 12],
  ['CDT', 62], ['CET', 38], ['CET', 98], ['CGT', 85], ['CHP', 76], ['CHT', 95], ['CIP', 24],
  ['CIT', 34], ['CIT', 50], ['CLT', 45], ['CLT', 60], ['CMT', 88], ['CMT', 100], ['COT', 28],
  ['CPP', 15], ['CPT', 72], ['CPT', 82], ['CQT', 38], ['CRT', 52], ['CTP', 60], ['CTP', 92],
];
export const TO28: Stop[] = RAW.map(([rack, vt]) => ({rack, vt}));

// Optimized visit order shown in video part 1, as 1-based indices into TO28.
const GREEN = [1, 2, 3, 4, 5, 10, 13, 20, 19, 24, 23, 27, 28, 26, 25, 21, 22, 17, 18, 15, 14, 16, 12, 11, 8, 9, 6, 7];
export const TO28_OPTIMIZED: Stop[] = GREEN.map((i) => TO28[i - 1]);
