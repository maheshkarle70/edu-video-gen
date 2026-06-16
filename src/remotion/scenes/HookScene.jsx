// src/remotion/scenes/HookScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { fadeIn, slideUp, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';

export const HookScene = ({ scene, accentColor, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emojiScale = spring({ frame, fps, config: { damping: 10, stiffness: 180, mass: 0.7 } });
  const emojiOpacity = fadeIn(frame, 0, 20);

  const titleOpacity = fadeIn(frame, 18, 38);
  const titleY = slideUp(frame, 18, 50, 25);

  const bodyOpacity = fadeIn(frame, 35, 55);
  const bodyY = slideUp(frame, 35, 40, 25);

  const keywordOpacity = fadeIn(frame, 55, 75);
  const keywordScale = springScale(frame, fps, 55);

  // Radial glow pulse
  const glowSize = interpolate(frame, [0, fps * 2, fps * 4], [300, 420, 300], {
    extrapolateRight: 'clamp',
    easing: (t) => Math.sin(t * Math.PI),
  });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 40%, ${accentColor}25 0%, ${scene.bgColor || '#0a0a1a'} 70%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 60px',
    }}>
      <Particles color={accentColor} count={20} seed={scene.id * 7} />

      {/* Glowing orb behind emoji */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        width: glowSize,
        height: glowSize,
        background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />

      {/* Big emoji */}
      <div style={{
        fontSize: 180,
        opacity: emojiOpacity,
        transform: `scale(${emojiScale})`,
        marginBottom: 40,
        filter: `drop-shadow(0 0 40px ${accentColor}80)`,
        lineHeight: 1,
      }}>
        {scene.emoji}
      </div>

      {/* Title */}
      <div style={{
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        fontSize: 72,
        fontWeight: 900,
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: 1.1,
        letterSpacing: -1,
        marginBottom: 36,
        textShadow: `0 0 60px ${accentColor}60`,
      }}>
        {scene.title}
      </div>

      {/* Body */}
      <div style={{
        opacity: bodyOpacity,
        transform: `translateY(${bodyY}px)`,
        fontSize: 42,
        color: 'rgba(255,255,255,0.82)',
        textAlign: 'center',
        lineHeight: 1.55,
        maxWidth: 880,
        marginBottom: 64,
        fontWeight: 400,
      }}>
        {scene.body}
      </div>

      {/* Keyword badge */}
      {scene.keyword && (
        <div style={{
          opacity: keywordOpacity,
          transform: `scale(${keywordScale})`,
          background: accentColor,
          borderRadius: 60,
          padding: '18px 52px',
          fontSize: 38,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 3,
          textTransform: 'uppercase',
          boxShadow: `0 0 40px ${accentColor}80`,
        }}>
          {scene.keyword}
        </div>
      )}
    </AbsoluteFill>
  );
};
