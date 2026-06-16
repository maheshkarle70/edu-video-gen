// src/remotion/scenes/SummaryScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { fadeIn, slideUp, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';

export const SummaryScene = ({ scene, accentColor, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op1 = fadeIn(frame, 0, 20);
  const op2 = fadeIn(frame, 22, 42);
  const y2 = slideUp(frame, 22, 50, 26);
  const op3 = fadeIn(frame, 48, 65);
  const ks = springScale(frame, fps, 52);

  // Break body into bullet points if it has periods
  const bullets = scene.body
    ? scene.body.split(/\.\s+/).filter(Boolean).map(s => s.replace(/\.$/, ''))
    : [];

  const glowPulse = 0.4 + 0.3 * Math.sin(frame * 0.06);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, ${accentColor}18 0%, ${scene.bgColor || '#0a1a1a'} 60%, #050a0a 100%)`,
      padding: '160px 70px 120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <Particles color={accentColor} count={24} seed={scene.id * 41} />

      {/* Header */}
      <div style={{ opacity: op1, display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <span style={{ fontSize: 64, filter: `drop-shadow(0 0 20px ${accentColor})` }}>{scene.emoji || '💡'}</span>
        <span style={{
          fontSize: 30,
          fontWeight: 800,
          color: accentColor,
          textTransform: 'uppercase',
          letterSpacing: 4,
        }}>{scene.keyword || 'Key Takeaway'}</span>
      </div>

      <div style={{
        opacity: op1,
        fontSize: 66,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1.1,
        letterSpacing: -1,
        marginBottom: 44,
        textShadow: `0 0 80px ${accentColor}${Math.round(glowPulse * 255).toString(16)}`,
      }}>{scene.title}</div>

      {/* Bullet points or plain body */}
      <div style={{ opacity: op2, transform: `translateY(${y2}px)` }}>
        {bullets.length > 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {bullets.map((b, i) => {
              const bOp = fadeIn(frame, 28 + i * 14, 42 + i * 14);
              return (
                <div key={i} style={{
                  opacity: bOp,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 20,
                  fontSize: 40,
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.45,
                }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: accentColor,
                    marginTop: 14,
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${accentColor}`,
                  }} />
                  {b}.
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            fontSize: 44,
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1.6,
            marginBottom: 48,
          }}>{scene.body}</div>
        )}
      </div>

      {/* CTA if last scene */}
      {isLast && (
        <div style={{
          opacity: op3,
          transform: `scale(${ks})`,
          marginTop: 56,
          background: accentColor,
          borderRadius: 60,
          padding: '22px 60px',
          alignSelf: 'center',
          fontSize: 38,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 2,
          boxShadow: `0 0 60px ${accentColor}80`,
        }}>
          LIKE & FOLLOW FOR MORE 🚀
        </div>
      )}
    </AbsoluteFill>
  );
};
