// src/remotion/scenes/AnalogyScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideUp, slideInLeft } from '../utils/animations';
import { Particles } from '../components/Particles';

export const AnalogyScene = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op1 = fadeIn(frame, 0, 20);
  const x1 = slideInLeft(frame, 0, -70, 22);
  const op2 = fadeIn(frame, 22, 42);
  const y2 = slideUp(frame, 22, 50, 26);
  const op3 = fadeIn(frame, 48, 65);
  const y3 = slideUp(frame, 48, 40, 22);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(150deg, ${scene.bgColor || '#0a1a0f'} 0%, #06100a 100%)`,
      padding: '160px 70px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <Particles color={accentColor} count={16} seed={scene.id * 23} />

      <div style={{ opacity: op1, transform: `translateX(${x1}px)`, marginBottom: 16 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 4 }}>
          🔗 Think of it like...
        </span>
      </div>

      <div style={{
        opacity: op1,
        transform: `translateX(${x1}px)`,
        fontSize: 68,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1.1,
        letterSpacing: -1,
        marginBottom: 40,
      }}>{scene.title}</div>

      <div style={{
        opacity: op2,
        transform: `translateY(${y2}px)`,
        background: 'rgba(255,255,255,0.05)',
        borderLeft: `5px solid ${accentColor}`,
        borderRadius: '0 16px 16px 0',
        padding: '36px 48px',
        fontSize: 44,
        color: 'rgba(255,255,255,0.88)',
        lineHeight: 1.6,
        marginBottom: 52,
        fontStyle: 'italic',
      }}>{scene.body}</div>

      {scene.keyword && (
        <div style={{
          opacity: op3,
          transform: `translateY(${y3}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}>
          <div style={{ width: 50, height: 2, background: accentColor, borderRadius: 1 }} />
          <span style={{
            fontSize: 36,
            fontWeight: 800,
            color: accentColor,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>{scene.keyword}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
