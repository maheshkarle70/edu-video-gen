# Figma UI Redesign Prompt — Edu Video Gen

> Copy everything below the line into Figma Make / give to a product designer.
> Goal: produce implementable mockups for a full UI redesign of the Edu Video Gen web app.

---

## Product brief

Design a complete UI system for **Edu Video Gen** — a web app that turns a teaching topic into an animated educational YouTube video using AI (script) + voiceover (TTS) + Remotion animation.

**Brand / product name:** Edu Video Gen (hero-level brand on first viewport; not just a small nav label).

**Primary users:** Educators, YouTube creators, EdTech builders, and indie teachers who want Shorts or long tutorials without a video editor.

**Core value prop:** Topic in → polished MP4 out → publish-ready metadata. Short videos in one click; long tutorials via a guided 4-step wizard.

**Tone:** Clear, confident, creator-tool — not a generic SaaS dashboard. Feels like a focused production studio for lessons.

**Current pain (redesign drivers):**
- Dense dark control panel with too many competing sections
- Short vs long modes share one cramped left column
- Long-form wizard steps feel buried
- Storyboard / media capture UI is hard to scan
- Preview, progress, result, and publish metadata compete in the right panel
- Usage / token visibility is buried in Advanced
- No account layer yet — drafts are browser-only; auth is a planned addition
- Mobile is an afterthought (single-column collapse only)

**Recently shipped (must reflect in designs):**
- **Draft auto-save** — work persists across page refresh (local browser storage)
- **Publish metadata** — after render: YouTube title, description, tags, hashtags (AI-generated, editable, copy-to-clipboard)
- **Token & usage tracking** — lifetime + session + per-video Claude tokens, cache read/write, est. cost; ElevenLabs chars remaining
- **Prompt caching** — enabled on Claude system prompts (cache hit/write shown in usage UI)

**Planned (design now, implement later):**
- **User registration & login** — email/password or OAuth
- **User profile** — identity, preferences, usage history, optional API keys
- **Cloud drafts** (future) — sync drafts across devices when logged in

---

## Design system requirements

### Viewports (must design all)
| Breakpoint | Width | Layout intent |
|------------|-------|----------------|
| **Desktop** | 1440px | Primary: two-pane creator layout |
| **Laptop** | 1280px | Same structure, tighter density |
| **Tablet** | 768px | Stacked or collapsible controls; preview still primary |
| **Mobile** | 390px | Single-column, step-by-step; sticky primary CTA |

Also provide:
- **Light + dark themes** (or one strong theme with clear tokens if only one — prefer dark studio + optional light)
- **Design tokens:** colors, type scale, spacing (4/8), radii, elevation, focus rings, success/warn/error
- **Component inventory** (see below) as a reusable Figma library

### Typography
- Expressive display for brand + empty states
- Readable UI sans for controls
- Mono for technical meta (usage, logs, durations, token counts) — sparingly
- Avoid default Inter/Roboto/Arial as the hero voice

### Visual direction
- One clear composition per primary screen (not a metric dashboard)
- Atmosphere via subtle gradients/texture — not flat purple-on-white cliché
- Cards only where they contain a real interaction (topic pick, voice pick, storyboard row, result download, publish fields)
- Motion notes: step transitions, progress pulse, preview mount, draft-restore slide-in, copy-success flash, success confetti-lite (document as annotations)

### Accessibility
- WCAG AA contrast for text/icons
- Visible focus states
- Touch targets ≥ 44px on mobile
- Don’t rely on color alone for status (media attached / missing / draft saved)

---

## Information architecture

### Global chrome (authenticated app)
1. **Brand** — Edu Video Gen (links to creator home)
2. **User menu** — avatar + name → Profile, Usage & tokens, Sign out (or **Sign in / Sign up** when logged out)
3. **Server / readiness status** — connected / offline / silent-render (no TTS key)
4. **Draft hint** — “Progress auto-saves in this browser” + last-saved time
5. **API usage strip** — compact: lifetime tokens, est. spend, session tokens, ElevenLabs remaining (tap/click → full Usage screen)
6. **Draft restore banner** — appears when a saved draft is detected on load (Dismiss / Discard)
7. **Primary workspace** — controls + output
8. **Advanced drawer** — script scene list, activity log (collapsed by default); usage detail may move to dedicated screen

### Global chrome (unauthenticated — marketing + auth entry)
- Same brand; CTA: Sign in / Get started
- Creator UI visible in preview/demo mode or gated behind login (design both: soft gate vs hard gate)

### Modes
- **Short video** (~45–60s Shorts / Reels)
- **Long YouTube tutorial** (~8–10 min, multi-section)

Shared settings (both modes):
- Topic
- Language (English, Hindi, Hinglish, Marathi, Tamil, Telugu, Gujarati, Bengali, Spanish, French, German…)
- Narrator voice (grid + search + Test preview)
- Format: Portrait (Shorts) vs Landscape (YouTube)
- Accent color

Short-only:
- Teaching style: Engaging / Simple / Professional / Storytelling

Long-only:
- 4-step wizard: Plan → Script → Media → Preview
- Section multi-select (up to 10)
- Storyboard media per section
- Silent Remotion preview before Approve & Render

### Post-render (both modes)
- Download MP4 + inline player
- **Publish metadata** panel: title, alt titles, description, tags, hashtags — AI-generated, editable, per-field Copy + Copy all + Regenerate

---

## User journeys to design (end-to-end)

### Journey A — Short video (happy path)
1. Land on app (empty state or draft restored)
2. Choose **Short**
3. Enter topic (or pick suggestion chip)
4. Set style, language, voice (optional Test), format, accent
5. Click **Create Video**
6. See progress: Writing lesson → Recording voiceover → Building video → Finishing
7. Result: download MP4 + inline video player
8. **Publish metadata** auto-generates; user edits and copies for YouTube
9. Expand Advanced: inspect script scenes

**Edge / alternate states for A:**
- Server offline
- Missing Anthropic key
- No ElevenLabs key → silent video warning
- Voice search empty / error
- Generate failure with retry
- Re-run with new topic after success

### Journey B — Long tutorial (happy path)
1. Choose **Long YouTube**
2. **Step 1 · Plan** — enter topic → Suggest topics from Claude → select recommended / all / clear → see duration + TTS char estimate → Next
3. **Step 2 · Script** — Generate narration & upload guide → review hook + per-section narration, capture steps, sample prompts → Next (or regenerate)
4. **Step 3 · Media** — for each section: follow capture guide; attach via Screenshot / Upload video / Screen record / Capture live URL / AI mockup; caption; remove media → Next
5. **Step 4 · Preview** — optional “Use AI HTML mockups for empty sections” → Build preview (with live progress if mockups) → scrub silent Remotion player → **Approve & Render**
6. Progress (TTS + Remotion) → download long MP4
7. **Publish metadata** with timestamps in description (long videos)

**Edge / alternate states for B:**
- Outline loading / failed (truncated → suggest fewer topics)
- No sections selected (blocked Next)
- Brief generating / failed / regenerate
- Storyboard row: missing media (warn) vs has media (success)
- Screen recording in progress / stop
- Live URL capture: no URL in guide / capturing / success / fail
- AI mockup generating / success / fail / incomplete
- Preview building with mockup progress (2/7…)
- Preview player error
- Approve blocked until preview exists
- Render failure mid-job

### Journey C — Voice & language setup
1. Change language → hint for Indic voices / TTS model appears
2. Browse static voice grid → select
3. Search more voices → select from results
4. Test voice → hear language-aware preview clip
5. Proceed to generate

### Journey D — Draft auto-save & restore
1. User works on topic, wizard steps, script, media — **auto-saves** debounced (~450ms) to browser storage
2. Persistent hint: “Draft saved 2:34 PM · survives refresh”
3. User refreshes or returns later → **Draft restored** banner: “Draft restored (date/time). Continue where you left off.”
4. Actions: **Dismiss** (hide banner, keep draft) / **Discard** (confirm → clear draft, fresh start)
5. Restored state includes: topic, language, style, format, accent, voice, short/long mode, wizard step, outline, selected topics, brief, script, media URLs, preview props, publish metadata if any
6. **Limitation to communicate in UI:** drafts are per-browser; media files must still exist on server (`/uploads`, `/mockups`) — show gentle warning if media missing after restore

**Edge states:**
- Empty session (no topic) → no draft saved
- localStorage quota exceeded → silent trim of heavy preview data (design “draft partially restored” state)
- Draft + logged-in user (future): “Saved locally — Sign in to sync across devices” upsell

### Journey E — Usage & tokens (full screen)
1. From usage strip or profile → open **Usage & tokens**
2. See **Lifetime** Claude: input / output / cache write / cache read / total tokens / est. spend / request count
3. See **This session** token total (outline + brief + mockups + render + metadata in current browser session)
4. See **ElevenLabs**: lifetime chars used, plan tier, chars used/limit, **remaining** with meter (ok / warn / crit)
5. **This video** (when navigated from result): full breakdown — input, output, cache read %, cache write, prompt caching status (`off` / `write` / `hit`), est. cost, ElevenLabs chars
6. **Recent activity** list: last ~6 jobs — kind (outline / brief / mockup / video / metadata) · topic · tokens · est. cost
7. Footnote: Claude is pay-as-you-go — **no “tokens remaining” balance**; link to Anthropic console for billing. Prompt caching reduces cost on repeat calls (~90% cheaper cache reads).

### Journey F — Publish metadata (post-render)
1. Video completes → result card shows download + player
2. Below: **Publish metadata** card auto-starts AI generation
3. Fields: Title (with clickable alt title chips), Description (textarea), Tags (comma input + chip preview), Hashtags
4. Per-field **Copy** button (shows “Copied” flash)
5. **Copy all** — formatted block for clipboard
6. **Generate with AI** — regenerate metadata
7. Status line: Generating… / Ready — edit and copy into YouTube Studio / error state

### Journey G — Registration
1. Land on **Sign up** (from marketing or gated CTA)
2. Fields: Full name, Email, Password, Confirm password (or OAuth: Google / GitHub)
3. Optional: “I agree to Terms & Privacy”
4. Submit → success → redirect to creator with welcome toast
5. Errors: email taken, weak password, network failure

### Journey H — Login
1. **Sign in** — Email + Password (or OAuth)
2. “Forgot password?” link → reset flow (email sent confirmation screen)
3. “Don’t have an account? Sign up”
4. Remember me (optional)
5. Success → creator home; if local draft exists → offer merge: “Restore local draft?” vs “Use cloud only”

### Journey I — User profile
1. Open from avatar menu → **Profile**
2. Sections:
   - **Identity** — avatar upload, display name, email (verified badge), change password
   - **Creator defaults** — preferred language, voice, style, accent color (pre-fill new projects)
   - **API keys** (optional advanced) — bring-your-own Anthropic / ElevenLabs keys vs platform keys
   - **Usage summary** — link to full Usage & tokens screen
   - **Drafts** — local draft status + future “Cloud drafts” placeholder
   - **Danger zone** — delete account
3. Save changes / Cancel

### Journey J — Mobile creator
1. Same journeys A–I but single column
2. Sticky bottom CTA
3. Wizard as full-screen steps
4. Preview full-bleed; controls in bottom sheet or next screen
5. Usage & profile as full-screen pages from menu

---

## Screens & frames checklist (produce these in Figma)

### Auth & account (new)
| # | Frame | Notes |
|---|-------|-------|
| 23 | Sign up | Desktop + mobile |
| 24 | Sign in | Desktop + mobile |
| 25 | Forgot password | Email sent confirmation |
| 26 | User profile | Identity + defaults + links |
| 27 | Logged-out app shell | Sign in / Get started in header |

### Draft (new)
| # | Frame | Notes |
|---|-------|-------|
| 28 | Draft hint (idle) | “Progress auto-saves…” + timestamp |
| 29 | Draft restored banner | Green bar, Dismiss / Discard |
| 30 | Draft restore — partial | Media missing warning after restore |
| 31 | Discard draft confirm | Modal |

### Usage & tokens (new — dedicated screen)
| # | Frame | Notes |
|---|-------|-------|
| 32 | Usage & tokens · Overview | Lifetime + session + ElevenLabs meter |
| 33 | Usage · This video detail | Input/output/cache/cost breakdown |
| 34 | Usage · Recent activity | List of outline/brief/mockup/video rows |
| 35 | Usage strip · Compact | In-app header variant |

### Publish metadata (new)
| # | Frame | Notes |
|---|-------|-------|
| 36 | Publish metadata · Generating | Loading state under result |
| 37 | Publish metadata · Ready | All fields filled, copy buttons |
| 38 | Publish metadata · Error | Regenerate CTA |

### Existing creator screens (update numbering context)
| # | Frame | Notes |
|---|-------|-------|
| 01 | Marketing / first open | Optional; include auth CTAs |
| 02 | App shell · Short · Empty | + draft hint + usage strip + user menu |
| 03 | App shell · Short · Ready | |
| 04 | Short · Generating | |
| 05 | Short · Success / result | + publish metadata card + usage snippet |
| 06 | Short · Error | |
| 07–15 | Long wizard steps 1–4, loading, preview, render, success | As before |
| 16 | Advanced panel open | Script + activity log (usage may link out) |
| 17 | Voice picker expanded | |
| 18 | Offline / disconnected | |
| 19 | Tablet 768 adaptation | |
| 20 | Mobile · Short (empty / generating / result) | |
| 21 | Mobile · Long wizard 1–4 | |
| 22 | Component library | See expanded variants below |

---

## Key interactive components (specify variants)

| Component | Variants |
|-----------|----------|
| Mode toggle | Short / Long · selected |
| Wizard pills | idle / active / done |
| Topic item | off / on / recommended |
| Storyboard row | missing / has-image / has-video / has-html / recording |
| Media action buttons | default / primary / danger / disabled / recording |
| Voice card | default / selected |
| Primary CTA | Create Video / Approve & Render / Rebuild preview · loading · disabled |
| Progress | active / done / error |
| Usage meter | ok / warn / crit |
| Status dot | connecting / ok / err |
| Language hint | hidden / Indic tip |
| Preview player chrome | idle / loading / playing / error |
| **Draft bar** | hidden / restored / dismissed |
| **Draft hint** | idle / saved-with-time |
| **Publish field** | empty / filled / generating / error |
| **Copy button** | default / copied-ok |
| **Alt title chip** | default / hover / selected |
| **Tag chip** | default |
| **Usage row** | label + value (mono) |
| **Recent job row** | outline / brief / mockup / video / metadata |
| **Cache badge** | off / write / hit |
| **Auth input** | default / focus / error / disabled |
| **OAuth button** | Google / GitHub |
| **User avatar menu** | closed / open |
| **Profile section** | collapsed / expanded |

---

## Usage & tokens — data model for designers

Design labels and layout for these fields (do not invent fake “tokens remaining” for Claude):

### Claude (Anthropic)
| Field | Meaning |
|-------|---------|
| Input tokens | Non-cached input processed |
| Output tokens | Model response tokens |
| Cache write | Tokens written to prompt cache (first call) |
| Cache read | Tokens read from cache (~90% cheaper) |
| Total tokens | Sum of billed input paths + output |
| Cache hit rate | % of input from cache reads |
| Est. cost | Rough USD estimate (Sonnet-class pricing) |
| Prompt caching | `off` / `write` / `hit` |
| Requests | API call count |

### ElevenLabs
| Field | Meaning |
|-------|---------|
| Characters used (lifetime) | Running total in this install |
| Characters used / limit | Plan quota |
| **Characters remaining** | Only provider with a real “left” balance |
| Plan tier | e.g. free / starter / creator |
| Meter | ok (<75%) / warn (75–90%) / crit (>90%) |

### Scope labels
- **Lifetime** — persisted server-side for this app instance
- **This session** — current browser tab/session only
- **This video** — full pipeline: outline + brief + mockups + render + metadata

---

## Draft — data model for designers

What auto-saves (show in “Draft details” tooltip or profile for transparency):

- Topic, language, format, style, accent color, voice
- Short vs long mode, wizard step (1–4)
- Outline + selected subtopics
- Production brief + assembled script
- Section media references (URLs, not raw files)
- Preview player props
- Publish metadata (if generated)
- AI mockups toggle
- Last saved timestamp

Actions: auto-save (implicit), Dismiss banner, Discard draft (confirm).

---

## Publish metadata — field spec

| Field | Type | Notes |
|-------|------|-------|
| Title | Single line, max ~100 chars | Primary YouTube title |
| Title options | Chips below title | Click to swap primary |
| Description | Multiline | Long videos include timestamps section |
| Tags | Comma-separated + chips | 8–15 searchable tags |
| Hashtags | Space-separated | Include `#` |
| Generate with AI | Primary button | Regenerate all |
| Copy all | Secondary | Clipboard-friendly block |

---

## Auth — field spec (planned)

### Sign up
- Full name, Email, Password, Confirm password
- Terms checkbox
- OAuth alternatives

### Sign in
- Email, Password
- Forgot password, Sign up link

### Profile
- Avatar, Display name, Email (read-only or change-with-verify)
- Default language, voice, style, accent
- Optional API key fields (masked)
- Link to Usage & tokens
- Sign out, Delete account

---

## Content & copy guidelines for mockups

Use realistic placeholder content:
- Topic examples: “Neural networks explained”, “MahaTET exam guide”, “Getting started with Claude”
- Languages: show Hindi/Marathi in language dropdown samples
- Progress strings: “Writing your lesson…”, “Recording voiceover…”, “Building your video…”
- Result: “Video ready · 58s · 1080×1920”
- Draft: “Draft saved 2:34 PM · survives refresh”
- Usage: “Claude (lifetime) 142,380 tok · Est. $0.42 · Cache reads 38,200 tok”
- Publish title: “Supervised vs Unsupervised Learning — Explained in 8 Minutes”

Annotate:
- What is AI-generated vs user-uploaded
- Difference: **Capture live URL** = real screenshot; **AI mockup** = reconstructed UI (not live site)
- Claude has no token balance — only ElevenLabs shows “remaining”
- Drafts are local-first until cloud sync ships

---

## Output deliverables expected from Figma

1. **Page: Flows** — user journey maps (A–J) with arrows  
2. **Page: Auth** — sign up, sign in, forgot password, profile  
3. **Page: Desktop screens** — all numbered frames at 1440  
4. **Page: Usage & tokens** — overview, detail, recent activity  
5. **Page: Publish** — post-render metadata states  
6. **Page: Draft** — hint, restore banner, discard confirm  
7. **Page: Responsive** — 768 + 390 for critical paths  
8. **Page: Components** — auto-layout components with variants  
9. **Page: Tokens** — color/type/spacing styles  
10. **Dev handoff notes** — spacing, states, which screen maps to Short vs Long wizard step  
11. **Page: Prototype** — clickable flows (see Prototype specification below)  
12. **Prototype file** — Figma Prototype mode with 3 demo paths + mobile variants  

---

## Additional screens to add (recommended)

These are not yet in the checklist but will make the product feel complete and prototype-ready.

### Library & history
| # | Screen | Why |
|---|--------|-----|
| 39 | **My videos** — grid/list of past renders | Users return to re-download or republish; today only “recent” in usage |
| 40 | Video detail | Thumbnail, duration, topic, download again, view publish metadata, re-open usage |
| 41 | Empty library | “No videos yet — create your first” CTA |
| 42 | **My drafts** (logged in, future) | Cloud drafts list; local draft badge |

### Onboarding & help
| # | Screen | Why |
|---|--------|-----|
| 43 | First-run welcome (3 slides) | Short vs Long, media tips, publish step |
| 44 | Empty state · Short | Illustrated hero + example topics |
| 45 | Empty state · Long Step 1 | “Suggest topics to start” |
| 46 | Help / FAQ sheet | AI mockup vs live URL, draft limits, token costs |
| 47 | Keyboard shortcuts overlay | Power users (optional) |

### Settings & account (beyond profile)
| # | Screen | Why |
|---|--------|-----|
| 48 | Settings hub | Profile, Usage, API keys, Notifications, Appearance |
| 49 | API keys (BYOK) | Masked keys, test connection, platform vs own keys |
| 50 | Notifications prefs | Email when render completes (future) |
| 51 | Appearance | Dark / light / system |
| 52 | Verify email | Post-signup |
| 53 | Reset password | New password form (not just “email sent”) |

### Creator workflow depth
| # | Screen | Why |
|---|--------|-----|
| 54 | Topic outline · failed | Truncated error + “Try 5–7 topics” |
| 55 | Brief · failed | Same pattern |
| 56 | Storyboard · bulk actions | “Generate all AI mockups” progress modal |
| 57 | Preview · fullscreen | Cinematic preview without chrome |
| 58 | Render · background tab hint | “You can leave this tab…” (SSE still runs) |
| 59 | Publish · platform picker | YouTube / Shorts / Instagram / LinkedIn copy hints |
| 60 | Share sheet | Copy link, download, open YouTube Studio (external) |

### System & trust
| # | Screen | Why |
|---|--------|-----|
| 61 | Toast / snackbar variants | Saved, copied, error, offline |
| 62 | Confirm modals | Discard draft, delete account, overwrite media |
| 63 | Loading skeletons | Outline list, brief cards, storyboard rows |
| 64 | 404 / maintenance | Rare but professional |
| 65 | Terms & Privacy | Linked from sign up |

### Marketing (if public landing)
| # | Screen | Why |
|---|--------|-----|
| 66 | Landing page | Hero, how it works, pricing teaser, CTA |
| 67 | Pricing | Free vs Pro (videos/month, token allowance) |
| 68 | About / How it works | For educators |

**Priority for v1 prototype:** 39–41 (library), 43–44 (onboarding), 48–49 (settings), 54–56 (errors), 61–62 (system), 66 (landing if public).

---

## Prototype specification (build this in Figma)

Yes — you should create a **proper clickable Figma prototype**, not just static frames. Use **Figma Prototype** tab with the flows below. Target **~25–35 connected frames** for a convincing demo; use overlays for modals.

### Prototype setup
- **Starting frame:** Landing (66) OR App shell Short empty (02) OR Sign in (24)
- **Device:** Desktop 1440 default; duplicate key path on Mobile 390
- **Interaction style:** Smart animate 200–300ms for wizard steps; dissolve for modals; instant for toggles
- **Overlays:** Discard draft (31), Help (46), User menu, Voice search results, Fullscreen preview (57)
- **Sticky elements:** Header (brand, status, usage strip, avatar) across creator frames

### Flow 1 — Short video (primary demo) · ~12 clicks
```
Landing (66) → Sign in (24) → [Login] → Short empty (02)
  → fill topic → Short ready (03) → Create Video (04 progress)
  → Success (05) + Publish generating (36) → Publish ready (37)
  → [Copy all] toast (61) → Usage overview (32)
```
**Prototype notes:**
- Progress (04): use **After delay 2s** → auto-advance OR tap “Skip” hotspot for demo speed
- Publish (36→37): delay 1.5s then smart animate to ready state
- Usage strip on (05) → click opens (32)

### Flow 2 — Long tutorial + draft restore · ~18 clicks
```
App shell → Long mode → Step 1 Plan (07) → [Suggest topics] loading (08) → topics selected
  → Next → Step 2 Script (09) → [Generate] loading (10) → brief visible
  → Next → Step 3 Media (11) → attach screenshot on one row → AI mockup loading on another
  → Next → Step 4 Preview (12) → [Build preview] progress (13) → preview playing (12)
  → Approve & Render (14) → Success (15) + Publish (37)

Parallel branch — Draft:
  Refresh simulation → Draft restored banner (29) → [Dismiss] → same Step 3 (11)
  OR [Discard] → modal (31) → confirm → Short empty (02)
```

### Flow 3 — Auth + profile · ~8 clicks
```
Logged-out shell (27) → Sign up (23) → Verify email (52) → Creator home (02)
  → Avatar menu → Profile (26) → Usage link → Usage overview (32)
  → Back → Settings hub (48) → API keys (49)
```

### Flow 4 — Error & recovery · ~6 clicks
```
Long Step 1 → Outline failed (54) → reduce selection → retry → success (07)
OR Brief failed (55) → regenerate → Step 3
OR Render error (06 variant) → Retry → progress (14)
```

### Hotspot map (minimum)

| Screen | Hotspot | Goes to |
|--------|---------|---------|
| Mode toggle Short/Long | toggle | 02 / 07 |
| Wizard pills 1–4 | click | respective step frames |
| Next / Back | buttons | adjacent wizard step |
| Suggest topics | button | 08 → 07 |
| Generate script | button | 10 → 09 |
| Storyboard AI mockup | button | row loading state → row with thumb |
| Build preview | button | 13 → 12 |
| Approve & Render | button | 14 → 15 |
| Usage strip | click | 32 |
| Avatar | click | menu overlay → 26 / 32 / Sign out → 27 |
| Draft Discard | click | 31 → confirm → 02 |
| Copy all (publish) | click | toast 61 (overlay) |
| My videos (nav) | click | 39 |

### Motion annotations (for dev handoff)
| Transition | Spec |
|------------|------|
| Wizard step change | Slide left/right 24px + fade, 250ms ease-out |
| Draft banner enter | Slide down from top, 200ms |
| Progress bar | Width animate 0→100% over 3s (demo) |
| Copy success | Button text “Copy” → “Copied” 1.2s, green border flash |
| Toast | Slide up from bottom, 3s auto-dismiss |
| Modal | Scale 0.96→1 + backdrop fade 150ms |

### Prototype demo script (for stakeholders)
1. **90 sec — Short:** “Topic in → video out → copy YouTube metadata” (Flow 1)
2. **3 min — Long:** “Plan 8 topics → script → upload demo → preview → render” (Flow 2)
3. **30 sec — Trust:** “Draft survived refresh” + “Usage shows tokens and cost” (Flow 2 branch + 32)

### What NOT to prototype in Figma
- Real Remotion playback (use static poster + play icon)
- Real SSE progress (use timed frame sequence)
- Real voice audio (use “playing” state on voice card)
- File picker (use “file attached” state transition)

### Alternative: interactive HTML prototype
If you need a **browser demo** before Figma is done, a lightweight `docs/prototype/` HTML click-through (wireframe CSS, no backend) can mirror Flows 1–2. The production app in `pkg/public/index.html` is already a working prototype for engineering — Figma prototype is for **design review and stakeholder demos**.

---

## Constraints for implementation later

- Today: single-page web app (no multi-route), but design may use distinct step screens on mobile  
- Auth routes planned: `/login`, `/register`, `/profile`, `/usage` (or modals/sheets)  
- Drafts: `localStorage` today; cloud sync when auth exists  
- Must support Remotion Player embed in Preview  
- Must support SSE-style live progress (streaming status text)  
- File inputs: images + `.mov` / `.mp4` / `.webm`  
- Do not design a separate admin console — creator tool + user account only  

---

## Design quality bar

- Brand first: first viewport still reads as Edu Video Gen if nav labels were removed  
- One job per section  
- Reduce clutter: no pill soup, no fake stats strips in hero  
- Long wizard should feel like a production pipeline, Short like a fast create form  
- Preview should feel cinematic (dark stage), controls should feel precise  
- Usage screen should feel trustworthy and legible — not alarming; explain pay-as-you-go honestly  
- Auth should feel lightweight — creators want to make videos, not fill forms  
- Publish metadata should feel like a bonus step, not homework  

---

## Prompt one-liner (if character-limited)

> Redesign Edu Video Gen, an AI educational video studio: Short one-click ~60s videos and Long 4-step YouTube tutorials (Plan → Script → Media → Preview → Render). Include draft auto-save/restore, post-render publish metadata (YouTube title/description/tags), full Usage & tokens screen (Claude lifetime/session/video + cache + est. cost, ElevenLabs remaining), and planned auth (sign up, sign in, profile). Design desktop 1440, tablet 768, mobile 390; full happy paths + loading/error/empty; storyboard media rows; Remotion preview; voice/language settings; component library + tokens. Brand-forward, creator-tool aesthetic, accessible, implementable for a single-page web app evolving into authenticated SaaS.
