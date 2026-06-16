// server/claude.js
export async function generateScript({ topic, style = 'engaging', language = 'English', apiKey }) {
  const STYLES = {
    engaging:      'energetic, enthusiastic teacher for 15–25 year olds',
    professional:  'clear and authoritative professional educator',
    simple:        'simple and friendly, as if explaining to a 12-year-old',
    storytelling:  'narrative storyteller who uses vivid analogies',
  };

  const system = `You are an expert educational content creator who designs viral YouTube Shorts.
Return ONLY valid JSON — no markdown, no backticks, no explanation.`;

  const prompt = `Create a complete educational video script about: "${topic}"

Style: ${STYLES[style] || STYLES.engaging}
Language: ${language}

Return EXACTLY this JSON shape (no extra keys, no comments):
{
  "topic": "Clean video title",
  "accentColor": "#hexcolor",
  "scenes": [
    {
      "id": 1,
      "type": "hook",
      "title": "Short punchy title (max 6 words)",
      "body": "2-3 sentences. Clear, simple, surprising.",
      "narration": "Full voiceover. Natural spoken language, 40-70 words.",
      "keyword": "KEY PHRASE",
      "emoji": "🌑",
      "bgColor": "#0a0a1a",
      "audioDuration": 6
    },
    { "id": 2, "type": "concept",  "title": "...", "body": "...", "narration": "...", "keyword": "...", "emoji": "...", "bgColor": "...", "audioDuration": 7 },
    { "id": 3, "type": "fact",     "title": "...", "body": "...", "narration": "...", "keyword": "...", "emoji": "...", "bgColor": "...", "audioDuration": 6 },
    { "id": 4, "type": "analogy",  "title": "...", "body": "...", "narration": "...", "keyword": "...", "emoji": "...", "bgColor": "...", "audioDuration": 7 },
    {
      "id": 5, "type": "quiz",
      "title": "Quick Check",
      "body": "A multiple-choice question.",
      "narration": "Quiz time! [question]. The answer is [B] because [reason].",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "emoji": "❓",
      "bgColor": "...",
      "audioDuration": 8
    },
    { "id": 6, "type": "summary", "title": "What You Learned", "body": "Three key sentences. Each ends with a period. Memorable.", "narration": "...", "keyword": "REMEMBER THIS", "emoji": "💡", "bgColor": "...", "audioDuration": 7 }
  ]
}

Rules:
- accentColor: one vibrant hex that fits the topic
- bgColor: always very dark (< 15% lightness)
- narration: natural speech, not written prose, no bullets
- audioDuration: seconds to naturally speak the narration
- JSON only, nothing else`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude: ${data.error.message}`);

  const raw = data.content[0].text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}
