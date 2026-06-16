// src/remotion/scenes/FactScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { fadeIn, slideUp, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';

export const FactScene = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op1 = fadeIn(frame, 0, 18);
  const op2 = fadeIn(frame, 20, 40);
  const y2 = slideUp(frame, 20, 50, 25);
  const op3 = fadeIn(frame, 45, 65);
  const ks = springScale(frame, fps, 50);

  const borderGlow = interpolate(frame, [0, fps * 1.5, fps * 3], [0.3, 1, 0.3], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${scene.bgColor || '#0a0f1a'} 0%, #060810 100%)`,
      padding: '160px 70px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <Particles color={accentColor} count={22} seed={scene.id * 17} />

      {/* Fact card */}
      <div style={{
        opacity: op1,
        background: 'rgba(255,255,255,0.04)',
        border: `2px solid ${accentColor}`,
        boxShadow: `0 0 ${40 * borderGlow}px ${accentColor}40`,
        borderRadius: 28,
        padding: '60px 64px',
        marginBottom: 48,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <span style={{ fontSize: 64 }}>{scene.emoji}</span>
          <span style={{ fontSize: 28, color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3 }}>Did You Know?</span>
        </div>
        <div style={{
          fontSize: 66,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.1,
          letterSpacing: -1,
          marginBottom: 28,
        }}>{scene.title}</div>
      </div>

      <div style={{
        opacity: op2,
        transform: `translateY(${y2}px)`,
        fontSize: 44,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.6,
        marginBottom: 56,
      }}>{scene.body}</div>

      {scene.keyword && (
        <div style={{
          opacity: op3,
          transform: `scale(${ks})`,
          background: accentColor,
          borderRadius: 16,
          padding: '18px 48px',
          alignSelf: 'center',
          fontSize: 38,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 2,
          textTransform: 'uppercase',
          boxShadow: `0 0 48px ${accentColor}80`,
        }}>{scene.keyword}</div>
      )}
    </AbsoluteFill>
  );
};
