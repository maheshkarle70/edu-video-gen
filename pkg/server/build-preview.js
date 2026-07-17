// Build browser preview bundle for Remotion Player (run on server start if missing)
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const ROOT = path.resolve(PKG, '..');
const NM = path.join(PKG, 'node_modules');
const ENTRY = path.resolve(ROOT, 'src/remotion/preview-client.jsx');
const OUT = path.resolve(PKG, 'public/preview-player.js');

function nm(...parts) {
  return path.join(NM, ...parts);
}

export async function ensurePreviewBundle({ force = false } = {}) {
  const entryMtime = fs.existsSync(ENTRY) ? fs.statSync(ENTRY).mtimeMs : 0;
  const fontsPath = path.resolve(ROOT, 'src/remotion/utils/fonts.js');
  const fontsMtime = fs.existsSync(fontsPath) ? fs.statSync(fontsPath).mtimeMs : 0;
  const buildSelf = fs.existsSync(fileURLToPath(import.meta.url))
    ? fs.statSync(fileURLToPath(import.meta.url)).mtimeMs
    : 0;
  const outMtime = fs.existsSync(OUT) ? fs.statSync(OUT).mtimeMs : 0;
  if (
    !force
    && outMtime > entryMtime
    && outMtime > fontsMtime
    && outMtime > buildSelf
    && fs.existsSync(OUT)
  ) {
    return OUT;
  }

  console.log('[Preview] Building Remotion Player bundle…');
  // Pin EVERY react / remotion import to pkg/node_modules. Otherwise esbuild
  // resolves some packages via repo-root node_modules (react@18.2) and others
  // via pkg (react@18.3) → duplicate React → "Cannot read properties of null (useRef)".
  await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    outfile: OUT,
    format: 'iife',
    globalName: 'EduPreview',
    platform: 'browser',
    absWorkingDir: PKG,
    nodePaths: [NM],
    alias: {
      react: nm('react'),
      'react-dom': nm('react-dom'),
      'react-dom/client': nm('react-dom/client.js'),
      'react/jsx-runtime': nm('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': nm('react/jsx-dev-runtime.js'),
      remotion: nm('remotion'),
      '@remotion/player': nm('@remotion/player'),
      '@remotion/media-utils': nm('@remotion/media-utils'),
    },
    jsx: 'automatic',
    loader: {
      '.jsx': 'jsx',
      '.js': 'jsx',
      '.ttf': 'dataurl',
      '.otf': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    footer: { js: 'window.mountPreviewPlayer=EduPreview.mountPreviewPlayer;' },
    logLevel: 'warning',
  });
  console.log('[Preview] Player bundle ready ✓');
  return OUT;
}

if (process.argv[1]?.endsWith('build-preview.js')) {
  ensurePreviewBundle({ force: true }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
