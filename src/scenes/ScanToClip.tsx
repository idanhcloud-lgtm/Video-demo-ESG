import {AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {fontFamily} from '../theme';

/**
 * Phone clip of the TO being created: scan the pallet QR code, SAP creates the TO and prints it.
 * English captions, one per shot of the clip. The clip itself stays out of git (public/clips/).
 */
export const SCAN_TO_SECONDS = 14;
const STEPS = [
  {at: 0.3, end: 3.5, n: '1', en: 'Scan the QR code on the pallet'},
  {at: 3.7, end: 10.9, n: '2', en: 'SAP automatically creates the TO and prints it'},
  {at: 11.1, end: 13.9, n: '3', en: 'The TO is ready for put-away'},
];

export const ScanToClip: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const ease = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)} as const;
  return (
    <AbsoluteFill style={{background: '#000', fontFamily}}>
      <OffthreadVideo src={staticFile('clips/scan_to.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      {/* soft dark fade at the bottom so the caption reads on any shot */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)'}} />
      {STEPS.map((s) => {
        const o = interpolate(t, [s.at, s.at + 0.3, s.end - 0.25, s.end], [0, 1, 1, 0], ease);
        if (o <= 0) return null;
        const y = interpolate(t, [s.at, s.at + 0.35], [24, 0], ease);
        return (
          <div key={s.n} style={{position: 'absolute', left: 60, right: 60, bottom: 170, display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${y}px)`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 22, background: 'rgba(8,14,28,0.82)', border: '2px solid rgba(95,182,255,0.55)', borderRadius: 22,
              padding: '22px 30px', boxShadow: '0 8px 28px rgba(0,0,0,0.45)'}}>
              <div style={{flex: 'none', width: 66, height: 66, borderRadius: 33, background: 'linear-gradient(180deg, #1a7cff, #034ea2)', color: '#fff',
                fontSize: 36, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {s.n}
              </div>
              <div style={{fontSize: 46, fontWeight: 800, color: '#fff', lineHeight: 1.2}}>{s.en}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
