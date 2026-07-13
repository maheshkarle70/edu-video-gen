// src/remotion/utils/fonts.js
// Loads Noto Sans Devanagari (shipped in pkg/public/fonts) so Hindi/Hinglish
// text renders correctly in Remotion's headless Chromium instead of tofu boxes.
//
// Usage: call `loadDevanagariFont()` once at module scope of the root
// composition (see EduVideo.jsx). It uses delayRender so Remotion waits for
// the font before capturing frames.
//
// Font stack convention across scenes:
//   FONT_STACK — Latin glyphs resolve from system-ui first; Devanagari
//   falls through to Noto Sans Devanagari.

import { continueRender, delayRender, staticFile } from 'remotion';

export const FONT_STACK =
  "system-ui, 'Noto Sans Devanagari', sans-serif";

let loaded = false;

export function loadDevanagariFont() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;

  const handle = delayRender('Loading Noto Sans Devanagari');

  const faces = [
    new FontFace(
      'Noto Sans Devanagari',
      `url(${staticFile('fonts/NotoSansDevanagari-Regular.ttf')})`,
      { weight: '400' },
    ),
    new FontFace(
      'Noto Sans Devanagari',
      `url(${staticFile('fonts/NotoSansDevanagari-Bold.ttf')})`,
      { weight: '700' },
    ),
  ];

  Promise.all(faces.map((f) => f.load()))
    .then((loadedFaces) => {
      loadedFaces.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((err) => {
      // Never block the render on a font failure — fall back to system fonts.
      console.warn('[fonts] Devanagari font failed to load:', err?.message);
      continueRender(handle);
    });
}
