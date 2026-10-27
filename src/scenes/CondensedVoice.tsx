import {AbsoluteFill, Audio, Img, Sequence, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Subtitle} from '../components/Subtitle';
import voEN from '../data/voiceEN.json';
import voV4 from '../data/voiceV4.json';
import {VIDEO, fontFamily} from '../theme';
import {ClosingRecap} from './ClosingRecap';
import {EndCard} from './EndCard';
import {MainRace} from './MainRace';
import {Problem04} from './Problem04';
import {LangContext} from '../lang';
import {TitleScene} from './TitleScene';

const f = (s: number) => Math.round(s * VIDEO.fps);
type Voice = typeof voV4;
const duration = (S: Voice['scenes']) => f(S.title.seconds) + f(S.race.seconds) + f(S.p04.seconds) + f(S.ket.seconds) + f(S.end.seconds); // ket = 0 when the recap is dropped
export const CONDENSED_VOICE_DURATION = duration(voV4.scenes);
/** English voice-over (audio/en): same scenes, beats placed on the English sentences. */
export const CONDENSED_VOICE_EN_AUDIO_DURATION = duration((voEN as unknown as Voice).scenes);;

/** Bilingual subtitle for the sentence being spoken. */
const Subtitles: React.FC<{enFirst?: boolean; vo: Voice}> = ({enFirst, vo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = [...vo.subs].reverse().find((x) => t >= x.at && t < x.end);
  if (!s) return null;
  const o = interpolate(t, [s.at, s.at + 0.15, s.end - 0.15, s.end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Subtitle vi={s.vi} en={s.en} opacity={o} enFirst={enFirst} />;
};

// with the brand on, the scenes shrink a little to leave a header strip for it
const BRAND_H = 72;
const BRAND_SCALE = (VIDEO.height - BRAND_H) / VIDEO.height;

/** Company logo top left and the site name top right, on every frame. */
const Brand: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 28, top: 12, zIndex: 50, background: '#fff', borderRadius: 10, padding: '6px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.35)'}}>
      <Img src={staticFile('brand/duytan.png')} style={{height: 40, display: 'block'}} />
    </div>
    <div style={{position: 'absolute', right: 28, top: 15, zIndex: 50, fontFamily, fontSize: 26, fontWeight: 800, letterSpacing: 3, color: '#fff',
      background: 'rgba(3,78,162,0.92)', borderRadius: 10, padding: '8px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.35)'}}>
      DTLA WAREHOUSE
    </div>
  </>
);

/** Condensed version with the final v4 voice-over: every scene beat is placed on its sentence (tools/voice_v4_plan.py). */
/** enFirst: subtitles with English as the main line. */
export const CondensedVoice: React.FC<{enFirst?: boolean; englishVoice?: boolean; brand?: boolean}> = ({enFirst = false, englishVoice = false, brand = false}) => {
  const vo = (englishVoice ? voEN : voV4) as unknown as Voice;
  const S = vo.scenes;
  return (
  <LangContext.Provider value={enFirst ? 'en' : 'vi'}>
  <AbsoluteFill style={{background: '#070b14'}}>
    <AbsoluteFill style={brand ? {transform: `translateY(${BRAND_H}px) scale(${BRAND_SCALE})`, transformOrigin: 'top center'} : undefined}>
    <Series>
      <Series.Sequence durationInFrames={f(S.title.seconds)}>
        <TitleScene noStats />
      </Series.Sequence>
      <Series.Sequence durationInFrames={f(S.race.seconds)}>
        <MainRace clean beats={S.race.beats} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={f(S.p04.seconds)}>
        <Problem04 clean beats={S.p04.beats} />
      </Series.Sequence>
      {f(S.ket.seconds) > 0 ? (
        <Series.Sequence durationInFrames={f(S.ket.seconds)}>
          <ClosingRecap beats={S.ket.beats} />
        </Series.Sequence>
      ) : null}
      <Series.Sequence durationInFrames={f(S.end.seconds)}>
        <EndCard beats={S.end.beats} />
      </Series.Sequence>
    </Series>
    </AbsoluteFill>
    {vo.audio.map((a) => (
      <Sequence key={a.file} from={f(a.at)}>
        <Audio src={staticFile(a.file)} />
      </Sequence>
    ))}
    <Subtitles enFirst={enFirst} vo={vo} />
    {brand ? <Brand /> : null}
  </AbsoluteFill>
  </LangContext.Provider>
  );
};
