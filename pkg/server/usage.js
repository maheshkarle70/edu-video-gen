// Token / character usage tracking — per video + lifetime ledger
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const MAX_JOBS = 100;

/** Rough Sonnet-class list prices ($ / MTok) for estimates only */
const PRICE = {
  inputPerMTok: 3,
  outputPerMTok: 15,
  cacheWritePerMTok: 3.75, // 1.25× input
  cacheReadPerMTok: 0.3,  // 0.1× input
};

const EMPTY_CLAUDE = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  requests: 0,
};

const EMPTY = {
  lifetime: {
    claude: { ...EMPTY_CLAUDE },
    elevenlabs: { characters: 0, requests: 0 },
  },
  videos: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function normalizeClaudeUsage(usage = {}, model = null) {
  return {
    inputTokens: usage.inputTokens || usage.input_tokens || 0,
    outputTokens: usage.outputTokens || usage.output_tokens || 0,
    cacheCreationTokens: usage.cacheCreationTokens || usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cacheReadTokens || usage.cache_read_input_tokens || 0,
    model: usage.model || model || null,
    requests: usage.requests || 0,
  };
}

export function mergeClaudeUsage(a = {}, b = {}) {
  const A = normalizeClaudeUsage(a);
  const B = normalizeClaudeUsage(b);
  return {
    inputTokens: A.inputTokens + B.inputTokens,
    outputTokens: A.outputTokens + B.outputTokens,
    cacheCreationTokens: A.cacheCreationTokens + B.cacheCreationTokens,
    cacheReadTokens: A.cacheReadTokens + B.cacheReadTokens,
    requests: (A.requests || 0) + (B.requests || 0),
    model: B.model || A.model || null,
  };
}

/** Add one API call's usage into an accumulator (increments request count by 1 if any tokens). */
export function addClaudeCall(acc = {}, call = {}) {
  const A = normalizeClaudeUsage(acc);
  const B = normalizeClaudeUsage(call);
  const hasTokens = B.inputTokens || B.outputTokens || B.cacheCreationTokens || B.cacheReadTokens;
  return {
    inputTokens: A.inputTokens + B.inputTokens,
    outputTokens: A.outputTokens + B.outputTokens,
    cacheCreationTokens: A.cacheCreationTokens + B.cacheCreationTokens,
    cacheReadTokens: A.cacheReadTokens + B.cacheReadTokens,
    requests: A.requests + (hasTokens ? 1 : (B.requests || 0)),
    model: B.model || A.model || null,
  };
}

export function estimateClaudeCostUsd(usage = {}) {
  const u = normalizeClaudeUsage(usage);
  const usd =
    (u.inputTokens / 1e6) * PRICE.inputPerMTok
    + (u.outputTokens / 1e6) * PRICE.outputPerMTok
    + (u.cacheCreationTokens / 1e6) * PRICE.cacheWritePerMTok
    + (u.cacheReadTokens / 1e6) * PRICE.cacheReadPerMTok;
  return Math.round(usd * 10000) / 10000;
}

export function enrichClaudeUsage(usage = {}) {
  const u = normalizeClaudeUsage(usage);
  const totalBilledInput = u.inputTokens + u.cacheCreationTokens + u.cacheReadTokens;
  const totalTokens = totalBilledInput + u.outputTokens;
  const cacheHitRate = totalBilledInput > 0
    ? Math.round((u.cacheReadTokens / totalBilledInput) * 1000) / 10
    : 0;
  return {
    ...u,
    totalTokens,
    cacheHitRate,
    estimatedCostUsd: estimateClaudeCostUsd(u),
    promptCaching: u.cacheCreationTokens > 0 || u.cacheReadTokens > 0
      ? (u.cacheReadTokens > 0 ? 'hit' : 'write')
      : 'off',
  };
}

export function loadLedger() {
  ensureDataDir();
  if (!fs.existsSync(USAGE_FILE)) return structuredClone(EMPTY);
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    const lifeClaude = { ...EMPTY_CLAUDE, ...(data.lifetime?.claude || {}) };
    return {
      ...structuredClone(EMPTY),
      ...data,
      lifetime: {
        claude: lifeClaude,
        elevenlabs: { characters: 0, requests: 0, ...(data.lifetime?.elevenlabs || {}) },
      },
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

function saveLedger(ledger) {
  ensureDataDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(ledger, null, 2));
}

export function recordVideoUsage({ jobId, topic, claude, elevenlabs, displayClaude, steps }) {
  const ledger = loadLedger();
  const delta = enrichClaudeUsage(claude);
  const shown = enrichClaudeUsage(displayClaude || claude);

  const entry = {
    jobId,
    topic: topic || 'Untitled',
    at: new Date().toISOString(),
    kind: 'video',
    claude: shown,
    claudeDelta: delta,
    elevenlabs: {
      characters: elevenlabs?.characters || 0,
      requests: elevenlabs?.requests || 0,
    },
    steps: steps || null,
  };

  ledger.lifetime.claude.inputTokens += delta.inputTokens;
  ledger.lifetime.claude.outputTokens += delta.outputTokens;
  ledger.lifetime.claude.cacheCreationTokens =
    (ledger.lifetime.claude.cacheCreationTokens || 0) + delta.cacheCreationTokens;
  ledger.lifetime.claude.cacheReadTokens =
    (ledger.lifetime.claude.cacheReadTokens || 0) + delta.cacheReadTokens;
  ledger.lifetime.claude.requests += delta.requests || (delta.totalTokens ? 1 : 0);
  ledger.lifetime.elevenlabs.characters += entry.elevenlabs.characters;
  ledger.lifetime.elevenlabs.requests += entry.elevenlabs.requests;

  ledger.videos.unshift(entry);
  if (ledger.videos.length > MAX_JOBS) ledger.videos.length = MAX_JOBS;

  saveLedger(ledger);
  return entry;
}

/** Record a non-render Claude step (outline / brief / metadata) into lifetime + recent list */
export function recordStepUsage({ step, topic, claude }) {
  const ledger = loadLedger();
  const enriched = enrichClaudeUsage(claude);
  if (!enriched.totalTokens && !enriched.cacheCreationTokens && !enriched.cacheReadTokens) {
    return enriched;
  }

  ledger.lifetime.claude.inputTokens += enriched.inputTokens;
  ledger.lifetime.claude.outputTokens += enriched.outputTokens;
  ledger.lifetime.claude.cacheCreationTokens =
    (ledger.lifetime.claude.cacheCreationTokens || 0) + enriched.cacheCreationTokens;
  ledger.lifetime.claude.cacheReadTokens =
    (ledger.lifetime.claude.cacheReadTokens || 0) + enriched.cacheReadTokens;
  ledger.lifetime.claude.requests += 1;

  ledger.videos.unshift({
    jobId: `step-${step}-${Date.now()}`,
    topic: topic || step,
    at: new Date().toISOString(),
    kind: step,
    claude: enriched,
    elevenlabs: { characters: 0, requests: 0 },
  });
  if (ledger.videos.length > MAX_JOBS) ledger.videos.length = MAX_JOBS;
  saveLedger(ledger);
  return enriched;
}

export async function fetchElevenLabsBalance(apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey },
    });
    const data = await res.json();
    if (!res.ok) return { error: data.detail?.message || data.detail || `HTTP ${res.status}` };

    const used = data.character_count ?? 0;
    const limit = data.character_limit ?? 0;
    return {
      tier: data.tier || 'unknown',
      status: data.status || 'unknown',
      charactersUsed: used,
      charactersLimit: limit,
      charactersRemaining: Math.max(0, limit - used),
      percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
      resetUnix: data.next_character_count_reset_unix || null,
    };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getUsageSummary({ anthropicKey, elevenKey }) {
  const ledger = loadLedger();
  const elevenlabs = await fetchElevenLabsBalance(elevenKey);
  const lifeClaude = enrichClaudeUsage(ledger.lifetime.claude);

  return {
    lifetime: {
      claude: lifeClaude,
      elevenlabs: ledger.lifetime.elevenlabs,
    },
    recentVideos: ledger.videos.slice(0, 12).map((v) => ({
      ...v,
      claude: enrichClaudeUsage(v.claude),
    })),
    providers: {
      claude: {
        label: 'Claude (Anthropic)',
        unit: 'tokens',
        lifetime: lifeClaude,
        remaining: null,
        promptCachingEnabled: true,
        note: 'Anthropic API keys are pay-as-you-go — there is no “tokens left” balance. Lifetime totals below are tracked locally. Billing & spend: console.anthropic.com. Prompt caching is enabled on stable system prompts (cache reads ~90% cheaper).',
        pricingNote: `Estimate uses ~$${PRICE.inputPerMTok}/M input, $${PRICE.outputPerMTok}/M output, $${PRICE.cacheReadPerMTok}/M cache read (Sonnet-class).`,
      },
      elevenlabs: {
        label: 'ElevenLabs',
        unit: 'characters',
        lifetime: ledger.lifetime.elevenlabs,
        balance: elevenlabs,
      },
    },
  };
}

export function countCharacters(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().length;
}
