#!/usr/bin/env node
// scripts/render-episode.js — render an episode props JSON straight to MP4.
//
//   node scripts/render-episode.js episodes/ep3-props.json out/ep3.mp4
//
// Scene timing rules:
//   • scene.audioFile set  → duration ffprobed from the real audio (audio-first)
//   • demo scene with video media → at least the video's length
//   • otherwise → scene.durationSec fallback
// This bypasses the web wizard (no TTS step) — point audioFile at MP3s you
// rendered from the episode's voiceover script, or leave null for silent
// timing while iterating on visuals.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { renderVideo } from '../pkg/server/render.js';

const [, , propsPath, outPath = 'out/episode.mp4'] = process.argv;
if (!propsPath) {
  console.error('Usage: node scripts/render-episode.js <props.json> [out.mp4]');
  process.exit(1);
}

const props = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
const fmt = props.format || {};
const { width = 1920, height = 1080, fps = 30 } = fmt;

function probeDuration(file) {
  try {
    const out = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`,
    ).toString().trim();
    return Math.max(parseFloat(out) || 0, 0);
  } catch {
    return 0;
  }
}

for (const sc of props.scenes || []) {
  if (sc.audioFile && fs.existsSync(sc.audioFile)) {
    const d = probeDuration(sc.audioFile);
    if (d > 0) sc.audioDuration = d;
  }
  const mediaFile = sc.media?.filePath;
  if (sc.type === 'demo' && mediaFile && fs.existsSync(mediaFile)) {
    const vd = probeDuration(mediaFile);
    sc.audioDuration = Math.max(sc.audioDuration || sc.durationSec || 0, vd);
  }
  if (!sc.audioDuration) sc.audioDuration = sc.durationSec || 5;
}

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });

const total = props.scenes.reduce((a, s) => a + s.audioDuration, 0);
console.log(`[Episode] ${props.scenes.length} scenes • ~${(total / 60).toFixed(1)} min • ${width}x${height}@${fps}`);

renderVideo({
  props,
  outputPath: path.resolve(outPath),
  width, height, fps,
  onProgress: (p) => process.stdout.write(`\r[Episode] Rendering ${(p * 100).toFixed(0)}%  `),
}).then(() => console.log(`\n[Episode] ✅ ${outPath}`))
  .catch((e) => { console.error('\n[Episode] ❌', e.message); process.exit(1); });
