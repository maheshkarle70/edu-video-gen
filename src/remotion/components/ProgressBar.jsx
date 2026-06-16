// src/remotion/components/ProgressBar.jsx
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const ProgressBar = ({ progress, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 6,
      background: 'rgba(255,255,255,0.08)',
      opacity,
    }}>
      <div style={{
        height: '100%',
        width: `${progress * 100}%`,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
        borderRadius: '0 3px 3px 0',
        boxShadow: `0 0 12px ${accentColor}`,
        transition: 'width 0.1s linear',
      }} />
    </div>
  );
};
