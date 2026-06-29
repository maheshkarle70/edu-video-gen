// Generate self-contained HTML mockups for sections without user uploads
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enrichHtmlMedia, parseHtmlDocument } from './htmlMedia.js';
import { extractUrl, fetchPageContext, formatPageContextForPrompt } from './urlContext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MOCKUPS_DIR = path.join(__dirname, '../data/mockups');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function callClaudeHtml({ apiKey, userContent, maxTokens = 8192 }) {
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
      system: 'You are an expert UI designer. Return ONLY a complete HTML document — no markdown, no backticks, no explanation.',
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API (${model}): ${data.error.message}`);

  let html = data.content?.[0]?.text?.trim() || '';
  html = html.replace(/^```html?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!html.includes('<html')) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif;}</style></head><body>${html}</body></html>`;
  }
  if (!/<\/body>/i.test(html)) html += '\n</body>';
  if (!/<\/html>/i.test(html)) html += '\n</html>';

  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens || 0, outputTokens: data.usage.output_tokens || 0, model }
    : { inputTokens: 0, outputTokens: 0, model };

  return { html, usage };
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

export async function generateSectionMockup({ section, apiKey, jobId, force = false }) {
  const sectionId = section.id || 'section';
  const { dir, file, url } = mockupPath(jobId, sectionId);

  if (!force && fs.existsSync(file)) {
    const parsed = parseHtmlDocument(fs.readFileSync(file, 'utf8'));
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

  const mb = section.mediaBrief || {};
  const captureSteps = (mb.captureSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const fallbackPrompt = section.animationFallback?.prompt || '';
  const pageUrl = extractUrl(mb.whereToGo || '');

  let pageContextBlock = '';
  if (pageUrl) {
    try {
      const ctx = await fetchPageContext(pageUrl);
      pageContextBlock = `\n\nReal page metadata (match this branding and copy closely):\n${formatPageContextForPrompt(ctx)}`;
    } catch (e) {
      pageContextBlock = `\n\nTarget URL: ${pageUrl} (could not fetch live page — ${e.message})`;
    }
  }

  const { html, usage } = await callClaudeHtml({
    apiKey,
    userContent: `Design a realistic, polished web-app mockup as a single self-contained HTML page (inline CSS only — no external images, fonts, or scripts).

Purpose: stand in for a tutorial screenshot/video when the creator could not record the real site.

Section: "${section.title}"
Site / URL context: ${mb.whereToGo || 'web app'}
What must appear on screen: ${mb.whatToCapture || section.onScreenText || section.body || section.title}
${captureSteps ? `\nCapture guide:\n${captureSteps}` : ''}
${fallbackPrompt ? `\nExtra direction: ${fallbackPrompt}` : ''}${pageContextBlock}

Requirements:
- Tall vertical layout: min-height 1200px with content spread top-to-bottom (hero at top, key UI e.g. chat input lower on page) so a slow scroll-down reveal feels like a screen recording
- 16:9 viewport width (~1200px), light modern UI unless the app is naturally dark (e.g. claude.ai uses warm off-white/cream)
- Include browser-realistic details: nav, hero headline, subtext, primary CTA or chat input box as described
- Use plausible placeholder text — do NOT use lorem ipsum
- If real page metadata was provided above, match the actual product name, tagline, and layout structure
- No JavaScript. Static HTML + inline CSS only.
- NO CSS animations, @keyframes, or animation-delay — all content fully visible immediately (video motion is handled by scroll)
- MUST include closing </body></html> tags — complete valid HTML document
- Make it look like a real product homepage, not a wireframe`,
  });

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

export async function ensureMockupsForBrief({ brief, sectionMedia = {}, apiKey, jobId, force = false }) {
  const merged = { ...sectionMedia };
  let inputTokens = 0;
  let outputTokens = 0;

  for (const sec of brief.sections || []) {
    const existing = merged[sec.id];
    if (existing?.url || existing?.filePath) continue;

    const mockup = await generateSectionMockup({ section: sec, apiKey, jobId, force });
    merged[sec.id] = mockup;
    inputTokens += mockup.usage?.inputTokens || 0;
    outputTokens += mockup.usage?.outputTokens || 0;
  }

  return {
    sectionMedia: merged,
    usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
  };
}
