// src/remotion/EduVideo.jsx
// Master component — orchestrates all scenes on a single timeline

import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion';
import { HookScene } from './scenes/HookScene';
import { ConceptScene } from './scenes/ConceptScene';
import { FactScene } from './scenes/FactScene';
import { AnalogyScene } from './scenes/AnalogyScene';
import { QuizScene } from './scenes/QuizScene';
import { SummaryScene } from './scenes/SummaryScene';
import { ProgressBar } from './components/ProgressBar';
import { SceneTransition } from './components/SceneTransition';

const SCENE_COMPONENTS = {
  hook: HookScene,
  concept: ConceptScene,
  fact: FactScene,
  analogy: AnalogyScene,
  quiz: QuizScene,
  summary: SummaryScene,
};

function audioSrc(file) {
  if (!file) return null;
  if (/^(https?:|file:|data:)/.test(file)) return file;
  return staticFile(file);
}

export const EduVideo = ({ topic, scenes, accentColor = '#7c5cfc' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Build scene timeline: each scene starts after the previous ends
  const TRANSITION_FRAMES = fps * 0.5; // 0.5s transition between scenes
  let cursor = 0;
  const timeline = scenes.map((scene) => {
    const durationFrames = Math.ceil((scene.audioDuration || 5) * fps) + TRANSITION_FRAMES;
    const entry = { ...scene, startFrame: cursor, durationFrames };
    cursor += durationFrames;
    return entry;
  });

  const totalFrames = cursor;
  const progress = frame / totalFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Scenes ── */}
      {timeline.map((scene, idx) => {
        const SceneComp = SCENE_COMPONENTS[scene.type] || ConceptScene;
        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
          >
            {/* Scene audio */}
            {scene.audioFile && (
              <Audio src={audioSrc(scene.audioFile)} />
            )}

            {/* Scene visual */}
            <SceneComp
              scene={scene}
              accentColor={accentColor}
              sceneDuration={scene.durationFrames}
              isLast={idx === timeline.length - 1}
            />

            {/* Flash transition at end of each scene */}
            {idx < timeline.length - 1 && (
              <SceneTransition
                totalFrames={scene.durationFrames}
                accentColor={accentColor}
              />
            )}
          </Sequence>
        );
      })}

      {/* ── Progress bar (always on top) ── */}
      <ProgressBar progress={progress} accentColor={accentColor} />

      {/* ── Topic watermark ── */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: 48,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <TopicTag topic={topic} accentColor={accentColor} />
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};

// ── Topic tag at top ─────────────────────────────────────────────
const TopicTag = ({ topic, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity,
      background: 'rgba(0,0,0,0.6)',
      border: `1px solid ${accentColor}40`,
      borderRadius: 40,
      padding: '10px 28px',
      fontSize: 28,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: 600,
      letterSpacing: 1,
      backdropFilter: 'blur(10px)',
    }}>
      {topic}
    </div>
  );
};
