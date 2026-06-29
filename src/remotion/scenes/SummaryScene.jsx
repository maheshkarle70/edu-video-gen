// src/remotion/scenes/SummaryScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideUp, springScale, popIn } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';

const DEFAULT_CTA = 'Follow & Subscribe for More';

export const SummaryScene = ({ scene, accentColor, topic, hashtag, sceneDuration, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op1 = fadeIn(frame, 0, 20);
  const op2 = fadeIn(frame, 22, 42);
  const y2 = slideUp(frame, 22, 50, 26);
  const ctaOp = fadeIn(frame, 55, 75);
  const ctaScale = springScale(frame, fps, 58);
  const endCardOp = fadeIn(frame, 80, 100);

  const bullets = scene.body
    ? scene.body.split(/\.\s+/).filter(Boolean).map((s) => s.replace(/\.$/, ''))
    : [];

  const glowPulse = 0.4 + 0.3 * Math.sin(frame * 0.06);
  const tag = hashtag || `#${(topic || 'Learn').replace(/\s+/g, '')}`;
  const rawCta = scene.cta || DEFAULT_CTA;
  const ctaText = /part\s*2/i.test(rawCta) ? DEFAULT_CTA : rawCta;

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        padding: '140px 70px 240px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <Particles color={accentColor} count={24} seed={scene.id * 41} />

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
          textShadow: `0 0 80px ${accentColor}${Math.round(glowPulse * 255).toString(16).padStart(2, '0')}`,
        }}>{scene.title}</div>

        <div style={{ opacity: op2, transform: `translateY(${y2}px)` }}>
          {bullets.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {bullets.map((b, i) => {
                const delay = 30 + i * 16;
                const bOp = fadeIn(frame, delay, delay + 12);
                const pop = popIn(frame, fps, delay);
                return (
                  <div key={i} style={{
                    opacity: bOp,
                    transform: `scale(${pop})`,
                    transformOrigin: 'left center',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 20,
                    fontSize: 40,
                    color: 'rgba(255,255,255,0.92)',
                    lineHeight: 1.45,
                  }}>
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: accentColor,
                      marginTop: 14,
                      flexShrink: 0,
                      boxShadow: `0 0 12px ${accentColor}`,
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

        {isLast && (
          <div style={{
            opacity: endCardOp,
            marginTop: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}>
            <div style={{
              opacity: ctaOp,
              transform: `scale(${ctaScale})`,
              background: accentColor,
              borderRadius: 60,
              padding: '22px 48px',
              fontSize: 34,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 1,
              textAlign: 'center',
              lineHeight: 1.35,
              maxWidth: 900,
              boxShadow: `0 0 60px ${accentColor}80`,
            }}>
              {ctaText} 🚀
            </div>

            <div style={{
              opacity: fadeIn(frame, 68, 88),
              fontSize: 26,
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              Follow or subscribe to our channel for more videos like this
            </div>

            <div style={{
              opacity: ctaOp,
              fontSize: 40,
              fontWeight: 800,
              color: accentColor,
              letterSpacing: 2,
            }}>
              {tag}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </SceneBackground>
  );
};
