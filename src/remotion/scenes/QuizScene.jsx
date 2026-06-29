// src/remotion/scenes/QuizScene.jsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, slideUp, slideInLeft, slideInRight } from '../utils/animations';
import { Particles } from '../components/Particles';
import { SceneBackground } from '../components/SceneBackground';

export const QuizScene = ({ scene, accentColor, topic, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 18);
  const questionOp = fadeIn(frame, 15, 35);
  const questionY = slideUp(frame, 15, 50, 25);
  const options = scene.options || [];

  const revealSec = scene.answerRevealSec ?? fps * 3.5 / fps;
  const revealFrame = Math.round(revealSec * fps);
  const revealed = frame >= revealFrame;

  const pausePulse = !revealed && frame > revealFrame - fps * 2.5
    ? 0.5 + 0.5 * Math.sin(frame * 0.15)
    : 1;

  return (
    <SceneBackground scene={scene} accentColor={accentColor} topic={topic} sceneDuration={sceneDuration}>
      <AbsoluteFill style={{
        padding: '160px 70px 120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <Particles color={accentColor} count={20} seed={scene.id * 31} />

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

        <div style={{
          opacity: questionOp,
          transform: `translateY(${questionY}px)`,
          fontSize: 56,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.25,
          marginBottom: 52,
        }}>{scene.body}</div>

        {!revealed && frame > revealFrame - fps * 2.5 && (
          <div style={{
            textAlign: 'center',
            marginBottom: 24,
            fontSize: 32,
            fontWeight: 700,
            color: accentColor,
            opacity: pausePulse,
            letterSpacing: 2,
          }}>
            🤔 Think about it...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {options.map((opt, i) => {
            const optDelay = 35 + i * 14;
            const optOp = fadeIn(frame, optDelay, optDelay + 16);
            const fromLeft = i % 2 === 0;
            const slideX = fromLeft
              ? slideInLeft(frame, optDelay, -140, 24)
              : slideInRight(frame, optDelay, 140, 24);
            const letter = opt.charAt(0);
            const isAnswer = letter === scene.answer;
            const revealOp = fadeIn(frame, revealFrame, revealFrame + 15);

            return (
              <div key={i} style={{
                opacity: optOp,
                transform: `translateX(${slideX}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                background: revealed && isAnswer ? `${accentColor}35` : 'rgba(255,255,255,0.07)',
                border: `2px solid ${revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 16,
                padding: '24px 36px',
                fontSize: 38,
                color: revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.88)',
                fontWeight: revealed && isAnswer ? 700 : 400,
                backdropFilter: 'blur(6px)',
                boxShadow: revealed && isAnswer ? `0 0 24px ${accentColor}50` : 'none',
              }}>
                <span style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: revealed && isAnswer ? accentColor : 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 28,
                  color: revealed && isAnswer ? '#fff' : 'rgba(255,255,255,0.65)',
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
    </SceneBackground>
  );
};
