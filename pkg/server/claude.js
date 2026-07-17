// server/claude.js
import { languagePromptRules, normalizeLanguage } from './language.js';

const STYLES = {
  engaging:     'energetic, enthusiastic teacher for 15–25 year olds — make it exciting',
  professional: 'clear, authoritative professional educator',
  simple:       'friendly and simple, as if explaining to a 12-year-old',
  storytelling: 'narrative storyteller who uses vivid analogies and drama',
};

async function callClaude({ apiKey, system, userContent, maxTokens = 4096 }) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      // Cache stable system instructions (reads ~90% cheaper on repeat calls)
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API (${model}): ${data.error.message}`);

  const stopReason = data.stop_reason;
  const raw = data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '';
  const parsed = parseClaudeJson(raw, stopReason);

  const u = data.usage || {};
  const usage = {
    inputTokens: u.input_tokens || 0,
    outputTokens: u.output_tokens || 0,
    cacheCreationTokens: u.cache_creation_input_tokens || 0,
    cacheReadTokens: u.cache_read_input_tokens || 0,
    model,
  };

  return { data: parsed, usage, stopReason };
}

function parseClaudeJson(raw, stopReason) {
  if (!raw) throw new Error('Claude returned an empty response');

  try {
    return JSON.parse(raw);
  } catch {
    if (stopReason === 'max_tokens') {
      const err = new Error(
        'Claude response was truncated (output too long). Retry — or select fewer topics (try 5–7).',
      );
      err.code = 'TRUNCATED';
      throw err;
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch { /* fall through */ }
    }
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}

/** Step 1 — suggest subtopics for a long YouTube video */
export async function generateOutline({ topic, style = 'professional', language = 'English', apiKey }) {
  const lang = normalizeLanguage(language);
  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 4096,
    system: 'You are an expert YouTube course planner. Return ONLY valid JSON — no markdown, no backticks. Keep every string concise.',
    userContent: `Plan a long-form YouTube tutorial (8-10 minutes) about: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${lang}
${languagePromptRules(lang)}

Return EXACTLY this JSON:
{
  "topic": "Clean video title",
  "subtopics": [
    {
      "id": "st1",
      "title": "Short title (max 8 words)",
      "description": "One short sentence (max 20 words)",
      "estimatedSec": 65,
      "recommended": true,
      "mediaType": "screenshot",
      "whereToGo": "URL or app path (max 12 words)",
      "whatToCapture": "What to show on screen (max 15 words)"
    }
  ],
  "suggestedCount": 7
}

Rules:
- Generate 8 to 10 subtopics (not more — keep JSON compact)
- Mark exactly 7 with "recommended": true
- estimatedSec: 55-75 per subtopic
- ids: st1, st2, st3, … in logical order
- mediaType: screenshot | video | either
- Do NOT include captureSteps here — brief details come in step 2
- Keep ALL strings short to fit in one JSON response`,
  });

  data.subtopics = (data.subtopics || []).map(enrichSubtopicMedia);
  return { outline: data, usage };
}

export function enrichSubtopicMedia(subtopic) {
  const title = subtopic.title || 'this section';
  const desc = subtopic.description || title;
  const steps = subtopic.captureSteps?.filter(Boolean);
  return {
    ...subtopic,
    mediaType: subtopic.mediaType || 'screenshot',
    whereToGo: subtopic.whereToGo || `Open the app or website for: ${title}`,
    whatToCapture: subtopic.whatToCapture || desc,
    captureSteps: steps?.length >= 2 ? steps : [
      `Go to: ${subtopic.whereToGo || 'the relevant website or app'}`,
      `Find the screen for: ${title}`,
      `Capture a screenshot showing: ${desc}`,
    ],
  };
}

/** Agent 2 — production brief: narration + media instructions + sample prompts */
export async function generateBrief({
  topic, selectedSubtopics, style = 'professional', language = 'English', apiKey,
}) {
  const sectionCount = selectedSubtopics.length;
  const lang = normalizeLanguage(language);

  async function runBrief(compact) {
    const sectionsList = selectedSubtopics.map((s, i) =>
      `${i + 1}. [${s.id}] ${s.title}${compact ? '' : ` — ${(s.description || '').slice(0, 80)}`}${(!compact && s.whereToGo) ? ` | Go: ${s.whereToGo}` : ''}`,
    ).join('\n');

    const density = compact
      ? `COMPACT (must fit one response):
- narration per section: 40-55 words MAX
- captureSteps: exactly 2 short steps
- samplePrompts: exactly 1 short prompt
- Omit "visual" and keep animationFallback.prompt ≤ 12 words
- Keep ALL strings short — no essays`
      : `Length targets:
- narration per section: 55-75 words (spoken VO)
- captureSteps: 2-3 short steps
- samplePrompts: 1-2 short prompts
- Prefer brevity — JSON must finish in one response`;

    return callClaude({
      apiKey,
      maxTokens: 16384,
      system: 'You are an expert YouTube tutorial producer. Return ONLY valid compact JSON — no markdown, no backticks. Keep every string short so the JSON completes.',
      userContent: `Create a production brief for: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${lang}
${languagePromptRules(lang)}

Sections (${sectionCount}):
${sectionsList}

${density}

Return EXACTLY this JSON shape:
{
  "topic": "Video title",
  "videoMode": "long",
  "accentColor": "#hex",
  "hashtag": "#Tag",
  "hook": {
    "hookStat": "Bold promise (max 12 words)",
    "title": "What you'll learn",
    "body": "1 short sentence",
    "narration": "28-40 words MAX punchy intro",
    "emoji": "🎬",
    "keyword": "KEY PHRASE",
    "bgColor": "#080a12",
    "durationSec": 18
  },
  "sections": [
    {
      "id": "st1",
      "subtopic": "input title",
      "title": "Section title",
      "onScreenText": "MAX 12 words",
      "body": "same as onScreenText",
      "narration": "spoken VO — follow length targets above",
      "keyword": "2-4 WORDS",
      "emoji": "📌",
      "bgColor": "#0a0f1a",
      "durationSec": 55,
      "mediaBrief": {
        "type": "screenshot",
        "whereToGo": "URL or app path",
        "whatToCapture": "What must appear on screen",
        "captureSteps": ["Step 1", "Step 2"],
        "status": "pending"
      },
      "samplePrompts": ["One practical practice prompt"],
      "animationFallback": {
        "useIfNoUpload": true,
        "prompt": "Short mockup description",
        "remotionScene": "demo-mockup"
      }
    }
  ],
  "summary": {
    "title": "What You Learned",
    "body": "Three short recap sentences",
    "narration": "55-75 words recap + subscribe",
    "keyword": "KEY TAKEAWAY",
    "cta": "Follow & Subscribe for More",
    "emoji": "💡",
    "bgColor": "#0a0a1a",
    "durationSec": 40
  }
}

Rules:
- sections: exactly ${sectionCount} items; ids match input [st1], [st2], … in order
- EVERY section needs mediaBrief + samplePrompts + animationFallback
- onScreenText/body: MAX 12 words
- narration = spoken voiceover only
- HOOK narration 28–40 words so demos start fast
- mediaBrief/captureSteps/samplePrompts may stay English; spoken + on-screen teaching copy follow Language rules
- Close the JSON fully — never stop mid-string`,
    });
  }

  let data;
  let usage = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
  let stopReason;
  try {
    const first = await runBrief(sectionCount >= 7);
    data = first.data;
    usage = first.usage || usage;
    stopReason = first.stopReason;
    if (stopReason === 'max_tokens' || (data.sections || []).length < sectionCount) {
      throw Object.assign(new Error('Brief incomplete or truncated'), { code: 'TRUNCATED' });
    }
  } catch (e) {
    if (e.code === 'TRUNCATED' || /truncated|incomplete/i.test(e.message)) {
      console.warn(`[Brief] Truncated/incomplete with ${sectionCount} sections — retrying compact`);
      const second = await runBrief(true);
      data = second.data;
      const a = usage || {};
      const b = second.usage || {};
      usage = {
        inputTokens: (a.inputTokens || 0) + (b.inputTokens || 0),
        outputTokens: (a.outputTokens || 0) + (b.outputTokens || 0),
        cacheCreationTokens: (a.cacheCreationTokens || 0) + (b.cacheCreationTokens || 0),
        cacheReadTokens: (a.cacheReadTokens || 0) + (b.cacheReadTokens || 0),
        model: b.model || a.model,
      };
      stopReason = second.stopReason;
    } else {
      throw e;
    }
  }

  data.videoMode = 'long';
  data.sections = (data.sections || []).map((sec, i) => {
    const input = selectedSubtopics[i];
    const enriched = input ? enrichSubtopicMedia(input) : {};
    const prompts = Array.isArray(sec.samplePrompts) ? sec.samplePrompts.filter(Boolean) : [];
    return {
      ...sec,
      id: input?.id || sec.id,
      samplePrompts: prompts.length ? prompts.slice(0, 2) : [
        `Explain "${input?.title || sec.title}" in simple steps I can practice.`,
      ],
      animationFallback: {
        useIfNoUpload: true,
        remotionScene: 'demo-mockup',
        prompt: sec.animationFallback?.prompt
          || `Educational infographic for: ${input?.title || sec.title}`,
        ...(sec.animationFallback || {}),
      },
      mediaBrief: {
        ...enriched,
        ...(sec.mediaBrief || {}),
        type: sec.mediaBrief?.type || enriched.mediaType || 'screenshot',
        whereToGo: sec.mediaBrief?.whereToGo || enriched.whereToGo,
        whatToCapture: sec.mediaBrief?.whatToCapture || enriched.whatToCapture,
        captureSteps: sec.mediaBrief?.captureSteps?.length >= 2
          ? sec.mediaBrief.captureSteps.slice(0, 3)
          : enriched.captureSteps,
        status: 'pending',
      },
    };
  });

  if (!data.sections?.length) {
    throw new Error('Brief returned no sections — retry with fewer topics.');
  }
  if (data.sections.length < sectionCount) {
    throw new Error(
      `Brief only returned ${data.sections.length}/${sectionCount} sections. Select fewer topics (try 5–7) and retry.`,
    );
  }

  return { brief: data, usage };
}

/** Step 2 — full script for selected subtopics */
export async function generateLongScript({
  topic, selectedSubtopics, style = 'professional', language = 'English', apiKey, sectionMedia,
}) {
  const sectionsList = selectedSubtopics.map((s, i) =>
    `${i + 1}. [${s.id}] ${s.title} — ${s.description || ''}`,
  ).join('\n');

  const sectionCount = selectedSubtopics.length;
  const mediaHints = buildMediaHintsInline(selectedSubtopics, sectionMedia);
  const lang = normalizeLanguage(language);

  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 8192,
    system: 'You are an expert YouTube tutorial writer. Return ONLY valid JSON — no markdown, no backticks.',
    userContent: `Write a complete long-form YouTube video script about: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${lang}
${languagePromptRules(lang)}

The video has 1 hook + ${sectionCount} sections + 1 summary. Sections to cover (in order):
${sectionsList}

Return EXACTLY this JSON:
{
  "topic": "Video title",
  "videoMode": "long",
  "accentColor": "#hexcolor fitting the topic",
  "hashtag": "#TopicHashtag",
  "scenes": [
    {
      "id": 1,
      "type": "hook",
      "hookStat": "Provocative question or bold promise for the full tutorial",
      "title": "What you'll learn today",
      "body": "2-3 sentences previewing the ${sectionCount} topics covered.",
      "narration": "28-40 words MAX. Punchy intro only — jump to content fast.",
      "emoji": "🎬",
      "bgColor": "#080a12",
      "brollTag": "tech",
      "durationSec": 18
    },
    {
      "id": 2,
      "type": "section",
      "chapter": 1,
      "chapterTotal": ${sectionCount},
      "subtopic": "matches selected subtopic title",
      "title": "Section title",
      "body": "1-2 short sentences MAX (under 25 words total) when a screenshot/recording is provided; otherwise 2 sentences.",
      "narration": "80-110 words. Teach this subtopic — if user provided a demo image/video, narrate what they would see on screen step by step.",
      "visual": { "type": "process|cycle|compare|timeline|layers", "steps": ["2-4 short labels"], "caption": "optional" },
      "keyword": "KEY PHRASE",
      "emoji": "📌",
      "bgColor": "#0a0f1a",
      "brollTag": "tech",
      "durationSec": 65
    },
    {
      "id": 99,
      "type": "summary",
      "title": "What You Learned",
      "body": "Three recap sentences. Each ends with a period.",
      "narration": "80-100 words. Recap key points. End encouraging follow and subscribe.",
      "keyword": "KEY TAKEAWAY",
      "cta": "Follow & Subscribe for More",
      "emoji": "💡",
      "bgColor": "#0a0a1a",
      "brollTag": "abstract",
      "durationSec": 50
    }
  ]
}

Rules:
- scenes array: exactly 1 hook + ${sectionCount} section scenes + 1 summary (total ${sectionCount + 2})
- section scenes: chapter 1..${sectionCount}, chapterTotal ${sectionCount}, in same order as input list
- sections WITH user media (see below): omit visual diagram, keep body to ONE short sentence
- sections WITHOUT user media: include visual with 2-4 step labels
- narration = natural speech, no bullet points in narration text
- bgColor very dark for readability
- Make content practical and tutorial-quality — this is YouTube long-form, not a Short${mediaHints}`,
  });

  data.videoMode = 'long';
  return { script: data, usage };
}

function buildMediaHintsInline(selectedSubtopics, sectionMedia) {
  if (!sectionMedia || !Object.keys(sectionMedia).length) return '';
  const lines = selectedSubtopics
    .filter((st) => sectionMedia[st.id])
    .map((st) => {
      const m = sectionMedia[st.id];
      return `- [${st.id}] "${st.title}": user uploaded ${m.type} demo — narration must describe what's on screen; body max 12 words`;
    });
  return lines.length ? `\n\nUser-provided demo media for these sections:\n${lines.join('\n')}` : '';
}

export async function generateScript({ topic, style = 'engaging', language = 'English', apiKey }) {
  const lang = normalizeLanguage(language);
  const { data: script, usage } = await callClaude({
    apiKey,
    maxTokens: 4096,
    system: 'You are an expert educational content creator for YouTube Shorts. Return ONLY valid JSON — no markdown, no backticks, no explanation.',
    userContent: `Create a complete educational video script about: "${topic}"

Style: ${STYLES[style] || STYLES.engaging}
Language: ${lang}
${languagePromptRules(lang)}

Return EXACTLY this JSON (no extra keys, no comments):
{
  "topic": "Clean punchy video title",
  "accentColor": "#hexcolor (vibrant color fitting the topic — purple=science, orange=history, green=biology, blue=tech)",
  "hashtag": "#TopicHashtag (no spaces, e.g. #BlackHoles)",
  "scenes": [
    {
      "id": 1,
      "type": "hook",
      "hookStat": "Big shocking stat or provocative question shown FIRST for 2 seconds (e.g. '93% of people get this WRONG' or 'What if I told you...')",
      "title": "Short punchy title (max 6 words) — appears AFTER hookStat",
      "body": "2-3 sentences. Clear, simple, surprising fact.",
      "narration": "Natural spoken voiceover — 40-60 words. Conversational speech, no bullet points, no lists.",
      "keyword": "2-4 WORD KEY CONCEPT (ALL CAPS)",
      "emoji": "1 relevant emoji",
      "bgColor": "#very dark hex (lightness < 12%)",
      "brollTag": "one of: space|science|tech|nature|history|city|abstract",
      "durationSec": 7
    },
    {
      "id": 2, "type": "concept",
      "title": "...", "body": "...", "narration": "40-60 words",
      "visual": { "type": "process|cycle|compare|timeline|layers", "steps": ["2-4 short step labels that explain the concept visually"], "caption": "optional 3-5 word diagram label" },
      "stat": { "value": 93, "suffix": "%", "prefix": "", "label": "short context e.g. of atoms are empty space" },
      "keyword": "...", "emoji": "...", "bgColor": "...", "brollTag": "science", "durationSec": 7
    },
    {
      "id": 3, "type": "fact",
      "title": "...", "body": "Surprising, counterintuitive fact.", "narration": "40-60 words",
      "visual": { "type": "compare|timeline|process", "steps": ["2-3 labels illustrating the fact"], "caption": "" },
      "stat": { "value": 10000, "suffix": "", "prefix": "", "label": "years ago", "format": "compact" },
      "keyword": "...", "emoji": "...", "bgColor": "...", "brollTag": "abstract", "durationSec": 7
    },
    {
      "id": 4, "type": "analogy",
      "title": "Think of it like...",
      "body": "Vivid everyday analogy that makes the concept click.",
      "analogyLeft": { "label": "The Concept", "text": "1-2 sentence explanation of the actual concept" },
      "analogyRight": { "label": "Like a...", "text": "1-2 sentence everyday comparison" },
      "narration": "40-60 words", "keyword": "...", "emoji": "...", "bgColor": "...", "brollTag": "nature", "durationSec": 7
    },
    {
      "id": 5, "type": "quiz",
      "title": "Quick Check",
      "body": "One clear multiple-choice question testing the core concept.",
      "narration": "Quiz time! [state question clearly]. Think about it... [PAUSE] The answer is [letter] — [brief 1-sentence reason].",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "emoji": "❓",
      "bgColor": "...",
      "brollTag": "tech",
      "durationSec": 11
    },
    {
      "id": 6, "type": "summary",
      "title": "What You Learned",
      "body": "Three key takeaways. Each sentence ends with a period.",
      "narration": "40-60 words. End with a warm sign-off encouraging viewers to follow and subscribe for more educational videos.",
      "keyword": "REMEMBER THIS",
      "cta": "Follow & Subscribe for More",
      "emoji": "💡", "bgColor": "...", "brollTag": "abstract", "durationSec": 8
    }
  ]
}

Rules:
- bgColor MUST be very dark (e.g. #080a12, #0d0a1a, #0a1208) for text readability
- narration = natural flowing speech, not written prose, no asterisks or bullets
- hookStat MUST be a punchy question or shocking number — this is the FIRST thing viewers see
- stat.value must be a number; use format "compact" for large numbers (10000 → 10,000)
- analogyLeft/analogyRight: left = the concept, right = everyday comparison
- visual: REQUIRED on concept and fact scenes — pick type that best explains (process=steps, cycle=repeating loop, compare=before/after, timeline=chronological, layers=stacked parts). steps = 2-4 words max per label
- quiz narration MUST include literal "[PAUSE]" before "The answer is"
- durationSec should match how long it takes to naturally say the narration aloud
- Make content genuinely educational AND surprising — pick facts that feel unbelievable but are true`,
  });

  return { script, usage };
}

/** After render — YouTube / social publish metadata (title, description, tags) */
export async function generatePublishMetadata({
  topic,
  language = 'English',
  videoMode = 'short',
  hashtag = '',
  scenes = [],
  durationSec = 0,
  apiKey,
}) {
  const lang = normalizeLanguage(language);
  const isLong = videoMode === 'long';
  const sceneSummary = (scenes || [])
    .slice(0, 16)
    .map((s, i) => {
      const mins = Math.floor((scenes.slice(0, i).reduce((a, x) => a + (x.durationSec || 6), 0)) / 60);
      const secs = Math.round((scenes.slice(0, i).reduce((a, x) => a + (x.durationSec || 6), 0)) % 60);
      const ts = `${mins}:${String(secs).padStart(2, '0')}`;
      return `- [${ts}] ${s.type || 'scene'}: ${s.title || ''} — ${(s.narration || s.body || '').slice(0, 120)}`;
    })
    .join('\n');

  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 2048,
    system: 'You are an expert YouTube SEO copywriter for educational channels. Return ONLY valid JSON — no markdown, no backticks.',
    userContent: `Write publish metadata for this educational video.

Topic: "${topic}"
Mode: ${isLong ? 'long YouTube tutorial' : 'YouTube Short / Reels (~45-60s)'}
Language for title & description: ${lang}
${languagePromptRules(lang)}
Hashtag from script: ${hashtag || '(none)'}
Approx duration: ${Math.round(durationSec || 0)} seconds

Scene outline:
${sceneSummary || '(not provided)'}

Return EXACTLY this JSON:
{
  "title": "Primary upload title (max 70 chars, curiosity + clarity, no clickbait spam)",
  "titleOptions": ["Alt title 1", "Alt title 2", "Alt title 3"],
  "description": "Full YouTube description. 2-4 short paragraphs. Include what viewers will learn. End with a soft CTA to like/subscribe. ${isLong ? 'After the paragraphs, add a Timestamps section with MM:SS lines from the scene outline.' : 'Keep it concise for Shorts.'}",
  "tags": ["8-15 searchable tags", "mix broad + specific", "no # symbols"],
  "hashtags": ["#Topic", "#Education", "#3to5 more"]
}

Rules:
- Title must work on YouTube search; avoid ALL CAPS and excessive emoji
- Description language must match ${lang}
- Tags: lowercase where natural; include topic synonyms and format words (e.g. tutorial, explained)
- hashtags: include # and CamelCase or TopicWords
- Do NOT invent fake credentials, channel names, or links`,
  });

  return {
    metadata: {
      title: data.title || topic,
      titleOptions: Array.isArray(data.titleOptions) ? data.titleOptions.slice(0, 5) : [],
      description: data.description || '',
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 20) : [],
      hashtags: Array.isArray(data.hashtags) ? data.hashtags.slice(0, 8) : [],
    },
    usage,
  };
}
