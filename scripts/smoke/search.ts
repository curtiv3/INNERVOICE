import { performance } from 'node:perf_hooks';
import { embedText, cosineSimilarity } from '@innervoice/core-embeddings';

type IndexedEntry = {
  id: string;
  text: string;
  vector: Float32Array;
};

function indexEntries(texts: { id: string; text: string }[]): IndexedEntry[] {
  return texts.map(item => ({
    ...item,
    vector: embedText(item.text)
  }));
}

function search(entries: IndexedEntry[], query: string, topK = 2) {
  const queryVector = embedText(query);
  const scored = entries
    .map(entry => ({
      entry,
      score: cosineSimilarity(entry.vector, queryVector)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored;
}

const seedEntries = [
  { id: '1', text: 'Ich möchte ruhig bleiben und tief durchatmen.' },
  { id: '2', text: 'Stress baut sich auf, mein Herz rast und ich brauche Hilfe.' },
  { id: '3', text: 'Notizen über Gartenarbeit und Pflanzen gießen.' }
];

const entries = indexEntries(
  Array.from({ length: 1000 }, (_, idx) => {
    const base = seedEntries[idx % seedEntries.length];
    return {
      id: `${base.id}-${idx}`,
      text: base.text
    };
  })
);

console.log('🔍 Smoke: semantic search');
const start = performance.now();
const results = search(entries, 'Wie werde ich den Stress los?');
const duration = performance.now() - start;
const message = `search: ${duration.toFixed(1)}ms`;
if (duration > 50) {
  console.warn(`⚠️  ${message} (budget 50ms überschritten)`);
} else {
  console.log(`✅ ${message}`);
}

if (results.length === 0 || results[0].score <= 0) {
  throw new Error('No search results for stress query');
}

if (results[0].entry.id !== '2') {
  console.warn('Top result unexpected, check embedding quality.', results[0]);
}

if (results[0].score < (results[1]?.score ?? 0)) {
  throw new Error('Ranking inconsistency detected');
}

console.log('✅ Search smoke completed with top score', results[0].score.toFixed(3));
