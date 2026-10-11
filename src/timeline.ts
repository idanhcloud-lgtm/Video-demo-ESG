import {createContext, useContext} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {TIMELINE_FPS} from './theme';

/** Freeze points for the voice-over cut: at scene time `at` (units), hold for `dur` units. */
export interface Hold {
  at: number;
  dur: number;
}
export const HoldContext = createContext<Hold[]>([]);

/** Maps output time to scene time, freezing the scene at each hold. */
export const applyHolds = (t: number, holds: Hold[]) => {
  let shift = 0;
  for (const h of [...holds].sort((a, b) => a.at - b.at)) {
    const at = h.at + shift;
    if (t < at) break;
    if (t < at + h.dur) return h.at;
    shift += h.dur;
  }
  return t - shift;
};

/** Current time in timeline units (30 per second), fractional at higher output fps. */
export const useTimelineFrame = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const holds = useContext(HoldContext);
  return applyHolds((frame * TIMELINE_FPS) / fps, holds);
};
