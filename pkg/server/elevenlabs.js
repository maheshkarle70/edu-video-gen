// server/elevenlabs.js
import https from 'https';
import fs    from 'fs';

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
