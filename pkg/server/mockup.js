// Generate self-contained HTML mockups for sections without user uploads.
// Critical: Claude often hits max_tokens mid-</style> which leaves a blank white
// mockup in Remotion. Keep prompts compact, validate completeness, retry once.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseHtmlDocument } from './htmlMedia.js';
import { extractUrl, fetchPageContext, formatPageContextForPrompt } from './urlContext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MOCKUPS_DIR = path.join(__dirname, '../data/mockups');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isCompleteHtml(html = '') {
  const lower = html.toLowerCase();
  const hasClosedStyle = (html.match(/<style[\s\S]*?<\/style>/gi) || []).length > 0
    || !/<style[\s>]/i.test(html);
  const hasBody = /<body[\s>]/i.test(html);
  const hasClosedBody = /<\/body>/i.test(html);
  const openComments = (html.match(/<!--/g) || []).length;
  const closeComments = (html.match(/-->/g) || []).length;
  // Not cut off mid-tag / mid-comment / mid-CSS
  const tail = html.trimEnd().slice(-120);
  const midTruncate = openComments > closeComments
    || /<!--[^>]*$/.test(tail)
    || /<(div|section|table|tr|td|p|h[1-6]|span|ul|li)[^>]*$/i.test(tail)
    || /\{\s*$/.test(tail)
    || /:\s*$/.test(tail)
    || /<!--\s*[A-Z][A-Z\s]{0,40}\s*<\/body>/i.test(html);
  // Body must have some real markup beyond a stub
  let bodyText = '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    bodyText = bodyMatch[1]
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const tooThin = hasBody && bodyText.length < 120;
  return hasClosedStyle && hasBody && hasClosedBody && !midTruncate && !tooThin && lower.includes('</html>');
}

/** Close dangling tags so Remotion never gets a CSS-only blank page. */
function repairTruncatedHtml(html, title = 'Preview') {
  let out = html.trim();
  if (/<style[\s>]/i.test(out) && !/<\/style>/i.test(out)) {
    out += '\n</style>';
  }
  if (!/<body[\s>]/i.test(out)) {
    out += `\n</head><body>\n<div style="padding:32px;font-family:system-ui,sans-serif;color:#111">`
      + `<h1 style="font-size:28px;margin:0 0 16px">${escapeHtml(title)}</h1>`
      + `<p style="font-size:16px;line-height:1.5;margin:0 0 12px">Page content could not finish generating. Re-run AI mockup for a complete screen.</p>`
      + `<ul style="font-size:15px;line-height:1.6;margin:0;padding-left:20px">`
      + `<li>Key details belong in this main area</li>`
      + `<li>Tables, cards, and lists should fill the viewport</li>`
      + `</ul></div>`;
  }
  if (!/<\/body>/i.test(out)) out += '\n</body>';
  if (!/<\/html>/i.test(out)) out += '\n</html>';
  if (!/^<!DOCTYPE/i.test(out) && !/<html/i.test(out)) {
    out = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${out}</body></html>`;
  }
  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MOCKUP_SYSTEM = `You are an expert UI designer for educational YouTube video frames.
Return ONLY a complete HTML document — no markdown, no backticks, no explanation.
ALWAYS finish </style>, </body>, and </html>. Prefer compact CSS.

COLOR SYSTEM:
- Prefer dark educational theme: background #0f1419 or #12151c, cards #1a2230, soft borders #2a3548
- Accent: ONE primary (#4f8cff or teal) + ONE secondary (#e8b84a) — never neon rainbow
- Text: #f2f5fa on dark, or #111827 on light — NEVER gray-on-gray
- Muted labels ≥ #c5d0e0 on dark

TYPOGRAPHY — MOBILE VIDEO READABILITY:
- Body/card copy ≥ 26–30px, weight 600+
- Headings ≥ 40–56px, weight 800
- Labels/badges ≥ 18–22px, weight 700
- NEVER font-size under 16px
- Prefer fewer larger blocks; max ~40 words visible at once
- Padding 24–32px; center main content horizontally

HARD RULES:
- Static HTML + <style> only. No JS, no external URLs, no animations
- All content visible immediately (opacity 1)
- Plausible educational copy (no lorem ipsum)
- Layout padding ≥ 28px left/right; nothing clipped off-screen`;

async function callClaudeHtml({ apiKey, userContent, maxTokens = 12000 }) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: [
        {
          type: 'text',
          text: MOCKUP_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API (${model}): ${data.error.message}`);

  let html = data.content?.[0]?.text?.trim() || '';
  html = html.replace(/^```html?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!html.includes('<html')) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
  }

  const u = data.usage || {};
  const usage = {
    inputTokens: u.input_tokens || 0,
    outputTokens: u.output_tokens || 0,
    cacheCreationTokens: u.cache_creation_input_tokens || 0,
    cacheReadTokens: u.cache_read_input_tokens || 0,
    model,
    stopReason: data.stop_reason,
  };

  return { html, usage, stopReason: data.stop_reason };
}

function mockupPath(jobId, sectionId) {
  const safeJob = (jobId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSec = (sectionId || 'section').replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    dir: path.join(MOCKUPS_DIR, safeJob),
    file: path.join(MOCKUPS_DIR, safeJob, `${safeSec}.html`),
    url: `/mockups/${safeJob}/${safeSec}.html`,
  };
}

function buildMockupPrompt({ section, mb, captureSteps, fallbackPrompt, pageContextBlock, compact = false }) {
  const density = compact
    ? `COMPACT MODE (token budget):
- Target ~80–120 lines total. Short CSS (no browser-chrome fake window).
- One header + ONE dense main block (diagram OR table OR 3–5 cards) — fill the first 800px.
- Skip footers, sidebars, secondary nav, and decorative sections.`
    : `Layout:
- Width ~1200px, height ~900–1100px of REAL content (not empty padding).
- Header/nav is fine; DO NOT draw a fake OS browser window (outer video already has chrome).
- Main area below nav MUST be filled — NEVER a large blank white region.`;

  return `Design a readable educational UI mockup as ONE complete HTML file (inline CSS only) — optimized for YouTube video frames.

Section: "${section.title}"
Site / URL: ${mb.whereToGo || 'educational graphic / explainer panel'}
Must show on screen: ${mb.whatToCapture || section.onScreenText || section.body || section.title}
${captureSteps ? `\nCapture guide:\n${captureSteps}` : ''}
${fallbackPrompt ? `\nExtra: ${fallbackPrompt}` : ''}${pageContextBlock}

${density}

Follow the system color/typography/mobile-readability rules.
Match product names from metadata when given.
Prefer short class names so the document finishes completely.`;
}

export async function generateSectionMockup({ section, apiKey, jobId, force = false }) {
  const sectionId = section.id || 'section';
  const { dir, file, url } = mockupPath(jobId, sectionId);

  if (!force && fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    if (isCompleteHtml(raw)) {
      const parsed = parseHtmlDocument(raw);
      return {
        type: 'html',
        url,
        filePath: file,
        fileName: `${sectionId}.html`,
        caption: section.mediaBrief?.whatToCapture || section.title,
        generated: true,
        htmlContent: parsed.htmlContent,
        htmlStyles: parsed.htmlStyles,
      };
    }
    console.warn(`[Mockup] Cached ${sectionId} incomplete — regenerating`);
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  }

  const mb = section.mediaBrief || {};
  const captureSteps = (mb.captureSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const fallbackPrompt = section.animationFallback?.prompt || '';
  const pageUrl = extractUrl(mb.whereToGo || '');

  let pageContextBlock = '';
  if (pageUrl) {
    try {
      const ctx = await Promise.race([
        fetchPageContext(pageUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('page context timeout')), 2500)),
      ]);
      pageContextBlock = `\n\nReal page metadata (match this branding and copy closely):\n${formatPageContextForPrompt(ctx)}`;
    } catch (e) {
      pageContextBlock = `\n\nTarget URL: ${pageUrl}`;
    }
  }

  const promptArgs = { section, mb, captureSteps, fallbackPrompt, pageContextBlock };
  // Compact-only: full mockups regularly hit max_tokens and double the wait with a retry.
  let { html, usage, stopReason } = await callClaudeHtml({
    apiKey,
    userContent: buildMockupPrompt({ ...promptArgs, compact: true }),
    maxTokens: 4500,
  });

  if (!isCompleteHtml(html) || stopReason === 'max_tokens') {
    console.warn(`[Mockup] ${sectionId} incomplete (stop=${stopReason}) — repairing`);
    html = repairTruncatedHtml(html, section.title);
  }

  ensureDir(dir);
  fs.writeFileSync(file, html, 'utf8');

  const parsed = parseHtmlDocument(html);
  return {
    type: 'html',
    url,
    filePath: file,
    fileName: `${sectionId}.html`,
    caption: mb.whatToCapture || section.title,
    generated: true,
    htmlContent: parsed.htmlContent,
    htmlStyles: parsed.htmlStyles,
    usage,
  };
}

export async function ensureMockupsForBrief({
  brief, sectionMedia = {}, apiKey, jobId, force = false, onProgress,
}) {
  const merged = { ...sectionMedia };
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  const pending = (brief.sections || []).filter((sec) => {
    const existing = merged[sec.id];
    return !(existing?.url || existing?.filePath);
  });

  const total = pending.length;
  if (total === 0) {
    return {
      sectionMedia: merged,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  onProgress?.({ msg: `Generating ${total} AI mockup${total === 1 ? '' : 's'}…`, pct: 5, done: 0, total });

  const CONCURRENCY = 3;
  let done = 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (sec) => {
      onProgress?.({
        msg: `AI mockup: ${sec.title || sec.id} (${done + 1}/${total})…`,
        pct: 5 + Math.round((done / total) * 80),
        done,
        total,
        sectionId: sec.id,
      });
      const mockup = await generateSectionMockup({ section: sec, apiKey, jobId, force });
      return { sec, mockup };
    }));

    for (const { sec, mockup } of results) {
      merged[sec.id] = mockup;
      inputTokens += mockup.usage?.inputTokens || 0;
      outputTokens += mockup.usage?.outputTokens || 0;
      cacheCreationTokens += mockup.usage?.cacheCreationTokens || 0;
      cacheReadTokens += mockup.usage?.cacheReadTokens || 0;
      done += 1;
      onProgress?.({
        msg: `AI mockup ready: ${sec.title || sec.id} (${done}/${total})`,
        pct: 5 + Math.round((done / total) * 85),
        done,
        total,
        sectionId: sec.id,
      });
    }
  }

  return {
    sectionMedia: merged,
    usage: { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, totalTokens: inputTokens + outputTokens },
  };
}
