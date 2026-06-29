// Agent 3 — assemble production brief + media into Remotion preview props
import { enrichHtmlMedia } from './htmlMedia.js';
import { enrichVideoMedia } from './transcode.js';

export function briefToScript(brief, sectionMedia = {}) {
  const sections = brief.sections || [];
  const sectionCount = sections.length;
  const scenes = [];

  const hook = brief.hook || {};
  scenes.push({
    id: 1,
    type: 'hook',
    hookStat: hook.hookStat || hook.title,
    title: hook.title,
    body: hook.body,
    narration: hook.narration,
    emoji: hook.emoji || '🎬',
    keyword: hook.keyword,
    bgColor: hook.bgColor || '#080a12',
    brollTag: hook.brollTag || 'tech',
    durationSec: hook.durationSec || estimateFromText(hook.narration, 50),
  });

  sections.forEach((sec, i) => {
    const media = sectionMedia[sec.id];
    const hasMedia = !!media?.filePath || !!media?.url;
    const scene = {
      id: i + 2,
      chapter: i + 1,
      chapterTotal: sectionCount,
      subtopic: sec.subtopic || sec.title,
      title: sec.title,
      body: sec.onScreenText || sec.body || '',
      narration: sec.narration,
      keyword: sec.keyword,
      emoji: sec.emoji || '📌',
      bgColor: sec.bgColor || '#0a0f1a',
      brollTag: sec.brollTag || 'tech',
      durationSec: sec.durationSec || estimateFromText(sec.narration, 65),
      type: hasMedia ? 'demo' : 'section',
    };

    if (hasMedia) {
      const enriched = enrichVideoMedia(enrichHtmlMedia(media));
      scene.media = {
        type: enriched.type,
        url: enriched.url,
        filePath: enriched.filePath,
        file: enriched.url || enriched.filePath,
        caption: enriched.caption || sec.mediaBrief?.whatToCapture || '',
        generated: !!enriched.generated,
        htmlContent: enriched.htmlContent,
        htmlStyles: enriched.htmlStyles,
      };
    } else if (sec.visual?.steps?.length) {
      scene.visual = sec.visual;
    }

    scenes.push(scene);
  });

  const summary = brief.summary || {};
  scenes.push({
    id: sectionCount + 2,
    type: 'summary',
    title: summary.title || 'What You Learned',
    body: summary.body,
    narration: summary.narration,
    keyword: summary.keyword || 'KEY TAKEAWAY',
    cta: summary.cta || 'Follow & Subscribe for More',
    emoji: summary.emoji || '💡',
    bgColor: summary.bgColor || '#0a0a1a',
    brollTag: summary.brollTag || 'abstract',
    durationSec: summary.durationSec || estimateFromText(summary.narration, 50),
  });

  return {
    topic: brief.topic,
    accentColor: brief.accentColor || '#7c5cfc',
    hashtag: brief.hashtag,
    videoMode: 'long',
    scenes,
  };
}

function estimateFromText(text = '', fallback = 10) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(Math.ceil(words / 2.5), fallback > 10 ? 8 : fallback, 5);
}

export function calcPreviewFrames(scenes, fps = 30) {
  const transitionFrames = Math.round(fps * 0.15);
  const total = scenes.reduce((acc, s) => {
    const sec = capPreviewDurationSec(s) || 5;
    return acc + Math.ceil(sec * fps) + transitionFrames;
  }, 0);
  return Math.max(total, fps * 3);
}

export function capPreviewDurationSec(scene) {
  if (scene.type === 'hook') return Math.min(scene.durationSec || 10, 8);
  if (scene.type === 'demo') return Math.min(scene.durationSec || 14, 16);
  if (scene.type === 'summary') return Math.min(scene.durationSec || 20, 18);
  return scene.durationSec;
}
