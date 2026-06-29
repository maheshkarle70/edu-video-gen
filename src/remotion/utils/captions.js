// Client-side karaoke helpers (mirrors server wordTimings.js)

export function getActiveWordIndex(wordTimings, timeSec) {
  if (!wordTimings?.length) return -1;

  const exact = wordTimings.findIndex((w) => timeSec >= w.start && timeSec < w.end);
  if (exact >= 0) return exact;

  // Gaps between words: keep the last started word lit (avoids blink)
  for (let i = wordTimings.length - 1; i >= 0; i--) {
    if (timeSec >= wordTimings[i].start) return i;
  }
  return 0;
}

/** Show a short rolling window around the active word (Shorts-style) */
export function getCaptionWindow(words, activeIdx, maxWords = 7) {
  if (!words.length) return { slice: [], offset: 0 };

  const idx = activeIdx < 0 ? 0 : activeIdx;
  const half = Math.floor(maxWords / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(words.length, start + maxWords);
  if (end - start < maxWords) start = Math.max(0, end - maxWords);

  return { slice: words.slice(start, end), offset: start };
}

export function sanitizeCaptionWords(wordTimings, narration) {
  const raw = wordTimings?.length
    ? wordTimings
    : (narration || '').split(/\s+/).filter(Boolean).map((word, i) => ({
      word, start: i * 0.3, end: (i + 1) * 0.3,
    }));

  return raw
    .filter((w) => w.word && !/^\[PAUSE\]$/i.test(w.word))
    .map((w) => ({ ...w, word: w.word.replace(/\[PAUSE\]/gi, '').trim() }))
    .filter((w) => w.word);
}

export function formatStatNumber(value, format) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (format === 'compact' && n >= 1000) {
    return n.toLocaleString('en-US');
  }
  return String(n);
}
