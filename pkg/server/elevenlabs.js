// server/elevenlabs.js
import https from 'https';
import fs    from 'fs';

function formatVoice(v) {
  const labels = v.labels || {};
  const labelParts = [labels.accent, labels.age, labels.gender, labels.use_case].filter(Boolean);
  const rawDesc = v.description?.trim()
    || (labelParts.length ? labelParts.join(' · ') : '')
    || (v.category ? `${v.category} voice` : 'ElevenLabs voice');

  return {
    id: v.voice_id,
    name: v.name,
    desc: truncate(rawDesc, 72),
    category: v.category || null,
    previewUrl: v.preview_url || null,
  };
}

function truncate(text, max = 72) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export async function searchVoices({ apiKey, query, pageSize = 20 }) {
  const url = new URL('https://api.elevenlabs.io/v2/voices');
  url.searchParams.set('search', query);
  url.searchParams.set('page_size', String(pageSize));

  const res = await fetch(url, { headers: { 'xi-api-key': apiKey } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail?.message || data.detail || `ElevenLabs ${res.status}`);
  }

  return (data.voices || []).map(formatVoice);
}

export async function getVoice({ apiKey, voiceId }) {
  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    headers: { 'xi-api-key': apiKey },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail?.message || data.detail || `ElevenLabs ${res.status}`);
  }
  return formatVoice(data);
}

export function generateAudio({ apiKey, voiceId, text, outputPath }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.52, similarity_boost: 0.82, style: 0.25, use_speaker_boost: true },
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path:     `/v1/text-to-speech/${voiceId}`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'xi-api-key':     apiKey,
        'Accept':         'audio/mpeg',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        let e = '';
        res.on('data', (c) => e += c);
        res.on('end',  () => reject(new Error(`ElevenLabs ${res.statusCode}: ${e.slice(0, 200)}`)));
        return;
      }
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(outputPath); });
      file.on('error',  reject);
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
