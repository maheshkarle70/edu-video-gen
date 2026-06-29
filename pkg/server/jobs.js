// Pipeline job state — persisted between wizard steps
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_DIR = path.join(__dirname, '../data/jobs');

export const JOB_STATUS = {
  CREATED: 'CREATED',
  OUTLINE_READY: 'OUTLINE_READY',
  TOPICS_SELECTED: 'TOPICS_SELECTED',
  BRIEF_READY: 'BRIEF_READY',
  MEDIA_COMPLETE: 'MEDIA_COMPLETE',
  PREVIEW_READY: 'PREVIEW_READY',
  RENDERING: 'RENDERING',
  DONE: 'DONE',
};

function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
}

export function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadJob(jobId) {
  ensureJobsDir();
  const file = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function saveJob(job) {
  ensureJobsDir();
  job.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job, null, 2));
  return job;
}

export function createJob({ topic, style, language, videoMode = 'long' }) {
  const job = {
    id: createJobId(),
    status: JOB_STATUS.CREATED,
    topic,
    style,
    language,
    videoMode,
    outline: null,
    selectedSubtopics: [],
    brief: null,
    sectionMedia: {},
    previewProps: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveJob(job);
}

export function patchJob(jobId, patch) {
  const job = loadJob(jobId);
  if (!job) return null;
  return saveJob({ ...job, ...patch, id: jobId });
}
