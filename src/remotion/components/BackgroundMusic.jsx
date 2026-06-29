// Low-volume background music bed, ducked during voiceover
import { Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

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
  const TRANSITION = Math.round(fps * 0.15);
  let cursor = 0;
  return scenes.map((scene) => {
    const dur = Math.ceil((scene.audioDuration || scene.durationSec || 5) * fps) + TRANSITION;
    const voiceEnd = cursor + Math.ceil((scene.audioDuration || scene.durationSec || 5) * fps);
    const range = [cursor, voiceEnd];
    cursor += dur;
    return range;
  });
}
