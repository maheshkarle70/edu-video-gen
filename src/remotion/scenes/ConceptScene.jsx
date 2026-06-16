// src/remotion/scenes/ConceptScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideUp, slideInLeft, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';

export const ConceptScene = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 20);
  const headerX = slideInLeft(frame, 0, -60, 22);

  const dividerOp = fadeIn(frame, 18, 32);
  const bodyOp = fadeIn(frame, 28, 50);
  const bodyY = slideUp(frame, 28, 45, 28);
  const keyOp = fadeIn(frame, 55, 72);
  const keyScale = springScale(frame, fps, 55);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${scene.bgColor || '#0f0a1f'} 0%, #080810 100%)`,
      padding: '160px 70px 120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <Particles color={accentColor} count={18} seed={scene.id * 13} />

      {/* Scene type label */}
      <div style={{
        opacity: headerOp,
        transform: `translateX(${headerX}px)`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 28,
      }}>
        <span style={{ fontSize: 52 }}>{scene.emoji}</span>
        <span style={{
          fontSize: 26,
          fontWeight: 700,
          color: accentColor,
          textTransform: 'uppercase',
          letterSpacing: 4,
        }}>Concept</span>
      </div>

      {/* Title */}
      <div style={{
        opacity: headerOp,
        transform: `translateX(${headerX}px)`,
        fontSize: 68,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1.1,
        letterSpacing: -1,
        marginBottom: 32,
      }}>
        {scene.title}
      </div>

      {/* Accent divider */}
      <div style={{
        opacity: dividerOp,
        width: 80,
        height: 4,
        background: accentColor,
        borderRadius: 2,
        marginBottom: 36,
        boxShadow: `0 0 20px ${accentColor}`,
      }} />

      {/* Body */}
      <div style={{
        opacity: bodyOp,
        transform: `translateY(${bodyY}px)`,
        fontSize: 44,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.6,
        fontWeight: 400,
        marginBottom: 64,
      }}>
        {scene.body}
      </div>

      {/* Keyword */}
      {scene.keyword && (
        <div style={{
          opacity: keyOp,
          transform: `scale(${keyScale})`,
          alignSelf: 'flex-start',
          background: `${accentColor}22`,
          border: `2px solid ${accentColor}`,
          borderRadius: 14,
          padding: '16px 40px',
          fontSize: 36,
          fontWeight: 800,
          color: accentColor,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          {scene.keyword}
        </div>
      )}
    </AbsoluteFill>
  );
};
