// Split-screen analogy: concept on left, everyday comparison on right
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideInLeft, slideInRight, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';

export const AnalogyScene = ({ scene, accentColor, topic, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = scene.analogyLeft || { label: 'The Concept', text: scene.title };
  const right = scene.analogyRight || { label: 'Like...', text: scene.body };

  const headerOp = fadeIn(frame, 0, 18);
  const leftOp = fadeIn(frame, 12, 32);
  const leftX = slideInLeft(frame, 12, -80, 28);
  const rightOp = fadeIn(frame, 22, 42);
  const rightX = slideInRight(frame, 22, 80, 28);
  const vsScale = springScale(frame, fps, 18);
  const keyOp = fadeIn(frame, 50, 68);

  const bridgeOp = fadeIn(frame, fps * 1.2, fps * 1.8);
  const bridgePulse = 0.5 + 0.5 * Math.sin(frame * 0.12);

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        padding: '140px 50px 160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <Particles color={accentColor} count={16} seed={scene.id * 23} />

        <div style={{ opacity: headerOp, marginBottom: 36, textAlign: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 4 }}>
            🔗 Think of it like...
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: 24,
          alignItems: 'stretch',
          flex: 1,
          maxHeight: 720,
        }}>
          {/* Left — concept */}
          <div style={{
            flex: 1,
            opacity: leftOp,
            transform: `translateX(${leftX}px)`,
            background: 'rgba(255,255,255,0.06)',
            border: `2px solid ${accentColor}60`,
            borderRadius: 24,
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: 3,
              marginBottom: 20,
            }}>
              {left.label}
            </div>
            <div style={{
              fontSize: 38,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.45,
            }}>
              {left.text}
            </div>
          </div>

          {/* Animated bridge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            opacity: bridgeOp,
          }}>
            <svg width="48" height="120" viewBox="0 0 48 120" style={{ opacity: bridgePulse }}>
              <line x1="24" y1="10" x2="24" y2="110" stroke={accentColor} strokeWidth="3" strokeDasharray="8 6" />
              <polygon points="16,100 24,118 32,100" fill={accentColor} />
            </svg>
            <div style={{
              transform: `scale(${vsScale})`,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 900,
              color: '#fff',
              boxShadow: `0 0 30px ${accentColor}80`,
            }}>
              =
            </div>
          </div>

          {/* Right — everyday comparison */}
          <div style={{
            flex: 1,
            opacity: rightOp,
            transform: `translateX(${rightX}px)`,
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.15)',
            borderRadius: 24,
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              letterSpacing: 3,
              marginBottom: 20,
            }}>
              {right.label}
            </div>
            <div style={{
              fontSize: 38,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.45,
              fontStyle: 'italic',
            }}>
              {right.text}
            </div>
          </div>
        </div>

        {scene.keyword && (
          <div style={{
            opacity: keyOp,
            marginTop: 40,
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{ width: 50, height: 2, background: accentColor, borderRadius: 1 }} />
            <span style={{
              fontSize: 32,
              fontWeight: 800,
              color: accentColor,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>{scene.keyword}</span>
          </div>
        )}
      </AbsoluteFill>
    </SceneBackground>
  );
};
