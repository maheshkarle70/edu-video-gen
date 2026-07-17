# Edu Video Gen — Project Context

> **Purpose:** Persistent reference for AI agents and developers.  
> **Last updated:** 2026-06-16 (after long-form pipeline push to `main` @ `53ce6c4`)  
> **Repo:** https://github.com/maheshkarle70/edu-video-gen

---

## What this project is

AI pipeline that generates educational YouTube videos:

**Claude** (script) → **ElevenLabs** (TTS, optional) → **Remotion** (animation) → **MP4**

Two modes in the web UI (`pkg/public/index.html`):

| Mode | Flow |
|------|------|
| **Short** (~45–60s) | One-click Create Video — 6 scenes (Hook, Concept, Fact, Analogy, Quiz, Summary) |
| **Long** (8–10 min target) | 4-step wizard: Plan → Script → Media → Preview → Approve & Render |

---

## How to run

```bash
cd pkg && npm install && npm start
```

- Active server: `pkg/server/index.js` (root `npm start` delegates here)
- Env file: **`pkg/.env`** (gitignored) — `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `VIDEO_FORMAT`, `PORT`
- Remotion Studio (dev): `npm run preview` from repo root
- **Restart server** after backend changes
- **Rebuild preview bundle** after Remotion component changes: `node pkg/server/build-preview.js` (also auto-runs on `npm start` if stale)

---

## Long-form pipeline (4 steps)

### Step 1 — Plan (`POST /outline`)
- Agent 1 (Claude) suggests subtopics from user topic
- User selects sections to include (up to 10; recommended ones pre-selected)
- Soft cap: `MAX_LONG_SUBTOPICS = 10` in `pkg/public/index.html`

### Step 2 — Script (`POST /brief`)
- Agent 2 writes production brief: hook, per-section narration, on-screen text, media capture instructions, sample prompts

### Step 3 — Media
Per-section storyboard panel supports:
- File upload (screenshots, `.mp4`, `.mov`) → `POST /upload` with session from `POST /upload/session`
- In-browser screen recording (WebM)
- **AI HTML mockup** → `POST /mockup` (Claude generates HTML from capture guide)
- **Live URL capture** → `POST /capture-url` (Puppeteer screenshots)

### Step 4 — Preview & Render
- `POST /assemble` — merges brief + uploaded media into Remotion props
- Browser silent preview via Remotion Player (`preview-player.js` bundle)
- `POST /generate` — full TTS + Remotion render
- `GET /jobs/:jobId` — job status polling

---

## Server API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/config` | Public config |
| GET | `/usage` | API usage stats |
| GET | `/voices`, `/voices/search`, `/voices/:voiceId` | ElevenLabs voices |
| POST | `/voices/preview` | Voice preview audio |
| POST | `/proxy/claude` | Claude proxy (short mode) |
| POST | `/upload/session` | Create upload session |
| POST | `/upload` | Multer file upload |
| POST | `/outline` | Long-form topic outline |
| POST | `/brief` | Production brief from outline |
| POST | `/capture-url` | Puppeteer URL screenshots |
| POST | `/mockup` | AI HTML mockup generation |
| POST | `/assemble` | Brief + media → preview props |
| POST | `/generate` | Full render job |
| GET | `/jobs/:jobId` | Job status |

Static: `pkg/public/` (UI, uploads, b-roll, music). Uploads served at `/uploads/...`.

---

## Key server modules (`pkg/server/`)

| File | Role |
|------|------|
| `index.js` | Express app, all routes, SSE short pipeline |
| `claude.js` | Script/outline/brief generation |
| `elevenlabs.js` | TTS |
| `render.js` | Remotion `renderMedia()` |
| `assemble.js` | Brief + media → Remotion scene props; prefers `url` over `filePath` for browser |
| `upload.js` | Multer uploads; MIME normalization (e.g. `video/webm;codecs=vp9`) |
| `transcode.js` | `.mov` → H.264 `.mp4` via ffmpeg (`h264_videotoolbox` on macOS) |
| `mockup.js` | Claude HTML mockup generation |
| `captureUrl.js` | Puppeteer live URL capture |
| `urlContext.js` | Fetch page metadata for mockups |
| `htmlMedia.js` | Parse/embed HTML for Remotion |
| `build-preview.js` | esbuild → `pkg/public/preview-player.js` (gitignored, rebuilt on start) |
| `jobs.js` | Async render job tracking |
| `media.js` | Media staging for render |
| `wordTimings.js` | Karaoke caption word timings |
| `usage.js` | Token/char usage tracking |

---

## Remotion (`src/remotion/`)

### Compositions
- `EduVideo.jsx` — master timeline (short + long)
- `index.jsx` — Remotion entry

### Long-form scene types
- `HookScene.jsx` — opening hook
- `DemoScene.jsx` — media-first layout when section has uploads
- `SectionScene.jsx` — text/visual when no media
- `SummaryScene.jsx` — closing + CTA

### Key components
- `DemoMedia.jsx` — Video (preview) / OffthreadVideo (render); routes to `ScrollingHtmlFrame` for HTML
- `ScrollingHtmlFrame.jsx` — inline HTML via `dangerouslySetInnerHTML`; fixed 8s scroll; CSS animations disabled
- `KaraokeCaptions.jsx` — 4-word karaoke; hidden on summary scene
- `SceneBackground.jsx`, `BackgroundMusic.jsx`, `ExplainerVisual.jsx`, `AnimatedCounter.jsx`

### Utils
- `timeline.js` — `capPreviewDurationSec()`: hook 8s, demo 16s, summary 18s (preview only; full render uses full narration)
- `parseHtml.js` — HTML mockup parsing (fixes truncation issues)
- `broll.js`, `captions.js`, `animations.js`

### Preview client
- `preview-client.jsx` — browser entry; exports `mountPreviewPlayer`
- Bundle: Remotion **4.0.484** (pinned in `pkg/package.json`)
- esbuild `globalName: 'EduPreview'` + footer: `window.mountPreviewPlayer=EduPreview.mountPreviewPlayer`

---

## Bugs fixed (reference for similar issues)

| Symptom | Cause | Fix |
|---------|-------|-----|
| `mountPreviewPlayer is not a function` | Stale IIFE bundle or Remotion version mismatch | Pin Remotion 4.0.484; rebuild preview bundle |
| Uploaded image blank in preview | `filePath` used instead of browser URL | `assemble.js` prefers `url` for `/uploads/...` |
| Screen recording upload failed | MIME `video/webm;codecs=vp9` rejected | Normalize MIME in upload handler |
| `.mov` not in file picker | `accept` too narrow | Added `.mov`, `video/quicktime` |
| HTML mockup blank | iframe + CSS transform; truncated HTML | Inline HTML; fix `parseHtml.js` |
| ~20s gap before demo media | Long hook + scroll tied to full narration | Preview duration caps in `timeline.js` |
| Video white box in Chrome | Mac `.mov` HEVC not playable | Auto-transcode to `.mp4` on upload + assemble |

---

## Git / generated artifacts

**Gitignored:**
- `pkg/.env`, `pkg/data/`
- `pkg/public/preview-player.js` (esbuild output — rebuilt on server start)
- `output/`, `pkg/public/_audio-cache/`, `node_modules/`

**Committed assets:** `pkg/public/broll/*.mp4`, `pkg/public/music/bed.m4a`

---

## Dependencies (pkg/)

- `remotion` + `@remotion/*` pinned to **4.0.484**
- `esbuild`, `puppeteer`, `multer`, `express`, `@anthropic-ai/sdk`
- **ffmpeg** required on deploy host for `.mov` transcoding

---

## Languages & TTS

| Language | Script | ElevenLabs model | Notes |
|----------|--------|------------------|-------|
| English | Latin | `eleven_multilingual_v2` | Default |
| Hindi / Hinglish | Devanagari (+ mix) | `eleven_multilingual_v2` | Fonts via `src/remotion/utils/fonts.js` |
| **Marathi** | Devanagari | **`eleven_v3`** | Not on multilingual_v2 — model auto-selected in `pkg/server/language.js` |
| Tamil | Tamil | `eleven_multilingual_v2` | Listed on v2 |
| Gujarati / Bengali / Telugu / … | Indic | `eleven_v3` | Same v3 path as Marathi |

Helpers live in `pkg/server/language.js` (prompt rules, TTS model, speech-rate estimates, voice preview text).
UI tip + Marathi voice search hint when language changes (`pkg/public/index.html`).
Prefer Indian voices (e.g. Amit Gupta) for Marathi/Hindi audio.

---

## Known limitations / TODOs

1. Long-form allows up to 10 subtopics (`MAX_LONG_SUBTOPICS`)
2. Preview uses capped scene durations; final render uses full hook narration length
3. `preview-player.js` not in git — first `npm start` rebuilds it (~1s)
4. README project structure section is outdated (still shows old flat layout); actual app lives under `pkg/`
5. Marathi audio uses `eleven_v3` (5k char/request limit) — fine for per-scene narration; keep scenes under that limit

---

## Test flow (long mode)

1. Hard refresh browser
2. Long YouTube mode → Steps 1–4
3. Upload media or generate mockup / capture URL
4. Build preview → verify media plays (not white box)
5. Approve & Render → poll job → download MP4

---

## Conversation transcript

Full build/debug session: Cursor agent transcript `333368da-ad92-4db0-b198-63540900f492`
