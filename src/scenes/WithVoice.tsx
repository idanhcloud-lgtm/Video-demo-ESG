import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import vo from '../data/voiceover.json';
import {HoldContext} from '../timeline';

type Part = keyof typeof vo.parts;

/** Wraps a scene: freezes it at the planned holds and plays the voice-over sentences on top. */
export const WithVoice: React.FC<{part: Part; children: React.ReactNode}> = ({part, children}) => {
  const {fps} = useVideoConfig();
  const p = vo.parts[part];
  return (
    <AbsoluteFill>
      <HoldContext.Provider value={p.holds}>{children}</HoldContext.Provider>
      {p.audio.map((a) => (
        <Sequence key={a.file} from={Math.round(a.start * fps)}>
          <Audio src={staticFile(a.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const voDuration = (part: Part, fps: number) => Math.ceil(vo.parts[part].seconds * fps);
