// src/remotion/utils/fonts.js
// Devanagari fonts for Hindi/Marathi.
//
// Fonts are webpack/esbuild-inlined as data URLs (see render.js webpackOverride
// and build-preview.js). That avoids fetch()/staticFile() during headless
// render, which was hanging Remotion's delayRender until timeout.
//
// No delayRender here on purpose — a hung font must never abort a video.
// System Devanagari faces cover glyphs until Noto finishes loading.
import regularUrl from '../../../pkg/public/fonts/NotoSansDevanagari-Regular.ttf';
import boldUrl from '../../../pkg/public/fonts/NotoSansDevanagari-Bold.ttf';

export const FONT_STACK =
  "'Noto Sans Devanagari', 'Devanagari Sangam MN', 'Kohinoor Devanagari', 'ITF Devanagari', Mangal, system-ui, sans-serif";

let started = false;

function loadFace(url, weight) {
  const face = new FontFace('Noto Sans Devanagari', `url(${url})`, { weight });
  return face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
    })
    .catch((err) => {
      console.warn(`[fonts] weight ${weight} failed:`, err?.message || err);
    });
}

export function loadDevanagariFont() {
  if (started || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  started = true;
  loadFace(regularUrl, '400');
  loadFace(boldUrl, '700');
}
