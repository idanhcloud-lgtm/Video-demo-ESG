import {AbsoluteFill} from 'remotion';
import {colors} from '../theme';

export const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.bg,
      backgroundImage: [
        'radial-gradient(ellipse 60% 35% at 50% 0%, rgba(38, 78, 160, 0.35), transparent 70%)',
        'linear-gradient(rgba(120, 150, 255, 0.035) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(120, 150, 255, 0.035) 1px, transparent 1px)',
      ].join(','),
      backgroundSize: '100% 100%, 48px 48px, 48px 48px',
    }}
  />
);
