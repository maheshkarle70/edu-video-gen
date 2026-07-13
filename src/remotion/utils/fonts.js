// src/remotion/utils/fonts.js
// Loads Noto Sans Devanagari (shipped in public/fonts AND pkg/public/fonts —
// Studio serves the repo-root public/, server renders serve pkg/public/).
//
// Hardened version: the loader can NEVER hang a render. Whatever happens
// (missing file, stalled fetch, unsupported environment), continueRender is
// guaranteed to fire — worst case the frame falls back to system fonts.

import { continueRender, delayRender, staticFile } from 'remotion';

export const FONT_STACK =
  "system-ui, 'Noto Sans Devanagari', sans-serif";

const LOAD_TIMEOUT_MS = 4000;

let loaded = false;

export function loadDevanagariFont() {
  if (loaded || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  loaded = true;

  const handle = delayRender('Loading Noto Sans Devanagari', {
    timeoutInMilliseconds: LOAD_TIMEOUT_MS + 4000,
  });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    continueRender(handle);
  };

  // Absolute guarantee: never block longer than LOAD_TIMEOUT_MS.
  const timer = setTimeout(() => {
    console.warn('[fonts] Devanagari font load timed out — using system fonts');
    finish();
  }, LOAD_TIMEOUT_MS);

  try {
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
        clearTimeout(timer);
        finish();
      })
      .catch((err) => {
        console.warn('[fonts] Devanagari font failed to load:', err?.message);
        clearTimeout(timer);
        finish();
      });
  } catch (err) {
    console.warn('[fonts] Font loading unavailable:', err?.message);
    clearTimeout(timer);
    finish();
  }
}
