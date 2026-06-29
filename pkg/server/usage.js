// Token / character usage tracking — per video + lifetime ledger
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const MAX_JOBS = 100;

const EMPTY = {
  lifetime: {
    claude: { inputTokens: 0, outputTokens: 0, requests: 0 },
    elevenlabs: { characters: 0, requests: 0 },
  },
  videos: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadLedger() {
  ensureDataDir();
  if (!fs.existsSync(USAGE_FILE)) return structuredClone(EMPTY);
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    return { ...structuredClone(EMPTY), ...data, lifetime: { ...EMPTY.lifetime, ...data.lifetime } };
  } catch {
    return structuredClone(EMPTY);
  }
}

function saveLedger(ledger) {
  ensureDataDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(ledger, null, 2));
}

export function recordVideoUsage({ jobId, topic, claude, elevenlabs }) {
  const ledger = loadLedger();

  const entry = {
    jobId,
    topic: topic || 'Untitled',
    at: new Date().toISOString(),
    claude: {
      inputTokens: claude?.inputTokens || 0,
      outputTokens: claude?.outputTokens || 0,
      totalTokens: (claude?.inputTokens || 0) + (claude?.outputTokens || 0),
      model: claude?.model || null,
    },
    elevenlabs: {
      characters: elevenlabs?.characters || 0,
      requests: elevenlabs?.requests || 0,
    },
  };

  ledger.lifetime.claude.inputTokens += entry.claude.inputTokens;
  ledger.lifetime.claude.outputTokens += entry.claude.outputTokens;
  ledger.lifetime.claude.requests += claude?.inputTokens ? 1 : 0;
  ledger.lifetime.elevenlabs.characters += entry.elevenlabs.characters;
  ledger.lifetime.elevenlabs.requests += entry.elevenlabs.requests;

  ledger.videos.unshift(entry);
  if (ledger.videos.length > MAX_JOBS) ledger.videos.length = MAX_JOBS;

  saveLedger(ledger);
  return entry;
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

  return {
    lifetime: ledger.lifetime,
    recentVideos: ledger.videos.slice(0, 10),
    providers: {
      claude: {
        label: 'Claude (Anthropic)',
        unit: 'tokens',
        lifetime: ledger.lifetime.claude,
        remaining: null,
        note: 'Anthropic API keys are pay-as-you-go — no balance endpoint. Track usage here; check billing at console.anthropic.com.',
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
