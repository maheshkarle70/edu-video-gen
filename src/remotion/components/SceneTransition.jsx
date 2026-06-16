// src/remotion/components/SceneTransition.jsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const SceneTransition = ({ totalFrames, accentColor }) => {
  const frame = useCurrentFrame();
  // Flash in the last 15 frames of each scene
  const flashStart = totalFrames - 15;
  const opacity = interpolate(
    frame,
    [flashStart, flashStart + 5, totalFrames],
    [0, 0.7, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      background: accentColor,
      opacity,
      pointerEvents: 'none',
    }} />
  );
};
