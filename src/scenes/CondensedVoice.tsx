import {AbsoluteFill, Audio, Sequence, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Subtitle} from '../components/Subtitle';
import vo from '../data/voiceV4.json';
import {VIDEO} from '../theme';
import {ClosingRecap} from './ClosingRecap';
import {MainRace} from './MainRace';
import {Problem04} from './Problem04';
import {TitleScene} from './TitleScene';

const f = (s: number) => Math.round(s * VIDEO.fps);
const S = vo.scenes;
export const CONDENSED_VOICE_DURATION = f(S.title.seconds) + f(S.race.seconds) + f(S.p04.seconds) + f(S.ket.seconds);

/** Bilingual subtitle for the sentence being spoken. */
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = [...vo.subs].reverse().find((x) => t >= x.at && t < x.end);
  if (!s) return null;
  const o = interpolate(t, [s.at, s.at + 0.15, s.end - 0.15, s.end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Subtitle vi={s.vi} en={s.en} opacity={o} />;
};

/** Condensed version with the final v4 voice-over: every scene beat is placed on its sentence (tools/voice_v4_plan.py). */
export const CondensedVoice: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence durationInFrames={f(S.title.seconds)}>
        <TitleScene noStats />
      </Series.Sequence>
      <Series.Sequence durationInFrames={f(S.race.seconds)}>
        <MainRace clean beats={S.race.beats} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={f(S.p04.seconds)}>
        <Problem04 clean shiftStart beats={S.p04.beats} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={f(S.ket.seconds)}>
        <ClosingRecap beats={S.ket.beats} />
      </Series.Sequence>
    </Series>
    {vo.audio.map((a) => (
      <Sequence key={a.file} from={f(a.at)}>
        <Audio src={staticFile(a.file)} />
      </Sequence>
    ))}
    <Subtitles />
  </AbsoluteFill>
);
