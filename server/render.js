// server/render.js
import { bundle }                      from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { cpus }                        from 'os';
import path                            from 'path';
import { fileURLToPath }               from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = path.resolve(__dirname, '../src/remotion/index.jsx');

let cachedBundle = null;

export async function renderVideo({ props, outputPath, width, height, fps, onProgress }) {
  // Bundle once, reuse for all renders in this server session
  if (!cachedBundle) {
    console.log('[Render] Bundling Remotion composition (first run only)…');
    cachedBundle = await bundle({
      entryPoint: ENTRY_POINT,
      onProgress: (p) => process.stdout.write(`\r  [Bundle] ${Math.round(p * 100)}%  `),
    });
    console.log('\n[Render] Bundle cached ✓');
  }

  const totalSeconds    = props.scenes.reduce((acc, s) => acc + (s.audioDuration || 5) + 0.5, 0);
  const durationInFrames = Math.ceil(totalSeconds * fps);

  console.log(`[Render] ${durationInFrames} frames @ ${fps}fps  (${totalSeconds.toFixed(1)}s)`);

  const composition = await selectComposition({
    serveUrl:   cachedBundle,
    id:         'EduVideo',
    inputProps: props,
  });

  await renderMedia({
    composition: { ...composition, width, height, fps, durationInFrames },
    serveUrl:    cachedBundle,
    codec:       'h264',
    outputLocation: outputPath,
    inputProps:  props,
    onProgress:  ({ progress }) => onProgress?.(progress),
    concurrency: Math.max(1, Math.floor(cpus().length / 2)),
    pixelFormat: 'yuv420p',
    crf:         22,
    logLevel:    'warn',
  });

  console.log(`[Render] ✅  ${outputPath}`);
}
