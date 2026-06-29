export const TRANSITION_SEC = 0.15;

export function sceneDurationFrames(scene, fps = 30) {
  const audioFrames = Math.ceil((scene.audioDuration || scene.durationSec || 5) * fps);
  return audioFrames + Math.round(fps * TRANSITION_SEC);
}

export function totalDurationFrames(scenes, fps = 30) {
  const total = (scenes || []).reduce((acc, s) => acc + sceneDurationFrames(s, fps), 0);
  return Math.max(total, fps * 3);
}

/** Silent preview — short scenes so media appears quickly */
export function capPreviewDurationSec(scene) {
  if (scene.type === 'hook') return Math.min(scene.durationSec || 10, 8);
  if (scene.type === 'demo') return Math.min(scene.durationSec || 14, 16);
  if (scene.type === 'summary') return Math.min(scene.durationSec || 20, 18);
  return scene.durationSec;
}
