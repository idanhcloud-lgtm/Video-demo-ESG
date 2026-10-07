import {Composition} from 'remotion';
import {PROBLEM02_DURATION, Problem02} from './scenes/Problem02';
import {PROBLEM03_DURATION, Problem03} from './scenes/Problem03';
import {PROBLEM04_DURATION, Problem04} from './scenes/Problem04';
import {TitleScene} from './scenes/TitleScene';
import {VIDEO} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TitleScene"
        component={TitleScene}
        durationInFrames={6 * VIDEO.fps}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="Problem02"
        component={Problem02}
        durationInFrames={PROBLEM02_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="Problem03"
        component={Problem03}
        durationInFrames={PROBLEM03_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="Problem04"
        component={Problem04}
        durationInFrames={PROBLEM04_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
