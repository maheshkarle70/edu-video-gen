// src/remotion/scenes/QuizScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { fadeIn, slideUp } from '../utils/animations';
import { Particles } from '../components/Particles';

export const QuizScene = ({ scene, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 18);
  const questionOp = fadeIn(frame, 15, 35);
  const questionY = slideUp(frame, 15, 50, 25);
  const options = scene.options || [];

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(145deg, ${scene.bgColor || '#1a0a0f'} 0%, #0d0608 100%)`,
      padding: '160px 70px 120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <Particles color={accentColor} count={20} seed={scene.id * 31} />

      {/* Header */}
      <div style={{ opacity: headerOp, display: 'flex', alignItems: 'center', gap: 18, marginBottom: 36 }}>
        <span style={{ fontSize: 64 }}>{scene.emoji || '❓'}</span>
        <span style={{
          fontSize: 30,
          fontWeight: 800,
          color: accentColor,
          textTransform: 'uppercase',
          letterSpacing: 4,
        }}>Quick Check</span>
      </div>

      {/* Question */}
      <div style={{
        opacity: questionOp,
        transform: `translateY(${questionY}px)`,
        fontSize: 56,
        fontWeight: 800,
        color: '#fff',
        lineHeight: 1.25,
        marginBottom: 52,
      }}>{scene.body}</div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {options.map((opt, i) => {
          const optDelay = 35 + i * 12;
          const optOp = fadeIn(frame, optDelay, optDelay + 18);
          const optY = slideUp(frame, optDelay, 35, 18);
          const letter = opt.charAt(0);
          const isAnswer = letter === scene.answer;
          const revealFrame = fps * 3.5;
          const revealed = frame > revealFrame;
          const revealOp = fadeIn(frame, revealFrame, revealFrame + 15);

          return (
            <div key={i} style={{
              opacity: optOp,
              transform: `translateY(${optY}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: revealed && isAnswer ? `${accentColor}30` : 'rgba(255,255,255,0.05)',
              border: `2px solid ${revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 16,
              padding: '24px 36px',
              fontSize: 38,
              color: revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.82)',
              fontWeight: isAnswer ? 700 : 400,
              transition: 'all 0.3s',
            }}>
              <span style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 28,
                color: revealed && isAnswer ? '#fff' : 'rgba(255,255,255,0.6)',
                flexShrink: 0,
              }}>{letter}</span>
              {opt.slice(3)}
              {revealed && isAnswer && (
                <span style={{ marginLeft: 'auto', opacity: revealOp, fontSize: 36 }}>✅</span>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
