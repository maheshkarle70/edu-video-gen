// server/render.js — Remotion scene renderer (gradients, emoji, per-scene layouts)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { totalDurationFrames } from '../../src/remotion/utils/timeline.js';
import { cpus } from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = path.resolve(__dirname, '../../src/remotion/index.jsx');
const PUBLIC_DIR = path.join(__dirname, '../public');

let cachedBundle = null;

/** Drop webpack bundle cache (e.g. after adding fonts/public assets). */
export function clearRenderBundleCache() {
  cachedBundle = null;
}

function stageMediaFiles(scenes, bundleDir) {
  const cacheId = Date.now().toString();
  const cacheDir = path.join(bundleDir, 'public', '_media-cache', cacheId);
  fs.mkdirSync(cacheDir, { recursive: true });

  const staged = scenes.map((s, i) => {
    if (!s.media) return s;

    // Prefer absolute disk path; fall back to writing inlined HTML into the bundle cache
    let sourcePath = s.media.filePath;
    if ((!sourcePath || !fs.existsSync(sourcePath)) && s.media.type === 'html' && s.media.htmlContent) {
      sourcePath = path.join(cacheDir, `scene_${i}_inline.html`);
      const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${s.media.htmlStyles || ''}</style></head><body>${s.media.htmlContent}</body></html>`;
      fs.writeFileSync(sourcePath, doc, 'utf8');
    }

    const file = sourcePath || s.media.file;
    if (!file || !fs.existsSync(file)) {
      // Keep inlined htmlContent so ScrollingHtmlFrame can still render during Remotion
      return s;
    }

    const ext = path.extname(file)
      || (s.media.type === 'video' ? '.mp4' : s.media.type === 'html' ? '.html' : '.png');
    const dest = path.join(cacheDir, `scene_${i}${ext}`);
    if (path.resolve(file) !== path.resolve(dest)) {
      fs.copyFileSync(file, dest);
    }
    return {
      ...s,
      media: {
        ...s.media,
        file: `_media-cache/${cacheId}/scene_${i}${ext}`,
        filePath: dest,
      },
    };
  });

  const cleanup = () => {
    try { fs.rmSync(path.join(bundleDir, 'public', '_media-cache', cacheId), { recursive: true, force: true }); } catch {}
  };

  return { scenes: staged, cleanup: cleanup };
}

function stageAudioFiles(scenes, bundleDir) {
  const cacheId = Date.now().toString();
  const cacheDir = path.join(bundleDir, 'public', '_audio-cache', cacheId);
  fs.mkdirSync(cacheDir, { recursive: true });

  const staged = scenes.map((s, i) => {
    if (!s.audioFile || !fs.existsSync(s.audioFile)) return s;
    const ext = path.extname(s.audioFile) || '.mp3';
    const dest = path.join(cacheDir, `scene_${i}${ext}`);
    fs.copyFileSync(s.audioFile, dest);
    return { ...s, audioFile: `_audio-cache/${cacheId}/scene_${i}${ext}` };
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
  const { scenes: withMedia, cleanup: mediaCleanup } = stageMediaFiles(scenes, bundleDir);
  const { scenes: staged, cleanup: audioCleanup } = stageAudioFiles(withMedia, bundleDir);
  const cleanup = () => { mediaCleanup(); audioCleanup(); };
  return { props: { ...props, scenes: staged }, cleanup };
}

async function ensureBundle() {
  if (cachedBundle) return cachedBundle;

  console.log('[Render] Bundling Remotion composition (first run only)…');
  cachedBundle = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    onProgress: (p) => {
      const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
      process.stdout.write(`\r  [Bundle] ${pct}%  `);
    },
    // Inline TTFs as data URLs so font loading never hits the static-file server
    // (fetch of /public/fonts/*.ttf was hanging delayRender for 28–60s).
    webpackOverride: (config) => {
      config.module.rules.push({
        test: /\.(ttf|otf|woff2?)$/i,
        type: 'asset/inline',
      });
      return config;
    },
  });
  console.log('\n[Render] Bundle cached ✓');
  return cachedBundle;
}

export async function renderVideo({ props, outputPath, width, height, fps, onProgress }) {
  const bundleDir = await ensureBundle();
  const { props: inputProps, cleanup } = normalizeProps(props, bundleDir);

  try {
    // Single source of truth: the same timeline math the composition uses
    // (audio + TRANSITION_SEC per scene). Previously this summed +0.5s per
    // scene while the composition laid out +0.15s — leaving a frozen tail
    // of ~0.35s × sceneCount at the end of every render.
    const durationInFrames = totalDurationFrames(inputProps.scenes, fps);
    const totalSeconds = durationInFrames / fps;

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
      // Devanagari TTFs can take > default 28s to fetch+decode across concurrent tabs
      timeoutInMilliseconds: 120000,
    });

    console.log(`[Render] ✅ ${outputPath}`);
  } finally {
    cleanup();
  }
}
