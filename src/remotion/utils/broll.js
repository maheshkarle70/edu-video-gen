// Local looping B-roll clips (bundled in pkg/public/broll/)
const BROLL_FILES = {
  space: 'broll/space.mp4',
  science: 'broll/science.mp4',
  tech: 'broll/tech.mp4',
  nature: 'broll/nature.mp4',
  history: 'broll/history.mp4',
  city: 'broll/city.mp4',
  abstract: 'broll/abstract.mp4',
};

const TAG_KEYWORDS = {
  space: ['space', 'planet', 'star', 'galaxy', 'black hole', 'universe', 'moon', 'solar', 'cosmos', 'orbit'],
  science: ['science', 'physics', 'chemistry', 'atom', 'molecule', 'lab', 'experiment', 'cell', 'dna', 'biology', 'brain'],
  tech: ['tech', 'computer', 'ai', 'code', 'software', 'digital', 'robot', 'neural', 'data', 'internet'],
  nature: ['nature', 'plant', 'animal', 'ocean', 'forest', 'earth', 'climate', 'weather', 'water', 'eco'],
  history: ['history', 'war', 'ancient', 'empire', 'revolution', 'century', 'past', 'civilization'],
  city: ['city', 'urban', 'business', 'economy', 'market', 'finance', 'trade', 'stock'],
};

const SCENE_DEFAULT_TAG = {
  hook: 'abstract',
  concept: 'science',
  fact: 'abstract',
  analogy: 'nature',
  quiz: 'tech',
  summary: 'abstract',
};

function detectTag(text) {
  const lower = (text || '').toLowerCase();
  for (const [tag, words] of Object.entries(TAG_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return tag;
  }
  return null;
}

export function pickBroll({ scene = {}, topic = '' }) {
  if (scene.brollUrl) return scene.brollUrl;

  const tag = scene.brollTag
    || detectTag(`${topic} ${scene.title} ${scene.body} ${scene.keyword}`)
    || SCENE_DEFAULT_TAG[scene.type]
    || 'abstract';

  return BROLL_FILES[tag] || BROLL_FILES.abstract;
}
