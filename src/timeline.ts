import {useCurrentFrame, useVideoConfig} from 'remotion';
import {TIMELINE_FPS} from './theme';

/** Current time in timeline units (30 per second), fractional at higher output fps. */
export const useTimelineFrame = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (frame * TIMELINE_FPS) / fps;
};
