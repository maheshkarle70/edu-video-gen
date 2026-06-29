// Animated number counter for stats ("93%", "10,000 years ago")
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { formatStatNumber } from '../utils/captions';

export const AnimatedCounter = ({ stat, accentColor, startFrame = 20, durationFrames = 45 }) => {
  const frame = useCurrentFrame();
  if (!stat?.value && stat?.value !== 0) return null;

  const target = Number(stat.value);
  const progress = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const current = Math.round(target * progress);
  const display = formatStatNumber(current, stat.format);
  const opacity = interpolate(frame, [startFrame - 5, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      opacity,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 40,
    }}>
      <div style={{
        fontSize: 120,
        fontWeight: 900,
        color: accentColor,
        lineHeight: 1,
        letterSpacing: -2,
        textShadow: `0 0 60px ${accentColor}80`,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {stat.prefix || ''}{display}{stat.suffix || ''}
      </div>
      {stat.label && (
        <div style={{
          marginTop: 12,
          fontSize: 36,
          color: 'rgba(255,255,255,0.75)',
          fontWeight: 600,
          textAlign: 'center',
          letterSpacing: 1,
        }}>
          {stat.label}
        </div>
      )}
    </div>
  );
};
