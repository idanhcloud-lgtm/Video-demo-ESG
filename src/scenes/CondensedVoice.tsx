import {AbsoluteFill, Audio, Easing, Img, Sequence, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
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
export const CONDENSED_VOICE_EN_AUDIO_DURATION = duration((voEN as unknown as Voice).scenes);
/** Branded cut: the title holds a little longer for the logos and the warehouse line. */
const TITLE_EXTRA = 1.5;
export const CONDENSED_VOICE_EN_BRAND_DURATION = CONDENSED_VOICE_EN_AUDIO_DURATION + f(TITLE_EXTRA);

/** Bilingual subtitle for the sentence being spoken. */
/** from: no subtitle before this time (the branded title already shows its sentence on screen). */
const Subtitles: React.FC<{enFirst?: boolean; vo: Voice; shift: (at: number) => number; from?: number}> = ({enFirst, vo, shift, from = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const subs = vo.subs.map((x) => ({...x, at: shift(x.at), end: shift(x.at) + x.end - x.at}));
  const s = [...subs].reverse().find((x) => t >= x.at && t < x.end && x.at >= from);
  if (!s) return null;
  const o = interpolate(t, [s.at, s.at + 0.15, s.end - 0.15, s.end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Subtitle vi={s.vi} en={s.en} opacity={o} enFirst={enFirst} />;
};

// with the brand on, the scenes shrink a little to leave a header strip for it
const BRAND_H = 72;
const BRAND_SCALE = (VIDEO.height - BRAND_H) / VIDEO.height;

const LOGO_W = 183; // white card around the 40 px high logo
const SITE_W = 290;
const BRAND_BOX_H = 56; // both cards the same height
/** Company logo top left and the site name top right. On the title they sit centred above the title, then move out. */
const Brand: React.FC<{outAt: number}> = ({outAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const m = interpolate(t, [outAt - 0.9, outAt], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const sc = interpolate(m, [0, 1], [1.4, 1]);
  // on the title the two cards touch and read as one lockup; they part on the way to the corners
  const gap = 0;
  // centre row, at the scale it has there
  const rowW = (LOGO_W + SITE_W) * 1.4 + gap;
  const cy = 215;
  const logo = {x: interpolate(m, [0, 1], [960 - rowW / 2, 28]), y: interpolate(m, [0, 1], [cy, 12])};
  const site = {x: interpolate(m, [0, 1], [960 - rowW / 2 + LOGO_W * 1.4 + gap, VIDEO.width - 28 - SITE_W]), y: interpolate(m, [0, 1], [cy, 12])};
  const o = interpolate(t, [0.1, 0.6], [0, 1], clamp);
  const box = {position: 'absolute', zIndex: 50, height: BRAND_BOX_H, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transformOrigin: 'top left', transform: `scale(${sc})`, opacity: o, boxShadow: `0 2px 10px rgba(0,0,0,${0.35 * m})`} as const; // no shadow seam while joined
  return (
    <>
      <div style={{...box, left: logo.x, top: logo.y, width: LOGO_W, background: '#fff', borderRadius: `10px ${10 * m}px ${10 * m}px 10px`}}>
        <Img src={staticFile('brand/duytan.png')} style={{height: 40, display: 'block'}} />
      </div>
      <div style={{...box, left: site.x, top: site.y, width: SITE_W, fontFamily, fontSize: 24, fontWeight: 800, letterSpacing: 2,
        color: '#034ea2', background: '#fff', borderRadius: `${10 * m}px 10px 10px ${10 * m}px`}}>
        {/* divider while the two cards are joined */}
        <div style={{position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, background: '#c9d3e6', opacity: 1 - m}} />
        DTLA WAREHOUSE
      </div>
    </>
  );
};

/** Condensed version with the final v4 voice-over: every scene beat is placed on its sentence (tools/voice_v4_plan.py). */
/** enFirst: subtitles with English as the main line. */
export const CondensedVoice: React.FC<{enFirst?: boolean; englishVoice?: boolean; brand?: boolean}> = ({enFirst = false, englishVoice = false, brand = false}) => {
  const vo = (englishVoice ? voEN : voV4) as unknown as Voice;
  const S = vo.scenes;
  const extra = brand ? TITLE_EXTRA : 0;
  const titleEnd = S.title.seconds + extra;
  // everything after the title moves back by the extra title time
  const shift = (at: number) => (at < S.title.seconds ? at : at + extra);
  return (
  <LangContext.Provider value={enFirst ? 'en' : 'vi'}>
  <AbsoluteFill style={{background: '#070b14'}}>
    <AbsoluteFill style={brand ? {transform: `translateY(${BRAND_H}px) scale(${BRAND_SCALE})`, transformOrigin: 'top center'} : undefined}>
    <Series>
      <Series.Sequence durationInFrames={f(titleEnd)}>
        <TitleScene noStats site={brand} topGap={brand ? 60 : 0} />
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
      <Sequence key={a.file} from={f(shift(a.at))}>
        <Audio src={staticFile(a.file)} />
      </Sequence>
    ))}
    <Subtitles enFirst={enFirst} vo={vo} shift={shift} from={brand ? titleEnd : 0} />
    {brand ? <Brand outAt={titleEnd} /> : null}
  </AbsoluteFill>
  </LangContext.Provider>
  );
};
