// Screenshot a live public URL with headless Chrome (Puppeteer)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UPLOADS_DIR, newSessionId } from './upload.js';
import { extractUrl } from './urlContext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function loadPuppeteer() {
  try {
    const mod = await import('puppeteer');
    return mod.default || mod;
  } catch {
    throw new Error(
      'Live URL capture needs Puppeteer. Run: cd pkg && npm install puppeteer',
    );
  }
}

export async function captureUrlScreenshot({
  url, jobId, sectionId = 'media', sessionId, width = 1920, height = 1080,
}) {
  const targetUrl = extractUrl(url) || url;
  if (!targetUrl?.startsWith('http')) {
    throw new Error('Provide a valid http(s) URL');
  }

  const sid = sessionId || newSessionId();
  const safeSection = sectionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(UPLOADS_DIR, sid);
  ensureDir(dir);
  const filePath = path.join(dir, `${safeSection}.png`);

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: filePath, type: 'png', fullPage: false });
  } finally {
    await browser.close();
  }

  const stat = fs.statSync(filePath);
  return {
    sessionId: sid,
    sectionId: safeSection,
    type: 'image',
    url: `/uploads/${sid}/${safeSection}.png`,
    filePath,
    fileName: `${safeSection}-capture.png`,
    size: stat.size,
    caption: `Live capture of ${targetUrl}`,
    capturedFromUrl: targetUrl,
    generated: true,
  };
}
