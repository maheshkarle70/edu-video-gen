// src/remotion/scenes/FactScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { fadeIn, slideUp, springScale, flipIn } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { ExplainerVisual, normalizeVisual } from '../components/ExplainerVisual';

export const FactScene = ({ scene, accentColor, topic, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visual = normalizeVisual(scene);

  const cardFlip = flipIn(frame, 4, 28);
  const op2 = fadeIn(frame, fps * 1.8, fps * 2.6);
  const y2 = slideUp(frame, fps * 1.8, 35, 22);
  const op3 = fadeIn(frame, fps * 3.2, fps * 4);
  const ks = springScale(frame, fps, fps * 3.2);

  const borderGlow = interpolate(frame, [0, fps * 1.5, fps * 3], [0.3, 1, 0.3], {
    extrapolateRight: 'clamp',
  });

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        padding: '130px 50px 180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}>
        <Particles color={accentColor} count={22} seed={scene.id * 17} />

        {scene.stat && (
          <AnimatedCounter stat={scene.stat} accentColor={accentColor} startFrame={8} durationFrames={45} />
        )}

        <div style={{
          opacity: cardFlip.opacity,
          transform: `perspective(1400px) rotateX(${cardFlip.rotateX}deg)`,
          transformOrigin: '50% 100%',
          background: 'rgba(255,255,255,0.06)',
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 ${40 * borderGlow}px ${accentColor}40`,
          borderRadius: 24,
          padding: '36px 40px',
          marginBottom: 20,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 48 }}>{scene.emoji}</span>
            <span style={{ fontSize: 22, color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3 }}>Did You Know?</span>
          </div>
          <div style={{
            fontSize: 52,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: -1,
          }}>{scene.title}</div>
        </div>

        {visual && (
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 20,
            padding: '12px 10px 6px',
            marginBottom: 16,
            backdropFilter: 'blur(6px)',
          }}>
            <ExplainerVisual visual={visual} accentColor={accentColor} startFrame={fps * 0.8} />
          </div>
        )}

        <div style={{
          opacity: op2,
          transform: `translateY(${y2}px)`,
          fontSize: 36,
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.55,
          marginBottom: 40,
        }}>{scene.body}</div>

        {scene.keyword && (
          <div style={{
            opacity: op3,
            transform: `scale(${ks})`,
            background: accentColor,
            borderRadius: 14,
            padding: '14px 40px',
            alignSelf: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: 2,
            textTransform: 'uppercase',
            boxShadow: `0 0 48px ${accentColor}80`,
          }}>{scene.keyword}</div>
        )}
      </AbsoluteFill>
    </SceneBackground>
  );
};
