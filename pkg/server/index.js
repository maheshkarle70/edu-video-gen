// server/index.js  — Edu Video Gen · Full Pipeline Server
import 'dotenv/config';
import express         from 'express';
import fs              from 'fs';
import path            from 'path';
import { execSync, exec } from 'child_process';
import { fileURLToPath }  from 'url';
import { generateScript, generateOutline, generateLongScript, generateBrief, generatePublishMetadata, enrichSubtopicMedia } from './claude.js';
import { generateAudio, generateAudioWithTimestamps, searchVoices, getVoice } from './elevenlabs.js';
import { estimateWordTimings } from './wordTimings.js';
import { renderVideo }    from './render.js';
import { recordVideoUsage, getUsageSummary, addClaudeCall, enrichClaudeUsage, recordStepUsage } from './usage.js';
import { uploadMiddleware, saveUploadedFile, UPLOADS_DIR, newSessionId } from './upload.js';
import { finalizeVideoUpload } from './transcode.js';
import { MOCKUPS_DIR, generateSectionMockup, ensureMockupsForBrief } from './mockup.js';
import { captureUrlScreenshot } from './captureUrl.js';
import { mergeStoryboardMedia, enrichScriptMedia } from './media.js';
import { briefToScript, calcPreviewFrames, capPreviewDurationSec } from './assemble.js';
import { createJob, loadJob, patchJob, JOB_STATUS } from './jobs.js';
import { ensurePreviewBundle } from './build-preview.js';
import {
  estimateSpeechDurationSec,
  ttsModelForLanguage,
  voicePreviewText,
  voiceSearchHint,
  normalizeLanguage,
} from './language.js';

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
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(MOCKUPS_DIR)) fs.mkdirSync(MOCKUPS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/output', express.static(OUTPUT_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/mockups', express.static(MOCKUPS_DIR));

// ── CORS (allow localhost artifact preview) ───────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,xi-api-key,anthropic-version');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── /config ───────────────────────────────────────────────────
app.get('/config', async (_req, res) => {
  const hint = (k = '', n = 4) => k.length > n ? k.slice(0, n) + '…' + k.slice(-3) : '';
  const usage = await getUsageSummary({
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    elevenKey: process.env.ELEVENLABS_API_KEY,
  });
  res.json({
    hasAnthropicKey:  !!(process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')),
    hasElevenLabsKey: (process.env.ELEVENLABS_API_KEY?.length || 0) > 10,
    hasLeonardoKey:   (process.env.LEONARDO_API_KEY?.length || 0) > 10,
    anthropicHint:    hint(process.env.ANTHROPIC_API_KEY || '', 7),
    elevenHint:       hint(process.env.ELEVENLABS_API_KEY || '', 3),
    defaultVoiceId:   process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
    videoFormat:      process.env.VIDEO_FORMAT || 'portrait',
    usage,
  });
});

// ── /usage ────────────────────────────────────────────────────
app.get('/usage', async (_req, res) => {
  try {
    const summary = await getUsageSummary({
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      elevenKey: process.env.ELEVENLABS_API_KEY,
    });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── /voices ───────────────────────────────────────────────────
const STATIC_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   desc: 'Deep, authoritative — great for history/science' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',  desc: 'Warm, conversational' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   desc: 'Confident, clear' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    desc: 'Calm, measured' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'British, professional' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', desc: 'Strong, powerful' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   desc: 'Friendly female voice' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi',   desc: 'Energetic female voice' },
  { id: 'BTNeCNdXniCSbjEac5vd', name: 'Amit Gupta — Explosive', desc: 'Youthful, energetic — strong for Hindi/Marathi' },
  { id: 'Sxk6njaoa7XLsAFT7WcN', name: 'Amit Gupta — Warm', desc: 'Warm Indian tone — good for Marathi lessons' },
];

app.get('/voices', (_req, res) => {
  res.json(STATIC_VOICES);
});

app.get('/voices/search', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY || req.headers['xi-api-key'] || '';
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  if (!apiKey) return res.status(400).json({ error: 'No ElevenLabs API key — add ELEVENLABS_API_KEY to .env' });

  try {
    const voices = await searchVoices({ apiKey, query: q });
    res.json(voices);
  } catch (e) {
    console.error('[Voices] Search failed:', e.message);
    res.status(502).json({ error: e.message });
  }
});

app.get('/voices/hints/language', (req, res) => {
  const language = normalizeLanguage(req.query.language || 'English');
  res.json({
    language,
    searchHint: voiceSearchHint(language),
    ttsModel: ttsModelForLanguage(language),
    previewText: voicePreviewText(language),
  });
});

app.get('/voices/:voiceId', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY || req.headers['xi-api-key'] || '';
  if (!apiKey) return res.status(400).json({ error: 'No ElevenLabs API key' });

  try {
    const voice = await getVoice({ apiKey, voiceId: req.params.voiceId });
    res.json(voice);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post('/voices/preview', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY || req.body.elevenKey || '';
  const id = req.body.voiceId || process.env.ELEVENLABS_VOICE_ID;
  const language = normalizeLanguage(req.body.language || 'English');
  if (!apiKey) return res.status(400).json({ error: 'No ElevenLabs API key' });
  if (!id) return res.status(400).json({ error: 'No voice selected' });

  const previewPath = path.join(OUTPUT_DIR, `preview_${id}.mp3`);
  try {
    await generateAudio({
      apiKey,
      voiceId: id,
      text: voicePreviewText(language),
      outputPath: previewPath,
      modelId: ttsModelForLanguage(language),
    });
    res.json({ audioUrl: `/output/preview_${id}.mp3`, language, ttsModel: ttsModelForLanguage(language) });
  } catch (e) {
    console.error('[Voices] Preview failed:', e.message);
    res.status(502).json({ error: e.message });
  }
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

// ── /upload/session  (new storyboard upload session) ───────────
app.post('/upload/session', (_req, res) => {
  res.json({ sessionId: newSessionId() });
});

// ── /upload  (storyboard screenshot or screen recording) ─────
app.post('/upload', (req, res) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('[Upload]', err.message);
      return res.status(400).json({ error: err.message });
    }
    try {
      const saved = finalizeVideoUpload(saveUploadedFile(req));
      res.json(saved);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// ── /metadata  (YouTube / social title, description, tags) ───
app.post('/metadata', async (req, res) => {
  const {
    topic, language, videoMode, hashtag, scenes, durationSec, claudeKey,
  } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || claudeKey || '';

  if (!topic?.trim()) return res.status(400).json({ error: 'Provide a topic' });
  if (!ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });

  try {
    const { metadata, usage } = await generatePublishMetadata({
      topic: topic.trim(),
      language: language || 'English',
      videoMode: videoMode || 'short',
      hashtag: hashtag || '',
      scenes: Array.isArray(scenes) ? scenes : [],
      durationSec: Number(durationSec) || 0,
      apiKey: ANTHROPIC_KEY,
    });
    const enriched = recordStepUsage({ step: 'metadata', topic: topic.trim(), claude: usage });
    res.json({ ...metadata, usage: enriched });
  } catch (e) {
    console.error('[Metadata]', e);
    res.status(502).json({ error: e.message });
  }
});

// ── /outline  (suggest subtopics for long YouTube videos) ─────
app.post('/outline', async (req, res) => {
  const { topic, style, language, claudeKey } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || claudeKey || '';

  if (!topic?.trim()) return res.status(400).json({ error: 'Provide a topic' });
  if (!ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });

  try {
    const { outline, usage } = await generateOutline({
      topic: topic.trim(),
      style: style || 'professional',
      language: language || 'English',
      apiKey: ANTHROPIC_KEY,
    });
    const enriched = recordStepUsage({ step: 'outline', topic: topic.trim(), claude: usage });
    res.json({ ...outline, subtopics: (outline.subtopics || []).map(enrichSubtopicMedia), usage: enriched });
  } catch (e) {
    console.error('[Outline]', e);
    res.status(502).json({ error: e.message });
  }
});

// ── /brief  (Agent 2 — production brief with narration + media guide) ──
app.post('/brief', async (req, res) => {
  const {
    topic, style, language, claudeKey, selectedSubtopics, jobId,
  } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || claudeKey || '';

  if (!topic?.trim()) return res.status(400).json({ error: 'Provide a topic' });
  if (!selectedSubtopics?.length) return res.status(400).json({ error: 'Select at least 1 subtopic' });
  if (!ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });

  try {
    const { brief, usage } = await generateBrief({
      topic: topic.trim(),
      selectedSubtopics,
      style: style || 'professional',
      language: language || 'English',
      apiKey: ANTHROPIC_KEY,
    });

    let job = jobId ? loadJob(jobId) : null;
    if (!job) {
      job = createJob({ topic, style, language, videoMode: 'long' });
    }
    const enriched = recordStepUsage({ step: 'brief', topic: topic.trim(), claude: usage });
    patchJob(job.id, {
      status: JOB_STATUS.BRIEF_READY,
      topic,
      style,
      language,
      selectedSubtopics,
      brief,
      briefUsage: enriched,
    });

    res.json({ jobId: job.id, brief, usage: enriched });
  } catch (e) {
    console.error('[Brief]', e);
    res.status(502).json({ error: e.message });
  }
});

// ── /capture-url  (screenshot a live public page) ───────────
app.post('/capture-url', async (req, res) => {
  const { url, sectionId, jobId, sessionId } = req.body;
  const target = url || req.body.whereToGo;

  if (!target) return res.status(400).json({ error: 'Provide a url or whereToGo field' });
  if (!sectionId) return res.status(400).json({ error: 'Provide sectionId' });

  try {
    const saved = await captureUrlScreenshot({
      url: target,
      sectionId,
      jobId,
      sessionId,
    });
    res.json(saved);
  } catch (e) {
    console.error('[CaptureURL]', e);
    res.status(502).json({ error: e.message });
  }
});

// ── /mockup  (generate HTML mockup for one section) ───────────
app.post('/mockup', async (req, res) => {
  const { section, jobId, claudeKey, force } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || claudeKey || '';

  if (!section?.id) return res.status(400).json({ error: 'Provide a section with id' });
  if (!ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });

  try {
    const mockup = await generateSectionMockup({ section, apiKey: ANTHROPIC_KEY, jobId, force: !!force });
    if (mockup.usage) {
      mockup.usage = recordStepUsage({
        step: 'mockup',
        topic: section.title || section.id,
        claude: mockup.usage,
      });
    }
    res.json(mockup);
  } catch (e) {
    console.error('[Mockup]', e);
    res.status(502).json({ error: e.message });
  }
});

// ── /assemble  (Agent 3 — merge brief + media → preview props) ──
// Streams SSE progress when generating AI mockups so the UI isn't "stuck".
app.post('/assemble', async (req, res) => {
  const {
    brief, sectionMedia = {}, format, accentColor, jobId,
    useMockups = false, claudeKey,
  } = req.body;

  if (!brief?.sections?.length) return res.status(400).json({ error: 'Provide a production brief' });

  const stream = !!useMockups;
  const send = (event, data) => {
    if (!stream) return;
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  try {
    let mergedMedia = { ...sectionMedia };
    let mockupUsage = null;

    if (useMockups) {
      const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || claudeKey || '';
      if (!ANTHROPIC_KEY) {
        const err = { error: 'AI mockups need ANTHROPIC_API_KEY in .env' };
        if (stream) { send('error', err); return res.end(); }
        return res.status(400).json(err);
      }
      send('progress', { msg: 'Starting AI mockups…', pct: 2 });
      const result = await ensureMockupsForBrief({
        brief,
        sectionMedia: mergedMedia,
        apiKey: ANTHROPIC_KEY,
        jobId,
        onProgress: (p) => send('progress', p),
      });
      mergedMedia = result.sectionMedia;
      mockupUsage = enrichClaudeUsage(addClaudeCall({}, result.usage));
      if (mockupUsage.totalTokens) {
        recordStepUsage({ step: 'mockups', topic: brief.topic || topic, claude: mockupUsage });
      }
      send('progress', { msg: 'Assembling preview scenes…', pct: 92 });
    }

    const script = briefToScript(brief, mergedMedia);
    if (accentColor) script.accentColor = accentColor;

    const previewProps = {
      ...script,
      scenes: script.scenes.map((s) => ({
        ...s,
        durationSec: capPreviewDurationSec(s),
        audioFile: null,
        wordTimings: null,
      })),
    };

    const videoFormat = format || 'landscape';
    const previewMeta = {
      format: videoFormat,
      durationInFrames: calcPreviewFrames(previewProps.scenes),
      fps: 30,
      width: videoFormat === 'portrait' ? 1080 : 1920,
      height: videoFormat === 'portrait' ? 1920 : 1080,
    };

    if (jobId) {
      patchJob(jobId, {
        status: JOB_STATUS.PREVIEW_READY,
        sectionMedia: mergedMedia,
        previewProps,
        assembledScript: script,
      });
    }

    const payload = { script, previewProps, previewMeta, sectionMedia: mergedMedia, mockupUsage };
    if (stream) {
      send('done', payload);
      return res.end();
    }
    res.json(payload);
  } catch (e) {
    console.error('[Assemble]', e);
    if (stream) {
      send('error', { error: e.message });
      return res.end();
    }
    res.status(502).json({ error: e.message });
  }
});

// ── /jobs/:jobId ──────────────────────────────────────────────
app.get('/jobs/:jobId', (req, res) => {
  const job = loadJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ── /generate  (full pipeline: script + audio + render) ───────
// Accepts either:
//  a) { topic, style, language, accentColor, claudeKey, elevenKey, voiceId, format }
//  b) { script, elevenKey, voiceId, accentColor, format }  (pre-built script)
app.post('/generate', async (req, res) => {
  const {
    topic, style, language, accentColor, claudeKey, elevenKey, voiceId, format,
    script: prebuilt, videoMode, selectedSubtopics, sectionMedia, storyboardSessionId,
    jobId: pipelineJobId, priorClaudeUsage,
  } = req.body;

  const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY  || claudeKey  || '';
  const ELEVEN_KEY     = process.env.ELEVENLABS_API_KEY || elevenKey  || '';
  const VOICE_ID       = voiceId || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
  const isLong         = videoMode === 'long';
  const VIDEO_FORMAT   = isLong ? 'landscape' : (process.env.VIDEO_FORMAT || format || 'portrait');

  if (!prebuilt && !topic) return res.status(400).json({ error: 'Provide topic or script' });
  if (!prebuilt && !ANTHROPIC_KEY) return res.status(400).json({ error: 'No Anthropic API key — add ANTHROPIC_API_KEY to .env' });
  if (!prebuilt && isLong) {
    if (!selectedSubtopics?.length) {
      return res.status(400).json({ error: 'Select at least 1 topic for a long video' });
    }
    if (selectedSubtopics.length > 10) {
      return res.status(400).json({ error: 'Select at most 10 topics for a long video' });
    }
  }

  // SSE
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  try {
    const jobId   = Date.now().toString();
    let claudeAcc = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      requests: 0,
      model: null,
    };
    // Prior steps (outline/brief/mockups) already counted in lifetime via recordStepUsage.
    // Keep them only for "this video" display totals.
    if (priorClaudeUsage) claudeAcc = addClaudeCall(claudeAcc, priorClaudeUsage);
    const usageJob = {
      claude: claudeAcc,
      elevenlabs: { characters: 0, requests: 0 },
      claudeDelta: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        requests: 0,
        model: null,
      },
    };

    // 1 — Script
    let script = prebuilt;
    if (!script) {
      send('progress', { step: 1, pct: 5, msg: isLong
        ? '🤖 Claude is writing your long-form tutorial script...'
        : '🤖 Claude is writing the educational script...' });
      const result = isLong
        ? await generateLongScript({
          topic, selectedSubtopics, style, language, apiKey: ANTHROPIC_KEY, sectionMedia,
        })
        : await generateScript({ topic, style, language, apiKey: ANTHROPIC_KEY });
      script = result.script;
      usageJob.claude = addClaudeCall(usageJob.claude, result.usage);
      usageJob.claudeDelta = addClaudeCall(usageJob.claudeDelta, result.usage);
      if (isLong && sectionMedia) {
        script = mergeStoryboardMedia(script, selectedSubtopics, sectionMedia);
      }
      send('script', script);
      send('progress', { step: 1, pct: 20, msg: `✅ Script ready — ${script.scenes.length} scenes` });
    } else {
      // Prebuilt (preview approve) — re-attach/enrich AI mockups so final render keeps HTML
      if (isLong && sectionMedia && Object.keys(sectionMedia).length) {
        script = mergeStoryboardMedia(script, selectedSubtopics || [], sectionMedia);
      }
      script = enrichScriptMedia(script);
      send('script', script);
      send('progress', { step: 1, pct: 20, msg: `✅ Using provided script — ${script.scenes.length} scenes` });
    }

    // Keep long-form hooks short so demo media appears by ~15–20s (even for older briefs)
    if (isLong && script?.scenes?.length) {
      script.scenes = script.scenes.map((sc) => {
        if (sc.type !== 'hook') return sc;
        const trimmed = trimHookNarration(sc.narration || sc.body || '');
        return {
          ...sc,
          narration: trimmed,
          durationSec: Math.min(sc.durationSec || 45, 20),
        };
      });
    }

    // 2 — Audio
    const audioDir = path.join(OUTPUT_DIR, jobId);
    fs.mkdirSync(audioDir, { recursive: true });

    if (ELEVEN_KEY) {
      const TTS_MODEL = ttsModelForLanguage(language);
      console.log(`[Audio] Using voice: ${VOICE_ID} · model: ${TTS_MODEL} · language: ${language || 'English'}`);
      send('progress', { step: 2, pct: 25, msg: `🎙 Generating ${language || 'English'} voiceover (${TTS_MODEL})...` });
      const QUIZ_PAUSE_SEC = 2.5;

      for (let i = 0; i < script.scenes.length; i++) {
        const sc = script.scenes[i];
        const ap  = path.join(audioDir, `scene_${i}.mp3`);
        try {
          if (sc.type === 'quiz' && (sc.narration || '').includes('[PAUSE]')) {
            const [before, after] = (sc.narration || '').split('[PAUSE]').map((s) => s.trim());
            const qPath = path.join(audioDir, `scene_${i}_q.mp3`);
            const aPath = path.join(audioDir, `scene_${i}_a.mp3`);
            const pausePath = path.join(audioDir, `scene_${i}_pause.m4a`);
            const apM4a = path.join(audioDir, `scene_${i}.m4a`);

            const qResult = await generateAudioWithTimestamps({
              apiKey: ELEVEN_KEY, voiceId: VOICE_ID, text: before, outputPath: qPath, modelId: TTS_MODEL,
            });
            usageJob.elevenlabs.characters += qResult.characters || before.length;
            usageJob.elevenlabs.requests += 1;
            await generateSilence(pausePath, QUIZ_PAUSE_SEC);
            const aResult = await generateAudioWithTimestamps({
              apiKey: ELEVEN_KEY, voiceId: VOICE_ID, text: after, outputPath: aPath, modelId: TTS_MODEL,
            });
            usageJob.elevenlabs.characters += aResult.characters || after.length;
            usageJob.elevenlabs.requests += 1;

            concatAudio([qPath, pausePath, aPath], apM4a);
            const qDur = getAudioDuration(qPath);
            script.scenes[i].audioFile = apM4a;
            script.scenes[i].durationSec = getAudioDuration(apM4a);
            script.scenes[i].answerRevealSec = qDur + QUIZ_PAUSE_SEC;

            const qTimings = qResult.wordTimings || estimateWordTimings(before, qDur);
            const aTimings = (aResult.wordTimings || estimateWordTimings(after, getAudioDuration(aPath)))
              .map((w) => ({ ...w, start: w.start + qDur + QUIZ_PAUSE_SEC, end: w.end + qDur + QUIZ_PAUSE_SEC }));
            script.scenes[i].wordTimings = [...qTimings, ...aTimings];
          } else {
            const result = await generateAudioWithTimestamps({
              apiKey: ELEVEN_KEY, voiceId: VOICE_ID, text: sc.narration || sc.body, outputPath: ap,
              modelId: TTS_MODEL,
            });
            usageJob.elevenlabs.characters += result.characters || (sc.narration || sc.body || '').length;
            usageJob.elevenlabs.requests += 1;
            script.scenes[i].audioFile = ap;
            script.scenes[i].durationSec = getAudioDuration(ap);
            script.scenes[i].wordTimings = result.wordTimings
              || estimateWordTimings(sc.narration || sc.body, script.scenes[i].durationSec);
          }

          if (sc.type === 'demo' && sc.media?.type === 'video') {
            const mediaPath = resolveMediaPath(sc.media.file);
            if (mediaPath && fs.existsSync(mediaPath)) {
              const vidDur = getMediaDuration(mediaPath);
              script.scenes[i].durationSec = Math.max(script.scenes[i].durationSec, vidDur);
            }
          }
        } catch (e) {
          console.warn(`[Audio] Scene ${i} failed:`, e.message);
          script.scenes[i].durationSec = estimateDuration(sc.narration || sc.body, language);
          script.scenes[i].wordTimings = estimateWordTimings(sc.narration || sc.body, script.scenes[i].durationSec);
        }
        const pct = 25 + Math.round((i + 1) / script.scenes.length * 30);
        send('progress', { step: 2, pct, msg: `🎙 Section ${i + 1}/${script.scenes.length} — ${sc.title}` });
      }
    } else {
      send('progress', { step: 2, pct: 55, msg: '🔇 No ElevenLabs key — rendering silent video (add ELEVENLABS_API_KEY to .env)' });
      script.scenes.forEach((sc) => {
        sc.durationSec = estimateDuration(sc.narration || sc.body, language);
        sc.wordTimings = estimateWordTimings(sc.narration || sc.body, sc.durationSec);
        if (sc.type === 'quiz') sc.answerRevealSec = sc.durationSec * 0.65;
        if (sc.type === 'demo' && sc.media?.type === 'video') {
          const mediaPath = resolveMediaPath(sc.media.file);
          if (mediaPath && fs.existsSync(mediaPath)) {
            sc.durationSec = Math.max(sc.durationSec, getMediaDuration(mediaPath));
          }
        }
      });
    }

    // Pass hashtag to render props
    const renderProps = {
      topic: script.topic,
      scenes: script.scenes,
      accentColor: accentColor || script.accentColor || '#7c5cfc',
      hashtag: script.hashtag || `#${(script.topic || topic || 'Learn').replace(/\s+/g, '')}`,
    };

    // 3 — Remotion render
    send('progress', { step: 3, pct: 58, msg: '🎬 Rendering animated video with Remotion...' });
    const outputPath = path.join(OUTPUT_DIR, `${jobId}.mp4`);
    const isPortrait = VIDEO_FORMAT === 'portrait';

    await renderVideo({
      props: renderProps,
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
    const videoUsage = recordVideoUsage({
      jobId,
      topic: script.topic || topic,
      claude: usageJob.claudeDelta, // only new tokens → lifetime
      displayClaude: usageJob.claude, // full pipeline for UI
      elevenlabs: usageJob.elevenlabs,
    });
    const balances = await getUsageSummary({ anthropicKey: ANTHROPIC_KEY, elevenKey: ELEVEN_KEY });

    send('progress', { step: 4, pct: 100, msg: '✅ Video ready!' });
    send('usage', { thisVideo: videoUsage, balances });
    send('done', {
      downloadUrl: `/output/${jobId}.mp4`,
      fileSizeMB:  (size / 1024 / 1024).toFixed(1),
      durationSec: script.scenes.reduce((a, s) => a + (s.durationSec || 6), 0),
      scenes:      script.scenes.length,
      topic:       script.topic,
      hasAudio:    !!ELEVEN_KEY,
      videoMode:   script.videoMode || videoMode || 'short',
      usage:       videoUsage,
      balances,
    });

  } catch (err) {
    console.error('[Generate]', err);
    send('error', { message: err.message });
  }
  res.end();
});

// ── Helpers ───────────────────────────────────────────────────
function resolveMediaPath(file) {
  if (!file) return null;
  if (file.startsWith('/uploads/')) {
    return path.join(UPLOADS_DIR, file.replace(/^\/uploads\//, ''));
  }
  return file;
}

function getAudioDuration(filePath) {
  return getMediaDuration(filePath);
}

function getMediaDuration(filePath) {
  try {
    const out = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`).toString().trim();
    return Math.max(parseFloat(out) || 5, 2);
  } catch { return 5; }
}

function estimateDuration(text = '', language = 'English') {
  // Fallback only (no-TTS mode / TTS failure). Hindi/Marathi TTS runs
  // ~110–130 wpm ≈ 2 words/sec — English was tuned at ~2.5.
  return estimateSpeechDurationSec(text, language, { minSec: 4 });
}

/** Long-form hooks must stay punchy so viewers reach demos quickly. */
function trimHookNarration(text = '', maxWords = 40) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ').replace(/[,:;–—-]+$/, '')}.`;
}

function generateSilence(outputPath, seconds) {
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${seconds} -c:a aac -b:a 96k "${outputPath}"`,
    { stdio: 'ignore' },
  );
}

function concatAudio(files, outputPath) {
  const listPath = outputPath.replace(/\.[^.]+$/, '_list.txt');
  const list = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, list);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a aac -b:a 128k "${outputPath}"`, { stdio: 'ignore' });
  try { fs.unlinkSync(listPath); } catch {}
}

// ── Start ─────────────────────────────────────────────────────
ensurePreviewBundle().catch((e) => console.warn('[Preview] Bundle build skipped:', e.message));

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
