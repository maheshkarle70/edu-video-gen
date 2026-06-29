// Long-form YouTube section scene — chapter badge + explainer diagram
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideUp, springScale } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';
import { ExplainerVisual, normalizeVisual } from '../components/ExplainerVisual';

export const SectionScene = ({ scene, accentColor, topic, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visual = normalizeVisual(scene);

  const chapter = scene.chapter || 1;
  const total = scene.chapterTotal || chapter;
  const badgeOp = fadeIn(frame, 0, 16);
  const headerOp = fadeIn(frame, 8, 24);
  const headerY = slideUp(frame, 8, 24, 18);
  const bodyOp = fadeIn(frame, fps * 1.8, fps * 2.8);
  const bodyY = slideUp(frame, fps * 1.8, 28, 22);
  const keyOp = fadeIn(frame, fps * 3, fps * 3.8);
  const keyScale = springScale(frame, fps, fps * 3);

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        padding: '100px 80px 160px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'center',
      }}>
        <Particles color={accentColor} count={14} seed={scene.id * 19} />

        <div style={{
          opacity: badgeOp,
          background: `${accentColor}25`,
          border: `2px solid ${accentColor}`,
          borderRadius: 10,
          padding: '10px 22px',
          marginBottom: 20,
          fontSize: 22,
          fontWeight: 800,
          color: accentColor,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          Part {chapter} of {total}
        </div>

        <div style={{
          opacity: headerOp,
          transform: `translateY(${headerY}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 40 }}>{scene.emoji || '📌'}</span>
          {scene.subtopic && (
            <span style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 1,
            }}>{scene.subtopic}</span>
          )}
        </div>

        <div style={{
          opacity: headerOp,
          transform: `translateY(${headerY}px)`,
          fontSize: 52,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.12,
          letterSpacing: -1,
          marginBottom: 24,
          maxWidth: 1600,
          width: '100%',
        }}>
          {scene.title}
        </div>

        {visual && (
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 18,
            padding: '14px 12px 6px',
            marginBottom: 20,
            backdropFilter: 'blur(6px)',
            width: '100%',
            maxWidth: 1200,
          }}>
            <ExplainerVisual visual={visual} accentColor={accentColor} startFrame={12} />
          </div>
        )}

        <div style={{
          opacity: bodyOp,
          transform: `translateY(${bodyY}px)`,
          fontSize: 32,
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.55,
          marginBottom: 28,
          maxWidth: 1500,
          width: '100%',
        }}>
          {scene.body}
        </div>

        {scene.keyword && (
          <div style={{
            opacity: keyOp,
            transform: `scale(${keyScale})`,
            background: `${accentColor}18`,
            border: `2px solid ${accentColor}80`,
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 26,
            fontWeight: 800,
            color: accentColor,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {scene.keyword}
          </div>
        )}
      </AbsoluteFill>
    </SceneBackground>
  );
};
