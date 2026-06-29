// Build browser preview bundle for Remotion Player (run on server start if missing)
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const ROOT = path.resolve(PKG, '..');
const ENTRY = path.resolve(ROOT, 'src/remotion/preview-client.jsx');
const OUT = path.resolve(PKG, 'public/preview-player.js');

export async function ensurePreviewBundle() {
  const entryMtime = fs.existsSync(ENTRY) ? fs.statSync(ENTRY).mtimeMs : 0;
  const outMtime = fs.existsSync(OUT) ? fs.statSync(OUT).mtimeMs : 0;
  if (outMtime > entryMtime && fs.existsSync(OUT)) return OUT;

  console.log('[Preview] Building Remotion Player bundle…');
  await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    outfile: OUT,
    format: 'iife',
    globalName: 'EduPreview',
    platform: 'browser',
    absWorkingDir: ROOT,
    nodePaths: [path.join(PKG, 'node_modules')],
    alias: {
      remotion: path.join(PKG, 'node_modules/remotion'),
    },
    jsx: 'automatic',
    loader: { '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' },
    footer: { js: 'window.mountPreviewPlayer=EduPreview.mountPreviewPlayer;' },
    logLevel: 'warning',
  });
  console.log('[Preview] Player bundle ready ✓');
  return OUT;
}

if (process.argv[1]?.endsWith('build-preview.js')) {
  ensurePreviewBundle().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
