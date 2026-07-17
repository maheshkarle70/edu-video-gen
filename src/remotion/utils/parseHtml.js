export function parseHtmlDocument(html) {
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
    htmlContent = html
      .replace(/<!DOCTYPE[\s\S]*?>/i, '')
      .replace(/<head[\s\S]*?<\/head>/i, '')
      .replace(/<style[\s\S]*?(<\/style>|$)/i, '')
      .replace(/<\/?(html|head|meta|title|link)[^>]*>/gi, '')
      .trim();
  }

  if (!htmlContent || htmlContent.length < 120) {
    htmlContent = `
      <div style="padding:40px 32px;font-family:system-ui,sans-serif;color:#1a1a1a;background:#fff;min-height:480px">
        <h1 style="font-size:26px;margin:0 0 12px">Mockup incomplete</h1>
        <p style="font-size:16px;line-height:1.5;margin:0">Regenerate AI mockup — previous HTML was truncated.</p>
      </div>`;
  }

  return { htmlStyles, htmlContent };
}
