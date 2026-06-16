// server/claude.js
export async function generateScript({ topic, style = 'engaging', language = 'English', apiKey }) {
  const STYLES = {
    engaging:     'energetic, enthusiastic teacher for 15–25 year olds — make it exciting',
    professional: 'clear, authoritative professional educator',
    simple:       'friendly and simple, as if explaining to a 12-year-old',
    storytelling: 'narrative storyteller who uses vivid analogies and drama',
  };

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: 'You are an expert educational content creator for YouTube Shorts. Return ONLY valid JSON — no markdown, no backticks, no explanation.',
      messages: [{
        role: 'user',
        content: `Create a complete educational video script about: "${topic}"

Style: ${STYLES[style] || STYLES.engaging}
Language: ${language}

Return EXACTLY this JSON (no extra keys, no comments):
{
  "topic": "Clean punchy video title",
  "accentColor": "#hexcolor (vibrant color fitting the topic — purple=science, orange=history, green=biology, blue=tech)",
  "scenes": [
    {
      "id": 1,
      "type": "hook",
      "title": "Short punchy title (max 6 words)",
      "body": "2-3 sentences. Clear, simple, surprising fact.",
      "narration": "Natural spoken voiceover — 40-60 words. Conversational speech, no bullet points, no lists.",
      "keyword": "2-4 WORD KEY CONCEPT (ALL CAPS)",
      "emoji": "1 relevant emoji",
      "bgColor": "#very dark hex (lightness < 12%)",
      "durationSec": 7
    },
    { "id": 2, "type": "concept",  "title": "...", "body": "...", "narration": "40-60 words", "keyword": "...", "emoji": "...", "bgColor": "...", "durationSec": 7 },
    { "id": 3, "type": "fact",     "title": "...", "body": "Surprising, counterintuitive fact.", "narration": "40-60 words", "keyword": "...", "emoji": "...", "bgColor": "...", "durationSec": 7 },
    { "id": 4, "type": "analogy",  "title": "Think of it like...", "body": "Vivid everyday analogy that makes the concept click.", "narration": "40-60 words", "keyword": "...", "emoji": "...", "bgColor": "...", "durationSec": 7 },
    {
      "id": 5, "type": "quiz",
      "title": "Quick Check",
      "body": "One clear multiple-choice question testing the core concept.",
      "narration": "Quiz time! [state question clearly]. Think about it... The answer is [letter] — [brief 1-sentence reason].",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "emoji": "❓",
      "bgColor": "...",
      "durationSec": 9
    },
    { "id": 6, "type": "summary", "title": "What You Learned", "body": "Three key takeaways. Each sentence ends with a period.", "narration": "40-60 words. End with: Follow for more amazing facts!", "keyword": "REMEMBER THIS", "emoji": "💡", "bgColor": "...", "durationSec": 8 }
  ]
}

Rules:
- bgColor MUST be very dark (e.g. #080a12, #0d0a1a, #0a1208) for text readability
- narration = natural flowing speech, not written prose, no asterisks or bullets
- durationSec should match how long it takes to naturally say the narration aloud
- Make content genuinely educational AND surprising — pick facts that feel unbelievable but are true`
      }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API (${model}): ${data.error.message}`);
  const raw = data.content[0].text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(raw); }
  catch { throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 300)}`); }
}
