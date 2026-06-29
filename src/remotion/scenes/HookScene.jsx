// src/remotion/scenes/HookScene.jsx
// Phase 1: big hookStat (3s) → Phase 2: stat shrinks to banner, title/body/keyword stack in
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { fadeIn, slideUp, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';

export const HookScene = ({ scene, accentColor, topic, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hookStat = scene.hookStat || scene.body?.split('.')[0] || scene.title;

  // Big stat: 0 → 3s, then shrinks to top banner (stays visible rest of scene)
  const BIG_END = fps * 3;
  const REVEAL_START = fps * 2;

  const bigPhase = interpolate(frame, [0, BIG_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });
  const bannerPhase = interpolate(frame, [BIG_END - 8, BIG_END + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bigScale = interpolate(bigPhase, [0, 1], [0.55, 1]);
  const bigOpacity = fadeIn(frame, 0, 15) * bigPhase;
  const bigY = interpolate(bigPhase, [0, 1], [30, 0]);

  const statScale = spring({ frame, fps, config: { damping: 14, stiffness: 140, mass: 0.9 } });

  const titleOpacity = fadeIn(frame, REVEAL_START, REVEAL_START + 22);
  const titleY = slideUp(frame, REVEAL_START, 40, 22);
  const bodyOpacity = fadeIn(frame, REVEAL_START + 14, REVEAL_START + 34);
  const bodyY = slideUp(frame, REVEAL_START + 14, 35, 22);
  const keywordOpacity = fadeIn(frame, REVEAL_START + 28, REVEAL_START + 48);
  const keywordScale = springScale(frame, fps, REVEAL_START + 28);

  const glowSize = interpolate(frame, [REVEAL_START, REVEAL_START + fps * 2, REVEAL_START + fps * 4], [280, 400, 280], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => Math.sin(t * Math.PI),
  });

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 60px',
      }}>
        <Particles color={accentColor} count={20} seed={scene.id * 7} />

        {/* Big hook stat — centered, fades as banner takes over */}
        {bigPhase > 0.02 && (
          <div style={{
            position: 'absolute',
            top: '46%',
            left: '50%',
            transform: `translate(-50%, calc(-50% + ${bigY}px)) scale(${bigScale * statScale})`,
            opacity: bigOpacity,
            textAlign: 'center',
            maxWidth: 920,
            zIndex: 5,
            pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: 84,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.12,
              letterSpacing: -1,
              textShadow: `0 0 80px ${accentColor}`,
            }}>
              {hookStat}
            </div>
          </div>
        )}

        {/* Compact banner — keeps hookStat on screen after big phase */}
        {bannerPhase > 0.02 && (
          <div style={{
            position: 'absolute',
            top: 200,
            left: 60,
            right: 60,
            opacity: bannerPhase,
            transform: `translateY(${interpolate(bannerPhase, [0, 1], [-12, 0])}px)`,
            zIndex: 6,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{
              background: `${accentColor}28`,
              border: `2px solid ${accentColor}70`,
              borderRadius: 14,
              padding: '14px 28px',
              fontSize: 30,
              fontWeight: 800,
              color: '#fff',
              textAlign: 'center',
              lineHeight: 1.3,
              maxWidth: 900,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 0 30px ${accentColor}30`,
            }}>
              {hookStat}
            </div>
          </div>
        )}

        {/* Main hook content — overlaps with end of big stat */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: bannerPhase > 0.5 ? 80 : 0,
          opacity: interpolate(frame, [REVEAL_START, REVEAL_START + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}>
          <div style={{
            position: 'absolute',
            top: '52%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: glowSize,
            height: glowSize,
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            borderRadius: '50%',
            opacity: titleOpacity,
          }} />

          <div style={{
            fontSize: 160,
            opacity: titleOpacity * 0.9,
            transform: `scale(${spring({ frame: Math.max(0, frame - REVEAL_START), fps, config: { damping: 12, stiffness: 160 } })})`,
            marginBottom: 32,
            marginTop: bannerPhase > 0.5 ? 100 : 0,
            filter: `drop-shadow(0 0 40px ${accentColor}80)`,
            lineHeight: 1,
          }}>
            {scene.emoji}
          </div>

          <div style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 68,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: -1,
            marginBottom: 28,
            textShadow: `0 0 60px ${accentColor}60`,
            maxWidth: 900,
          }}>
            {scene.title}
          </div>

          <div style={{
            opacity: bodyOpacity,
            transform: `translateY(${bodyY}px)`,
            fontSize: 40,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            lineHeight: 1.55,
            maxWidth: 860,
            marginBottom: 48,
          }}>
            {scene.body}
          </div>

          {scene.keyword && (
            <div style={{
              opacity: keywordOpacity,
              transform: `scale(${keywordScale})`,
              background: accentColor,
              borderRadius: 60,
              padding: '16px 48px',
              fontSize: 36,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 3,
              textTransform: 'uppercase',
              boxShadow: `0 0 40px ${accentColor}80`,
            }}>
              {scene.keyword}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </SceneBackground>
  );
};
