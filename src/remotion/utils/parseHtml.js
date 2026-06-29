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
