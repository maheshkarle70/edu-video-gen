// Media upload handling for storyboard screenshots & screen recordings
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '../data/uploads');

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function newSessionId() {
  return `sb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMime(mime = '') {
  return String(mime).split(';')[0].trim().toLowerCase();
}

function extForMime(mime) {
  const base = normalizeMime(mime);
  if (base === 'image/png') return '.png';
  if (base === 'image/webp') return '.webp';
  if (base === 'image/gif') return '.gif';
  if (base === 'video/webm') return '.webm';
  if (base === 'video/quicktime') return '.mov';
  if (base === 'video/mp4') return '.mp4';
  return '.jpg';
}

function extForFile(mime, filename = '') {
  const ext = path.extname(filename).toLowerCase();
  if (['.webm', '.mp4', '.mov', '.m4v'].includes(ext)) return ext;
  return extForMime(mime);
}

function mediaType(mime, filename = '') {
  const base = normalizeMime(mime);
  if (IMAGE_TYPES.has(base)) return 'image';
  if (VIDEO_TYPES.has(base)) return 'video';
  if (base === 'application/octet-stream') {
    const ext = path.extname(filename).toLowerCase();
    if (['.webm', '.mp4', '.mov', '.m4v'].includes(ext)) return 'video';
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image';
  }
  return null;
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const sessionId = req.body.sessionId || newSessionId();
    req.body.sessionId = sessionId;
    const dir = path.join(UPLOADS_DIR, sessionId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const sectionId = (req.body.sectionId || 'media').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = extForFile(file.mimetype, file.originalname);
    cb(null, `${sectionId}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter(_req, file, cb) {
    if (!mediaType(file.mimetype, file.originalname)) {
      cb(new Error(`Unsupported file type: ${file.mimetype || 'unknown'} — use PNG, JPG, WebP, MOV, MP4, or WebM`));
      return;
    }
    cb(null, true);
  },
}).single('file');

export function saveUploadedFile(req) {
  const file = req.file;
  if (!file) throw new Error('No file uploaded');

  const type = mediaType(file.mimetype, file.originalname);
  const max = type === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) throw new Error(`File too large (max ${Math.round(max / 1024 / 1024)}MB)`);

  const sessionId = req.body.sessionId;
  const sectionId = req.body.sectionId || 'media';
  const url = `/uploads/${sessionId}/${path.basename(file.path)}`;

  return {
    sessionId,
    sectionId,
    type,
    url,
    filePath: file.path,
    fileName: file.originalname,
    size: file.size,
    caption: req.body.caption || '',
  };
}
