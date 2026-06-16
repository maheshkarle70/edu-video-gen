// src/remotion/index.jsx
// Entry point — registers all Remotion compositions

import { Composition, registerRoot } from 'remotion';
import { EduVideo } from './EduVideo';

export const RemotionRoot = () => {
  // Default props (used in Remotion Studio preview)
  const defaultProps = {
    topic: 'How Black Holes Are Formed',
    accentColor: '#7c5cfc',
    scenes: [
      {
        id: 1,
        type: 'hook',
        title: 'What is a Black Hole?',
        body: 'A black hole is a region in space where gravity is so strong that nothing — not even light — can escape.',
        keyword: 'GRAVITY',
        emoji: '🌑',
        audioFile: null,
        audioDuration: 5,
        bgColor: '#0a0a1a',
      },
      {
        id: 2,
        type: 'concept',
        title: 'How They Form',
        body: 'When a massive star runs out of fuel, it collapses under its own gravity. If the star is large enough, this collapse creates a black hole.',
        keyword: 'COLLAPSE',
        emoji: '💥',
        audioFile: null,
        audioDuration: 6,
        bgColor: '#0f0a1f',
      },
      {
        id: 3,
        type: 'fact',
        title: 'The Event Horizon',
        body: 'The boundary of a black hole is called the event horizon. Cross it, and there is no return — even at the speed of light.',
        keyword: 'POINT OF NO RETURN',
        emoji: '⚫',
        audioFile: null,
        audioDuration: 6,
        bgColor: '#0a0f1a',
      },
      {
        id: 4,
        type: 'analogy',
        title: 'Think of it Like a Drain',
        body: 'Imagine a bathtub drain. Water (and everything near it) spirals inward and cannot escape. A black hole works the same way — but with space and light.',
        keyword: 'SPACE DRAIN',
        emoji: '🌀',
        audioFile: null,
        audioDuration: 6,
        bgColor: '#0a1a0f',
      },
      {
        id: 5,
        type: 'quiz',
        title: 'Quick Check',
        body: 'What is the boundary of a black hole called?',
        options: ['A. Singularity', 'B. Event Horizon', 'C. Nebula', 'D. Quasar'],
        answer: 'B',
        emoji: '❓',
        audioFile: null,
        audioDuration: 5,
        bgColor: '#1a0a0f',
      },
      {
        id: 6,
        type: 'summary',
        title: 'Key Takeaway',
        body: 'Black holes form from collapsed stars. Their gravity is so powerful that light itself cannot escape. The event horizon marks the point of no return.',
        keyword: 'REMEMBER THIS',
        emoji: '💡',
        audioFile: null,
        audioDuration: 6,
        bgColor: '#0a1a1a',
      },
    ],
  };

  // Calculate total duration: sum of all scene audio durations + transitions
  const totalSeconds = defaultProps.scenes.reduce((acc, s) => acc + (s.audioDuration || 5) + 1, 0);
  const fps = 30;

  return (
    <Composition
      id="EduVideo"
      component={EduVideo}
      durationInFrames={totalSeconds * fps}
      fps={fps}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => {
        const total = props.scenes.reduce((acc, s) => acc + (s.audioDuration || 5) + 1, 0);
        return { durationInFrames: Math.ceil(total * fps) };
      }}
    />
  );
};

registerRoot(RemotionRoot);
