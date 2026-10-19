import {Composition} from 'remotion';
import {PROBLEM02_DURATION, Problem02} from './scenes/Problem02';
import {PROBLEM03_DURATION, Problem03} from './scenes/Problem03';
import {PROBLEM04_DURATION, Problem04} from './scenes/Problem04';
import {SUMMARY_DURATION, Summary} from './scenes/Summary';
import {TitleScene} from './scenes/TitleScene';
import {FIGURE, SlideFigure} from './scenes/SlideFigure';
import {CONDENSED_DURATION, Condensed} from './scenes/Condensed';
import {CONDENSED_VOICE_DURATION, CondensedVoice} from './scenes/CondensedVoice';
import {MAIN_RACE_DURATION, MainRace} from './scenes/MainRace';
import {WithVoice, voDuration} from './scenes/WithVoice';
import {VIDEO} from './theme';
import {SSHAPE_2OPT_SECONDS, SShape2Opt} from './scenes/SShape2Opt';
import {MOVER_PAIRING_SECONDS, MoverPairing} from './scenes/MoverPairing';
import {MOVER_CAGES_SECONDS, MoverCages} from './scenes/MoverCages';
import {MOVER_RACE_SECONDS, MoverRace} from './scenes/MoverRace';
import {MOVER_EXPLAIN_SECONDS, MoverExplain} from './scenes/MoverExplain';
import {ALGO_EXPLAIN_SECONDS, AlgoExplain} from './scenes/AlgoExplain';
import {PROJECT_ALGO_SECONDS, ProjectAlgo} from './scenes/ProjectAlgo';

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
      <Composition id="CondensedVoice" component={CondensedVoice} durationInFrames={CONDENSED_VOICE_DURATION} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="CondensedVoiceEN" component={CondensedVoice} defaultProps={{enFirst: true}} durationInFrames={CONDENSED_VOICE_DURATION} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="SShape2Opt" component={SShape2Opt} durationInFrames={Math.round(SSHAPE_2OPT_SECONDS * VIDEO.fps)} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MoverPairing" component={MoverPairing} durationInFrames={Math.round(MOVER_PAIRING_SECONDS * VIDEO.fps)} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MoverCages" component={MoverCages} durationInFrames={MOVER_CAGES_SECONDS * VIDEO.fps} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MoverRace" component={MoverRace} durationInFrames={MOVER_RACE_SECONDS * VIDEO.fps} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MoverExplain" component={MoverExplain} durationInFrames={MOVER_EXPLAIN_SECONDS * VIDEO.fps} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="AlgoExplain" component={AlgoExplain} durationInFrames={ALGO_EXPLAIN_SECONDS * VIDEO.fps} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="ProjectAlgo" component={ProjectAlgo} durationInFrames={PROJECT_ALGO_SECONDS * VIDEO.fps} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
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
