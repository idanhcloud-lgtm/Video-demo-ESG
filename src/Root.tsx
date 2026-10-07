import {Composition} from 'remotion';
import {Problem02, PROBLEM02_DURATION} from './scenes/Problem02';
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
    </>
  );
};
