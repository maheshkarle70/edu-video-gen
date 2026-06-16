// server/render.js — Remotion scene renderer (gradients, emoji, per-scene layouts)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { cpus } from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = path.resolve(__dirname, '../../src/remotion/index.jsx');
const PUBLIC_DIR = path.join(__dirname, '../public');

let cachedBundle = null;

function stageAudioFiles(scenes, bundleDir) {
  const cacheId = Date.now().toString();
  const cacheDir = path.join(bundleDir, 'public', '_audio-cache', cacheId);
  fs.mkdirSync(cacheDir, { recursive: true });

  const staged = scenes.map((s, i) => {
    if (!s.audioFile || !fs.existsSync(s.audioFile)) return s;
    const dest = path.join(cacheDir, `scene_${i}.mp3`);
    fs.copyFileSync(s.audioFile, dest);
    return { ...s, audioFile: `_audio-cache/${cacheId}/scene_${i}.mp3` };
  });

  const cleanup = () => {
    try { fs.rmSync(path.join(bundleDir, 'public', '_audio-cache', cacheId), { recursive: true, force: true }); } catch {}
  };

  return { scenes: staged, cleanup };
}

function normalizeProps(props, bundleDir) {
  const scenes = (props.scenes || []).map((s) => ({
    ...s,
    audioDuration: s.audioDuration || s.durationSec || 5,
  }));
  const { scenes: staged, cleanup } = stageAudioFiles(scenes, bundleDir);
  return { props: { ...props, scenes: staged }, cleanup };
}

async function ensureBundle() {
  if (cachedBundle) return cachedBundle;

  console.log('[Render] Bundling Remotion composition (first run only)…');
  cachedBundle = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    onProgress: (p) => process.stdout.write(`\r  [Bundle] ${Math.round(p * 100)}%  `),
  });
  console.log('\n[Render] Bundle cached ✓');
  return cachedBundle;
}

export async function renderVideo({ props, outputPath, width, height, fps, onProgress }) {
  const bundleDir = await ensureBundle();
  const { props: inputProps, cleanup } = normalizeProps(props, bundleDir);

  try {
    const totalSeconds = inputProps.scenes.reduce(
      (acc, s) => acc + (s.audioDuration || 5) + 0.5,
      0,
    );
    const durationInFrames = Math.ceil(totalSeconds * fps);

    console.log(`[Render] ${inputProps.scenes.length} scenes → ${outputPath}`);
    console.log(`[Render] ${durationInFrames} frames @ ${fps}fps (${totalSeconds.toFixed(1)}s)`);

    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: 'EduVideo',
      inputProps,
    });

    await renderMedia({
      composition: { ...composition, width, height, fps, durationInFrames },
      serveUrl: bundleDir,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => onProgress?.(progress),
      concurrency: Math.max(1, Math.floor(cpus().length / 2)),
      pixelFormat: 'yuv420p',
      crf: 22,
      logLevel: 'warn',
    });

    console.log(`[Render] ✅ ${outputPath}`);
  } finally {
    cleanup();
  }
}
