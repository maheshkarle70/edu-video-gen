// Transcode uploaded videos to browser-compatible H.264 MP4
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function ffmpegAvailable() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ffmpegCmd(inputPath, outputPath) {
  const inp = JSON.stringify(inputPath);
  const out = JSON.stringify(outputPath);
  if (process.platform === 'darwin') {
    return `ffmpeg -y -i ${inp} -c:v h264_videotoolbox -allow_sw 1 -b:v 5M -an -movflags +faststart ${out}`;
  }
  return `ffmpeg -y -i ${inp} -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart ${out}`;
}

/** Convert .mov / .webm → .mp4 for in-browser Remotion preview */
export function transcodeToMp4(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.mp4') return inputPath;

  if (!ffmpegAvailable()) {
    console.warn('[Upload] ffmpeg not found — .mov may not play in browser preview');
    return inputPath;
  }

  const outputPath = inputPath.replace(/\.[^.]+$/, '.mp4');
  if (outputPath === inputPath) return inputPath;

  console.log(`[Upload] Transcoding ${path.basename(inputPath)} → MP4…`);
  try {
    execSync(ffmpegCmd(inputPath, outputPath), {
      stdio: 'pipe',
      maxBuffer: 80 * 1024 * 1024,
    });
  } catch (e) {
    console.error('[Upload] Transcode failed:', e.message?.slice(0, 200));
    return inputPath;
  }

  if (fs.existsSync(outputPath)) {
    try { fs.unlinkSync(inputPath); } catch {}
    return outputPath;
  }
  return inputPath;
}

/** Ensure video is browser-playable (convert stale .mov uploads) */
export function ensureBrowserVideo(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return filePath;
  if (ext === '.mov' || ext === '.webm') {
    const mp4Path = filePath.replace(/\.[^.]+$/, '.mp4');
    if (fs.existsSync(mp4Path)) return mp4Path;
    return transcodeToMp4(filePath);
  }
  return filePath;
}

export function finalizeVideoUpload(saved) {
  if (saved.type !== 'video') return saved;

  const newPath = transcodeToMp4(saved.filePath);
  if (newPath === saved.filePath) return saved;

  const fileName = path.basename(newPath);
  return {
    ...saved,
    filePath: newPath,
    url: `/uploads/${saved.sessionId}/${fileName}`,
    fileName: saved.fileName.replace(/\.[^.]+$/, '.mp4'),
    transcoded: true,
  };
}

export function enrichVideoMedia(media) {
  if (!media || media.type !== 'video') return media;
  const filePath = ensureBrowserVideo(media.filePath);
  if (filePath === media.filePath) return media;
  const fileName = path.basename(filePath);
  const sessionMatch = media.url?.match(/\/uploads\/([^/]+)\//);
  const sessionId = sessionMatch?.[1] || '';
  return {
    ...media,
    filePath,
    url: sessionId ? `/uploads/${sessionId}/${fileName}` : media.url,
    fileName: media.fileName?.replace(/\.[^.]+$/, '.mp4') || fileName,
    transcoded: true,
  };
}
