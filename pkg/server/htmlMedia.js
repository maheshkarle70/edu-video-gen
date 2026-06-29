// Parse and embed HTML mockup files for Remotion (avoid iframe blank-render bugs)
import fs from 'fs';

export function parseHtmlDocument(html) {
  const htmlStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join('\n');

  const bodyOpenMatch = html.match(/<body[^>]*>/i);
  const bodyCloseMatch = html.match(/<\/body>/i);

  let htmlContent = html;
  if (bodyOpenMatch) {
    const start = bodyOpenMatch.index + bodyOpenMatch[0].length;
    const end = bodyCloseMatch ? bodyCloseMatch.index : html.length;
    htmlContent = html.slice(start, end).trim();
  }

  return { htmlStyles, htmlContent };
}

export function enrichHtmlMedia(media) {
  if (!media || media.type !== 'html') return media;
  if (media.htmlContent) return media;

  const file = media.filePath;
  if (!file || !fs.existsSync(file)) return media;

  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseHtmlDocument(raw);
  return { ...media, ...parsed };
}
