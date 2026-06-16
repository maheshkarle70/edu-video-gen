// server/index.js  — Edu Video Gen · Full Pipeline Server
import 'dotenv/config';
import express         from 'express';
import fs              from 'fs';
import path            from 'path';
import { execSync, exec } from 'child_process';
import { fileURLToPath }  from 'url';
import { generateScript } from './claude.js';
import { generateAudio }  from './elevenlabs.js';
import { renderVideo }    from './render.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..');
// Resolve OUTPUT_DIR relative to the project root (not process.cwd())
// This ensures it works regardless of where `node` is run from
const OUTPUT_DIR = process.env.OUTPUT_DIR && !process.env.OUTPUT_DIR.startsWith('/')
  ? path.resolve(__dirname, '..', process.env.OUTPUT_DIR)
  : process.env.OUTPUT_DIR && process.env.OUTPUT_DIR.startsWith('/home/claude')
    ? path.resolve(__dirname, '..', 'output')   // fix stale sandbox path
    : path.resolve(process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output'));
const PORT       = parseInt(process.env.PORT || '4000', 10);

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/output', express.static(OUTPUT_DIR));

// ── CORS (allow localhost artifact preview) ───────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,xi-api-key,anthropic-version');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── /config ───────────────────────────────────────────────────
app.get('/config', (_req, res) => {
  const hint = (k = '', n = 4) => k.length > n ? k.slice(0, n) + '…' + k.slice(-3) : '';
  res.json({
    hasAnthropicKey:  !!(process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')),
    hasElevenLabsKey: (process.env.ELEVENLABS_API_KEY?.length || 0) > 10,
    hasLeonardoKey:   (process.env.LEONARDO_API_KEY?.length || 0) > 10,
    anthropicHint:    hint(process.env.ANTHROPIC_API_KEY || '', 7),
    elevenHint:       hint(process.env.ELEVENLABS_API_KEY || '', 3),
    defaultVoiceId:   process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
    videoFormat:      process.env.VIDEO_FORMAT || 'portrait',
  });
});

// ── /voices ───────────────────────────────────────────────────
app.get('/voices', (_req, res) => {
  res.json([
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   desc: 'Deep, authoritative — great for history/science' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',  desc: 'Warm, conversational' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   desc: 'Confident, clear' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    desc: 'Calm, measured' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'British, professional' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', desc: 'Strong, powerful' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   desc: 'Friendly female voice' },
    { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi',   desc: 'Energetic female voice' },
  ]);
});

// ── /proxy/claude  (forwards Claude API calls server-side) ────
app.post('/proxy/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-api-key'] || '';
  if (!apiKey) return res.status(400).json({ error: 'No Anthropic API key' });
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// ── /generate  (full pipeline: script + audio + render) ───────
// Accepts either:
//  a) { topic, style, language, accentColor, claudeKey, elevenKey, voiceId, format }
//  b) { script, elevenKey, voiceId, accentColor, format }  (pre-built script)
app.post('/generate', async (req, res) => {
  const { topic, style, language, accentColor, claudeKey, elevenKey, voiceId, format, script: prebuilt } = req.body;

  const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY  || claudeKey  || '';
  const ELEVEN_KEY     = process.env.ELEVENLABS_API_KEY || elevenKey  || '';
  const VOICE_ID       = process.env.ELEVENLABS_VOICE_ID || voiceId   || 'pNInz6obpgDQGcFmaJgB';
  const VIDEO_FORMAT   = process.env.VIDEO_FORMAT        || format     || 'portrait';

  if (!prebuilt && !topic) return res.status(400).json({ error: 'Provide topic or script' });
  if (!prebuilt && !ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });

  // SSE
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  try {
    // 1 — Script
    let script = prebuilt;
    if (!script) {
      send('progress', { step: 1, pct: 5,  msg: '🤖 Claude is writing the educational script...' });
      script = await generateScript({ topic, style, language, apiKey: ANTHROPIC_KEY });
      send('script', script);
      send('progress', { step: 1, pct: 20, msg: `✅ Script ready — ${script.scenes.length} scenes` });
    } else {
      send('script', script);
      send('progress', { step: 1, pct: 20, msg: `✅ Using provided script — ${script.scenes.length} scenes` });
    }

    // 2 — Audio
    const jobId   = Date.now().toString();
    const audioDir = path.join(OUTPUT_DIR, jobId);
    fs.mkdirSync(audioDir, { recursive: true });

    if (ELEVEN_KEY) {
      send('progress', { step: 2, pct: 25, msg: '🎙 Generating voiceover with ElevenLabs...' });
      for (let i = 0; i < script.scenes.length; i++) {
        const sc = script.scenes[i];
        const ap  = path.join(audioDir, `scene_${i}.mp3`);
        try {
          await generateAudio({ apiKey: ELEVEN_KEY, voiceId: VOICE_ID, text: sc.narration || sc.body, outputPath: ap });
          script.scenes[i].audioFile    = ap;
          script.scenes[i].durationSec  = getAudioDuration(ap);
        } catch (e) {
          console.warn(`[Audio] Scene ${i} failed:`, e.message);
          script.scenes[i].durationSec  = estimateDuration(sc.narration || sc.body);
        }
        const pct = 25 + Math.round((i + 1) / script.scenes.length * 30);
        send('progress', { step: 2, pct, msg: `🎙 Voiceover ${i + 1}/${script.scenes.length} — ${sc.title}` });
      }
    } else {
      send('progress', { step: 2, pct: 55, msg: '🔇 No ElevenLabs key — rendering silent video (add ELEVENLABS_API_KEY to .env)' });
      script.scenes.forEach(sc => { sc.durationSec = estimateDuration(sc.narration || sc.body); });
    }

    // 3 — FFmpeg render
    send('progress', { step: 3, pct: 58, msg: '🎬 Rendering animated video with FFmpeg...' });
    const outputPath = path.join(OUTPUT_DIR, `${jobId}.mp4`);
    const isPortrait = VIDEO_FORMAT === 'portrait';

    await renderVideo({
      props: { topic: script.topic, scenes: script.scenes, accentColor: accentColor || script.accentColor || '#7c5cfc' },
      outputPath,
      width:  isPortrait ? 1080 : 1920,
      height: isPortrait ? 1920 : 1080,
      fps:    parseInt(process.env.VIDEO_FPS || '30', 10),
      onProgress: (p) => send('progress', {
        step: 3, pct: 58 + Math.round(p * 37),
        msg: `🎬 Rendering… ${Math.round(p * 100)}%`,
        renderProgress: p,
      }),
    });

    try { fs.rmSync(audioDir, { recursive: true, force: true }); } catch {}

    // 4 — Done
    const { size } = fs.statSync(outputPath);
    send('progress', { step: 4, pct: 100, msg: '✅ Video ready!' });
    send('done', {
      downloadUrl: `/output/${jobId}.mp4`,
      fileSizeMB:  (size / 1024 / 1024).toFixed(1),
      durationSec: script.scenes.reduce((a, s) => a + (s.durationSec || 6), 0),
      scenes:      script.scenes.length,
      topic:       script.topic,
      hasAudio:    !!ELEVEN_KEY,
    });

  } catch (err) {
    console.error('[Generate]', err);
    send('error', { message: err.message });
  }
  res.end();
});

// ── Helpers ───────────────────────────────────────────────────
function getAudioDuration(filePath) {
  try {
    const out = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`).toString().trim();
    return Math.max(parseFloat(out) || 5, 2);
  } catch { return 5; }
}

function estimateDuration(text = '') {
  return Math.max(Math.ceil(text.split(' ').length / 2.5), 4);
}

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════════════╗');
  console.log('  ║   Edu Video Gen — AI Educational Pipeline    ║');
  console.log('  ╚══════════════════════════════════════════════╝\n');
  console.log(`  ✅  http://localhost:${PORT}\n`);
  console.log('  Keys from .env:');
  console.log(`    ANTHROPIC_API_KEY  : ${process.env.ANTHROPIC_API_KEY  ? '✓ set' : '✗ missing'}`);
  console.log(`    ELEVENLABS_API_KEY : ${process.env.ELEVENLABS_API_KEY ? '✓ set' : '✗ missing (silent video)'}`);
  console.log(`    ELEVENLABS_VOICE_ID: ${process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'}`);
  console.log(`    VIDEO_FORMAT       : ${process.env.VIDEO_FORMAT || 'portrait'}\n`);
  exec(`open http://localhost:${PORT} 2>/dev/null || xdg-open http://localhost:${PORT} 2>/dev/null || start http://localhost:${PORT}`, () => {});
});
