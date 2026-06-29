// Storyboard media → scene merge helpers

export function buildMediaHints(selectedSubtopics, sectionMedia = {}) {
  if (!sectionMedia || !Object.keys(sectionMedia).length) return '';

  const lines = selectedSubtopics
    .filter((st) => sectionMedia[st.id])
    .map((st) => {
      const m = sectionMedia[st.id];
      return `- Section [${st.id}] "${st.title}": user attached a ${m.type} demo (${m.caption || 'no caption'}). Narration MUST walk through what appears on screen. body = MAX 1 short sentence (under 15 words). Do NOT use visual diagram for this section.`;
    });

  return lines.length
    ? `\n\nSections with user-provided screenshots/recordings (use type "demo" for these):\n${lines.join('\n')}`
    : '';
}

export function mergeStoryboardMedia(script, selectedSubtopics, sectionMedia = {}) {
  if (!sectionMedia || !Object.keys(sectionMedia).length) return script;

  const scenes = (script.scenes || []).map((sc) => {
    if (sc.type !== 'section' || !sc.chapter) return sc;

    const subtopic = selectedSubtopics[sc.chapter - 1];
    const media = subtopic ? sectionMedia[subtopic.id] : null;
    if (!media?.filePath) return sc;

    const shortBody = (sc.body || '')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 1)
      .join(' ')
      .trim() || sc.title;

    return {
      ...sc,
      type: 'demo',
      body: shortBody,
      visual: undefined,
      media: {
        type: media.type,
        file: media.filePath,
        url: media.url,
        caption: media.caption || '',
      },
    };
  });

  return { ...script, scenes };
}
