// Low-volume background music bed, ducked during voiceover
import { Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { sceneDurationFrames, TRANSITION_SEC } from '../utils/timeline.js';

export const BackgroundMusic = ({ voiceRanges, musicFile = 'music/bed.m4a' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inVoice = (voiceRanges || []).some(
    ([start, end]) => frame >= start && frame < end,
  );

  const volume = inVoice ? 0.07 : 0.14;

  return (
    <Audio
      src={staticFile(musicFile)}
      volume={volume}
      loop
      startFrom={0}
    />
  );
};

export function buildVoiceRanges(scenes, fps) {
  // Reuses the exact per-scene layout from utils/timeline so ducking ranges
  // can never drift from the composition's actual scene positions.
  const TRANSITION = Math.round(fps * TRANSITION_SEC);
  let cursor = 0;
  return (scenes || []).map((scene) => {
    const dur = sceneDurationFrames(scene, fps);
    const voiceEnd = cursor + (dur - TRANSITION);
    const range = [cursor, voiceEnd];
    cursor += dur;
    return range;
  });
}
