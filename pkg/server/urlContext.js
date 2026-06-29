// Extract URLs from brief text and fetch public page metadata for mockups / capture

export function extractUrl(text = '') {
  const m = String(text).match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;:!?)+\]]+$/, '');
}

function metaContent(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export async function fetchPageContext(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);

  const html = await res.text();
  const title = metaContent(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);
  const description = metaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ]);
  const ogImage = metaContent(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);
  const themeColor = metaContent(html, [
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
  ]);

  return { url, title, description, ogImage, themeColor, fetched: true };
}

export function formatPageContextForPrompt(ctx) {
  if (!ctx) return '';
  const lines = [`Live URL: ${ctx.url}`];
  if (ctx.title) lines.push(`Page title: ${ctx.title}`);
  if (ctx.description) lines.push(`Page description: ${ctx.description}`);
  if (ctx.themeColor) lines.push(`Theme color: ${ctx.themeColor}`);
  if (ctx.ogImage) lines.push(`Reference image URL (match layout/branding): ${ctx.ogImage}`);
  return lines.join('\n');
}
