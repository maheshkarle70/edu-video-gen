// Language helpers — script prompts, TTS model selection, speech-rate estimates

/** Languages that need Eleven v3 (not covered by eleven_multilingual_v2). */
const V3_ONLY_LANGUAGES = [
  'marathi', 'gujarati', 'bengali', 'kannada', 'malayalam',
  'punjabi', 'telugu', 'nepali', 'urdu', 'assamese', 'odia', 'oriya',
];

const DEVANAGARI_RE = /[\u0900-\u097F]/;

export function normalizeLanguage(language = 'English') {
  return String(language || 'English').trim();
}

export function languageKey(language = 'English') {
  return normalizeLanguage(language).toLowerCase();
}

export function isMarathi(language = '') {
  return languageKey(language).startsWith('marathi');
}

export function isHindiFamily(language = '') {
  const key = languageKey(language);
  return key.startsWith('hindi') || key.startsWith('hinglish') || key.startsWith('marathi');
}

export function looksLikeDevanagari(text = '') {
  return DEVANAGARI_RE.test(text);
}

/**
 * ElevenLabs model for TTS.
 * Marathi (and several Indic langs) require eleven_v3 — multilingual_v2 has no Marathi.
 * Hindi/Tamil stay on multilingual_v2 (stronger voiceover quality where supported).
 */
export function ttsModelForLanguage(language = 'English') {
  const key = languageKey(language);
  if (V3_ONLY_LANGUAGES.some((l) => key.startsWith(l))) {
    return 'eleven_v3';
  }
  return 'eleven_multilingual_v2';
}

/** Words-per-second for silent / fallback duration estimates. */
export function speechWordsPerSec(language = 'English', sampleText = '') {
  if (isHindiFamily(language) || looksLikeDevanagari(sampleText)) {
    return 2.0; // ~110–130 wpm for Indic TTS
  }
  return 2.5; // English-tuned
}

export function estimateSpeechDurationSec(text = '', language = 'English', { minSec = 4 } = {}) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const rate = speechWordsPerSec(language, text);
  return Math.max(Math.ceil(words / rate), minSec);
}

export function voicePreviewText(language = 'English') {
  if (isMarathi(language)) {
    return 'नमस्कार! ही तुमच्या शैक्षणिक व्हिडिओसाठी मराठी आवाजाची छोटी झलक आहे. स्पष्ट, उत्साही आणि शिकवण्यासाठी तयार.';
  }
  if (languageKey(language).startsWith('hindi')) {
    return 'नमस्ते! यह आपके शैक्षिक वीडियो के लिए इस आवाज़ का छोटा पूर्वावलोकन है। स्पष्ट, आकर्षक और पढ़ाने के लिए तैयार।';
  }
  if (languageKey(language).startsWith('hinglish')) {
    return 'Hello doston! Yeh aapke educational video ke liye is voice ka chhota preview hai. Clear, engaging, aur padhane ke liye ready.';
  }
  return 'Hello! This is a quick preview of how this voice will sound in your educational video. Clear, engaging, and ready to teach.';
}

/** Suggested ElevenLabs voice search query when language changes. */
export function voiceSearchHint(language = 'English') {
  if (isMarathi(language)) return 'Marathi Indian';
  if (languageKey(language).startsWith('hindi') || languageKey(language).startsWith('hinglish')) {
    return 'Hindi Indian';
  }
  if (languageKey(language).startsWith('tamil')) return 'Tamil Indian';
  if (languageKey(language).startsWith('telugu')) return 'Telugu Indian';
  return '';
}

/**
 * Extra Claude instructions so scripts/narration match the selected language.
 */
export function languagePromptRules(language = 'English') {
  const lang = normalizeLanguage(language);
  const key = languageKey(lang);

  if (key.startsWith('marathi')) {
    return `
Language rules (Marathi — CRITICAL):
- Write ALL on-screen text (title, body, keyword, hookStat, options, cta) in Marathi using Devanagari script (मराठी)
- Write ALL narration in natural spoken Marathi (Devanagari) — as a friendly Marathi teacher would speak aloud
- Prefer everyday Marathi over Sanskritized formal prose; keep tech terms as commonly used in Marathi education (e.g. API, cloud) when natural
- Do NOT write English sentences for narration or on-screen text (except unavoidable product/brand names and code identifiers)
- Keywords: short Marathi phrases in Devanagari (2–4 words), not English ALL CAPS
- Quiz options and answers must be in Marathi`;
  }

  if (key.startsWith('hindi')) {
    return `
Language rules (Hindi — CRITICAL):
- Write ALL on-screen text and narration in Hindi using Devanagari script
- Natural spoken Hindi for narration; keep common tech loanwords when natural
- Do NOT default to English for titles, body, or narration`;
  }

  if (key.startsWith('hinglish')) {
    return `
Language rules (Hinglish — CRITICAL):
- Mix Hindi (Devanagari or Roman) with English the way Indian YouTubers speak
- Narration should sound spoken, not translated essay English
- On-screen keywords can be English or Hinglish — keep them short`;
  }

  if (lang && lang !== 'English') {
    return `
Language rules:
- Write ALL on-screen text and narration in ${lang}
- Narration must sound like natural spoken ${lang}, not a literal translation of English
- Keep product names / code identifiers in their original form when needed`;
  }

  return '';
}
