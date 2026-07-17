// src/remotion/EduVideo.jsx
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { HookScene } from './scenes/HookScene';
import { ConceptScene } from './scenes/ConceptScene';
import { FactScene } from './scenes/FactScene';
import { AnalogyScene } from './scenes/AnalogyScene';
import { QuizScene } from './scenes/QuizScene';
import { SummaryScene } from './scenes/SummaryScene';
import { SectionScene } from './scenes/SectionScene';
import { DemoScene } from './scenes/DemoScene';
import { ProgressBar } from './components/ProgressBar';
import { KaraokeCaptions } from './components/KaraokeCaptions';
import { BackgroundMusic, buildVoiceRanges } from './components/BackgroundMusic';
import { sceneDurationFrames } from './utils/timeline';
import { loadDevanagariFont, FONT_STACK } from './utils/fonts.js';
import {
  TitleScene, IconRowScene, BarChartScene, ComparisonScene, CodeScene, OutroScene,
} from './scenes/aipadhai/index.jsx';

loadDevanagariFont();

const SCENE_COMPONENTS = {
  hook: HookScene,
  concept: ConceptScene,
  fact: FactScene,
  analogy: AnalogyScene,
  quiz: QuizScene,
  summary: SummaryScene,
  section: SectionScene,
  demo: DemoScene,
  // AI Padhai branded pack (CCA-F series design system)
  aipTitle: TitleScene,
  aipIconRows: IconRowScene,
  aipBarChart: BarChartScene,
  aipComparison: ComparisonScene,
  aipCode: CodeScene,
  aipOutro: OutroScene,
};

function audioSrc(file) {
  if (!file) return null;
  if (/^(https?:|file:|data:)/.test(file)) return file;
  return staticFile(file);
}

export const EduVideo = ({ topic, scenes, accentColor = '#7c5cfc', hashtag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const TRANSITION_FRAMES = Math.round(fps * 0.15);
  let cursor = 0;
  const timeline = scenes.map((scene) => {
    const durationFrames = sceneDurationFrames(scene, fps);
    const audioFrames = durationFrames - TRANSITION_FRAMES;
    const entry = { ...scene, startFrame: cursor, durationFrames, audioFrames };
    cursor += durationFrames;
    return entry;
  });

  const totalFrames = cursor;
  const progress = frame / totalFrames;
  const voiceRanges = buildVoiceRanges(scenes, fps);
  const tag = hashtag || `#${(topic || 'Learn').replace(/\s+/g, '')}`;

  // Which scene is on screen now — hide floating topic tag on demos (chrome already has titles)
  const activeScene = timeline.find(
    (s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames,
  ) || timeline[0];
  const hideTopicTag = activeScene?.type === 'demo' || activeScene?.hideTopicTag;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: FONT_STACK }}>

      <BackgroundMusic voiceRanges={voiceRanges} />

      {timeline.map((scene, idx) => {
        const SceneComp = SCENE_COMPONENTS[scene.type] || ConceptScene;
        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
          >
            {scene.audioFile && (
              <Audio src={audioSrc(scene.audioFile)} />
            )}

            <SceneComp
              scene={scene}
              accentColor={accentColor}
              topic={topic}
              hashtag={tag}
              sceneDuration={scene.durationFrames}
              isLast={idx === timeline.length - 1}
            />

            <KaraokeCaptions
              wordTimings={scene.wordTimings}
              narration={scene.narration}
              accentColor={accentColor}
              hidden={
                scene.type === 'summary'
                || scene.type === 'demo'
                || scene.hideCaptions
              }
            />
          </Sequence>
        );
      })}

      <ProgressBar progress={progress} accentColor={accentColor} />

      {!hideTopicTag && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute',
            top: 36,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
          }}>
            <TopicTag topic={topic} accentColor={accentColor} />
          </div>
        </AbsoluteFill>
      )}

    </AbsoluteFill>
  );
};

const TopicTag = ({ topic, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity,
      background: 'rgba(0,0,0,0.72)',
      border: `1px solid ${accentColor}40`,
      borderRadius: 40,
      padding: '8px 22px',
      fontSize: 22,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: 600,
      letterSpacing: 0.5,
      backdropFilter: 'blur(10px)',
      maxWidth: '70%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {topic}
    </div>
  );
};
