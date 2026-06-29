// Karaoke-style captions — 4-word chip, hidden on summary to avoid CTA overlap
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import {
  getActiveWordIndex,
  getCaptionWindow,
  sanitizeCaptionWords,
} from '../utils/captions';

const MAX_WORDS = 4;

export const KaraokeCaptions = ({ wordTimings, accentColor, narration, hidden }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (hidden) return null;

  const words = sanitizeCaptionWords(wordTimings, narration);
  if (!words.length) return null;

  const activeIdx = getActiveWordIndex(words, timeSec);
  const { slice, offset } = getCaptionWindow(words, activeIdx, MAX_WORDS);
  const visible = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      bottom: 52,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      opacity: visible,
      pointerEvents: 'none',
      zIndex: 25,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.88)',
        borderRadius: 10,
        padding: '10px 18px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)',
        maxWidth: '88%',
      }}>
        <p style={{
          margin: 0,
          display: 'flex',
          flexWrap: 'nowrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          fontSize: 26,
          lineHeight: 1.2,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {slice.map((w, i) => {
            const globalIdx = offset + i;
            const isActive = globalIdx === activeIdx;
            const isPast = globalIdx < activeIdx;

            return (
              <span
                key={`${globalIdx}-${w.word}`}
                style={{
                  color: isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                  background: isActive ? accentColor : 'transparent',
                  padding: isActive ? '2px 8px' : '2px 0',
                  borderRadius: 6,
                }}
              >
                {w.word}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
};
