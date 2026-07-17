// Parse and embed HTML mockup files for Remotion (avoid iframe blank-render bugs)
import fs from 'fs';

export function parseHtmlDocument(html) {
  // Extract COMPLETE style blocks only (truncated mid-CSS must not swallow the doc)
  const htmlStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join('\n');

  const bodyOpenMatch = html.match(/<body[^>]*>/i);
  const bodyCloseMatch = html.match(/<\/body>/i);

  let htmlContent = '';
  if (bodyOpenMatch) {
    const start = bodyOpenMatch.index + bodyOpenMatch[0].length;
    const end = bodyCloseMatch ? bodyCloseMatch.index : html.length;
    htmlContent = html.slice(start, end).trim();
  } else {
    // Truncated before <body> — strip head/style remnants so we don't inject raw CSS as text
    htmlContent = html
      .replace(/<!DOCTYPE[\s\S]*?>/i, '')
      .replace(/<head[\s\S]*?<\/head>/i, '')
      .replace(/<style[\s\S]*?(<\/style>|$)/i, '')
      .replace(/<\/?(html|head|meta|title|link)[^>]*>/gi, '')
      .trim();
  }

  // Drop nested fake browser chrome if present — DemoScene already draws one
  htmlContent = htmlContent
    .replace(/<div[^>]*class="[^"]*browser-(chrome|bar|tabs|toolbar)[^"]*"[^>]*>[\s\S]*?<\/div>\s*/i, '')
    .trim();

  if (!htmlContent || htmlContent.length < 120) {
    htmlContent = `
      <div style="padding:40px 32px;font-family:system-ui,sans-serif;color:#1a1a1a;background:#fff;min-height:480px">
        <h1 style="font-size:26px;margin:0 0 12px">Mockup incomplete</h1>
        <p style="font-size:16px;line-height:1.5;margin:0">Regenerate AI mockup — previous HTML was truncated before content.</p>
      </div>`;
  }

  return { htmlStyles, htmlContent };
}

/** Ensure HTML media has htmlContent/htmlStyles parsed from disk when missing. */
export function enrichHtmlMedia(media) {
  if (!media || media.type !== 'html') return media;
  if (media.htmlContent) return media;

  const file = media.filePath;
  if (!file || !fs.existsSync(file)) return media;

  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseHtmlDocument(raw);
  return { ...media, ...parsed };
}
