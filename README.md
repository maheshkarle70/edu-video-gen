# Edu Video Gen — AI Educational Video Pipeline

Generate animated educational YouTube videos from a single topic.  
**Claude** writes the script → **ElevenLabs** voices it → **Remotion** animates and renders to MP4.

---

## What it produces

A **45–60 second animated MP4** with 6 scenes:

| Scene | Type | What it does |
|-------|------|-------------|
| 1 | **Hook** | Big emoji + punchy title + keyword badge |
| 2 | **Concept** | Main explanation with slide-in animation |
| 3 | **Fact** | Glowing card with surprising fact |
| 4 | **Analogy** | Real-world comparison with quote styling |
| 5 | **Quiz** | Multiple choice — answer reveals at 3.5s |
| 6 | **Summary** | Bullet points + "Like & Follow" CTA |

All scenes have: kinetic typography, particle background, easing animations, progress bar, ElevenLabs voiceover.

---

## Setup

### 1. Install Node.js v18+
https://nodejs.org

### 2. Install dependencies
```bash
cd pkg && npm install
```
This installs Remotion, Express, and all dependencies in `pkg/`.
Remotion will also download a Chromium browser (~170MB) on first render.

### 3. Configure .env
```bash
cp pkg/.env.example pkg/.env   # or create pkg/.env manually
```
Edit **`pkg/.env`** and fill in your keys:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
ELEVENLABS_API_KEY=sk_...         # optional — video renders silent if blank
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
VIDEO_FORMAT=portrait             # portrait (Shorts) or landscape (YouTube)
PORT=4000
```

### 4. Start the server
```bash
cd pkg && npm install

npm start
```
From the repo root — runs `pkg/server/index.js` (the active app).

Or from `pkg/` directly:
```bash
cd pkg && npm start
```

---

## Using the app

### Short video (~60s)
1. Enter your topic (or pick from suggestions)
2. Choose teaching style, language, accent color
3. Click **Create Video**
4. Watch the pipeline run in real time:
   - Claude writes 6 scenes with narration
   - ElevenLabs generates audio per scene
   - Remotion renders animated MP4
5. Download your video

### Long YouTube tutorial (8–10 min) — 4-step pipeline

1. **Plan** — Agent 1 suggests subtopics → select sections  
2. **Script** — Agent 2 (`POST /brief`) writes narration + upload instructions + sample prompts  
3. **Media** — Upload screenshots / recordings per section  
4. **Preview** — Remotion Player silent preview → **Approve & Render** (TTS + MP4)

Short mode still uses one-click **Create Video**.

---

## Preview in Remotion Studio
```bash
npm run preview
```
Opens Remotion's visual editor at http://localhost:3001 so you can tweak scene components live.

---

## Project Structure

```
edu-video-gen/
├── .env                    ← your API keys
├── .env.example            ← template
├── package.json
├── public/
│   └── index.html          ← the web UI
├── server/
│   ├── index.js            ← Express server + SSE pipeline
│   ├── claude.js           ← Script generation (Claude API)
│   ├── elevenlabs.js       ← TTS audio generation
│   └── render.js           ← Remotion renderMedia() call
└── src/
    └── remotion/
        ├── index.jsx           ← Remotion composition entry
        ├── EduVideo.jsx        ← Master timeline component
        ├── components/
        │   ├── ProgressBar.jsx
        │   ├── SceneTransition.jsx
        │   └── Particles.jsx
        ├── scenes/
        │   ├── HookScene.jsx
        │   ├── ConceptScene.jsx
        │   ├── FactScene.jsx
        │   ├── AnalogyScene.jsx
        │   ├── QuizScene.jsx
        │   └── SummaryScene.jsx
        └── utils/
            └── animations.js
```

---

## API Keys

| Key | Where to get | Required? |
|-----|-------------|-----------|
| `ANTHROPIC_API_KEY` | console.anthropic.com/settings/keys | ✅ Yes |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Keys | Optional |

ElevenLabs free tier: 10,000 chars/month (~25 short videos).  
Without it, the video renders with silence — add your own voiceover in CapCut.

---

## Languages supported
English, Hindi, Hinglish, **Marathi** (Devanagari + ElevenLabs `eleven_v3` audio), Tamil, Telugu, Spanish, French (and any language Claude supports).
Marathi is not on `eleven_multilingual_v2` — the server auto-selects `eleven_v3` when Marathi is chosen.

## Output specs
- **Format**: MP4 (H.264 + AAC)
- **Portrait**: 1080×1920 @ 30fps (YouTube Shorts / Instagram Reels)
- **Landscape**: 1920×1080 @ 30fps (Standard YouTube)
- **Duration**: ~45–60 seconds
- **Render time**: 3–8 minutes on a modern laptop
