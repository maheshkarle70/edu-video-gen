// Looping B-roll with Ken Burns pan + blur/dark overlay for text readability
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { pickBroll } from '../utils/broll';

export const SceneBackground = ({ scene, accentColor, topic, sceneDuration, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = sceneDuration || durationInFrames;
  const brollPath = pickBroll({ scene, topic });
  const brollSrc = /^https?:/.test(brollPath) ? brollPath : staticFile(brollPath);
  const bg = scene.bgColor || '#0a0a1a';

  // Soft fade in/out — avoids harsh cuts between scenes (no accent flash)
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [total - 12, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sceneOpacity = fadeIn * fadeOut;

  const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.18], {
    extrapolateRight: 'clamp',
  });
  const panX = interpolate(frame, [0, durationInFrames], [0, -28], {
    extrapolateRight: 'clamp',
  });
  const panY = interpolate(frame, [0, durationInFrames], [0, -16], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ overflow: 'hidden', background: bg }}>
        <OffthreadVideo
          src={brollSrc}
          loop
          muted
          style={{
            width: '115%',
            height: '115%',
            objectFit: 'cover',
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            filter: 'blur(5px) brightness(0.38) saturate(1.15)',
          }}
        />
      </AbsoluteFill>

      {/* Dark tint + accent vignette so text stays readable */}
      <AbsoluteFill style={{
        background: `linear-gradient(165deg, ${bg}E6 0%, ${bg}B3 45%, ${bg}F0 100%)`,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 35%, ${accentColor}22 0%, transparent 65%)`,
      }} />

      <AbsoluteFill style={{ zIndex: 1 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
