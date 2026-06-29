// Convert ElevenLabs character alignment → per-word timings for karaoke captions

export function alignmentToWordTimings(text, alignment) {
  if (!alignment?.characters?.length) return estimateWordTimings(text, 5);

  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];

  const words = [];
  let current = '';
  let wordStart = null;
  let wordEnd = null;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (current) {
        words.push({ word: current, start: wordStart, end: wordEnd });
        current = '';
        wordStart = null;
      }
      continue;
    }
    if (!current) wordStart = starts[i] ?? 0;
    current += ch;
    wordEnd = ends[i] ?? wordStart;
  }
  if (current) words.push({ word: current, start: wordStart, end: wordEnd });

  return words.length ? words : estimateWordTimings(text, 5);
}

export function estimateWordTimings(text, durationSec) {
  const tokens = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const total = Math.max(durationSec, 1);
  const perWord = total / tokens.length;
  return tokens.map((word, i) => ({
    word,
    start: i * perWord,
    end: (i + 1) * perWord,
  }));
}

export function mergeWordTimings(parts) {
  return parts.flatMap((p) =>
    (p.wordTimings || []).map((w) => ({
      ...w,
      start: w.start + (p.offset || 0),
      end: w.end + (p.offset || 0),
    })),
  );
}
