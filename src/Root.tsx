import {Composition} from 'remotion';
import {PROBLEM02_DURATION, Problem02} from './scenes/Problem02';
import {PROBLEM03_DURATION, Problem03} from './scenes/Problem03';
import {PROBLEM04_DURATION, Problem04} from './scenes/Problem04';
import {SUMMARY_DURATION, Summary} from './scenes/Summary';
import {TitleScene} from './scenes/TitleScene';
import {FIGURE, SlideFigure} from './scenes/SlideFigure';
import {CONDENSED_DURATION, Condensed} from './scenes/Condensed';
import {MAIN_RACE_DURATION, MainRace} from './scenes/MainRace';
import {WithVoice, voDuration} from './scenes/WithVoice';
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
      <Composition
        id="Summary"
        component={Summary}
        durationInFrames={SUMMARY_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition id="MainRaceClean" component={() => <MainRace clean demoSubtitle />} durationInFrames={MAIN_RACE_DURATION} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MainRace" component={MainRace} durationInFrames={MAIN_RACE_DURATION} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="SlideFigure" component={SlideFigure} defaultProps={{variant: 'overview' as const}} durationInFrames={1} fps={VIDEO.fps} width={FIGURE.width} height={FIGURE.height} />
      <Composition id="Condensed" component={Condensed} durationInFrames={CONDENSED_DURATION} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      {(
        [
          ['Problem02VO', '02', Problem02],
          ['Problem03VO', '03', Problem03],
          ['Problem04VO', '04', Problem04],
          ['SummaryVO', 'KET', Summary],
        ] as const
      ).map(([id, part, Scene]) => (
        <Composition
          key={id}
          id={id}
          component={() => (
            <WithVoice part={part}>
              <Scene />
            </WithVoice>
          )}
          durationInFrames={voDuration(part, VIDEO.fps)}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
      ))}
    </>
  );
};
