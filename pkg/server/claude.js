// server/claude.js

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
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API (${model}): ${data.error.message}`);

  const stopReason = data.stop_reason;
  const raw = data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '';
  const parsed = parseClaudeJson(raw, stopReason);

  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens || 0, outputTokens: data.usage.output_tokens || 0, model }
    : { inputTokens: 0, outputTokens: 0, model };

  return { data: parsed, usage, stopReason };
}

function parseClaudeJson(raw, stopReason) {
  if (!raw) throw new Error('Claude returned an empty response');

  try {
    return JSON.parse(raw);
  } catch {
    if (stopReason === 'max_tokens') {
      throw new Error('Claude response was truncated (too many subtopics). Retry — if it persists, use a shorter topic title.');
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
  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 4096,
    system: 'You are an expert YouTube course planner. Return ONLY valid JSON — no markdown, no backticks. Keep every string concise.',
    userContent: `Plan a long-form YouTube tutorial (8-10 minutes) about: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${language}

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
  const sectionsList = selectedSubtopics.map((s, i) =>
    `${i + 1}. [${s.id}] ${s.title} — ${s.description || ''}${s.whereToGo ? ` | Go: ${s.whereToGo}` : ''}`,
  ).join('\n');

  const sectionCount = selectedSubtopics.length;

  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 8192,
    system: 'You are an expert YouTube tutorial producer. Return ONLY valid JSON — no markdown, no backticks.',
    userContent: `Create a production brief for a long-form tutorial video about: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${language}

Sections to produce (in order):
${sectionsList}

Return EXACTLY this JSON:
{
  "topic": "Video title",
  "videoMode": "long",
  "accentColor": "#hexcolor fitting topic",
  "hashtag": "#TopicHashtag",
  "hook": {
    "hookStat": "Bold promise or question for the full tutorial",
    "title": "What you'll learn",
    "body": "2 short sentences previewing all ${sectionCount} sections",
    "narration": "70-90 words spoken intro previewing each section briefly",
    "emoji": "🎬",
    "keyword": "KEY PHRASE",
    "bgColor": "#080a12",
    "durationSec": 45
  },
  "sections": [
    {
      "id": "st1",
      "subtopic": "matches input subtopic title",
      "title": "Section title",
      "onScreenText": "MAX 12 words shown on screen",
      "body": "same as onScreenText",
      "narration": "80-110 words — natural speech teaching this section. Reference what user will see if media is uploaded.",
      "keyword": "2-4 WORDS",
      "emoji": "📌",
      "bgColor": "#0a0f1a",
      "durationSec": 60,
      "mediaBrief": {
        "type": "screenshot|video|either",
        "whereToGo": "Exact URL or app path",
        "whatToCapture": "What must appear in screenshot or video",
        "captureSteps": ["Step 1...", "Step 2...", "Step 3..."],
        "status": "pending"
      },
      "samplePrompts": [
        "Prompt user can paste into Claude to practice this step",
        "Another helpful prompt for this section"
      ],
      "animationFallback": {
        "useIfNoUpload": true,
        "prompt": "Describe animated mockup if user skips upload",
        "remotionScene": "demo-mockup"
      },
      "visual": { "type": "process", "steps": ["2-4 labels"], "caption": "optional" }
    }
  ],
  "summary": {
    "title": "What You Learned",
    "body": "Three short recap sentences",
    "narration": "70-90 words recap + follow/subscribe",
    "keyword": "KEY TAKEAWAY",
    "cta": "Follow & Subscribe for More",
    "emoji": "💡",
    "bgColor": "#0a0a1a",
    "durationSec": 45
  }
}

Rules:
- sections array: exactly ${sectionCount} items, ids must match input [st1], [st2], etc. in order
- EVERY section needs mediaBrief (3 captureSteps), samplePrompts (2 items), animationFallback
- mediaBrief.type: screenshot for static UI, video for actions/output, either when both work
- onScreenText/body: MAX 12 words — video shows media, not text walls
- narration = spoken voiceover only, no bullet points
- Include visual diagram only as fallback when no user media expected
- samplePrompts = practical prompts user can use in Claude/ChatGPT to learn or generate content`,
  });

  data.videoMode = 'long';
  data.sections = (data.sections || []).map((sec, i) => {
    const input = selectedSubtopics[i];
    const enriched = input ? enrichSubtopicMedia(input) : {};
    return {
      ...sec,
      id: input?.id || sec.id,
      mediaBrief: {
        ...enriched,
        ...(sec.mediaBrief || {}),
        type: sec.mediaBrief?.type || enriched.mediaType || 'screenshot',
        whereToGo: sec.mediaBrief?.whereToGo || enriched.whereToGo,
        whatToCapture: sec.mediaBrief?.whatToCapture || enriched.whatToCapture,
        captureSteps: sec.mediaBrief?.captureSteps?.length >= 2
          ? sec.mediaBrief.captureSteps
          : enriched.captureSteps,
        status: 'pending',
      },
    };
  });

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

  const { data, usage } = await callClaude({
    apiKey,
    maxTokens: 8192,
    system: 'You are an expert YouTube tutorial writer. Return ONLY valid JSON — no markdown, no backticks.',
    userContent: `Write a complete long-form YouTube video script about: "${topic}"

Style: ${STYLES[style] || STYLES.professional}
Language: ${language}

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
      "narration": "80-100 words. Warm intro — preview all sections briefly. Conversational.",
      "emoji": "🎬",
      "bgColor": "#080a12",
      "brollTag": "tech",
      "durationSec": 50
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
  const { data: script, usage } = await callClaude({
    apiKey,
    maxTokens: 4096,
    system: 'You are an expert educational content creator for YouTube Shorts. Return ONLY valid JSON — no markdown, no backticks, no explanation.',
    userContent: `Create a complete educational video script about: "${topic}"

Style: ${STYLES[style] || STYLES.engaging}
Language: ${language}

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
