const DEFAULT_DIMENSION = 16;

function hashChar(code: number, seed: number) {
  let x = (code + seed * 31) | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return x;
}

export function embedText(text: string, dimension: number = DEFAULT_DIMENSION): Float32Array {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const vector = new Float32Array(dimension);
  if (tokens.length === 0) {
    return vector;
  }
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    for (let j = 0; j < token.length; j += 1) {
      const slot = (hashChar(token.charCodeAt(j), i + 1) & 0x7fffffff) % dimension;
      vector[slot] += 1 / (1 + j);
    }
  }
  let sumSquares = 0;
  for (let k = 0; k < dimension; k += 1) {
    const value = vector[k];
    sumSquares += value * value;
  }
  const norm = Math.sqrt(sumSquares);
  if (norm > 0) {
    for (let k = 0; k < dimension; k += 1) {
      vector[k] = vector[k] / norm;
    }
  }
  return vector;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match');
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, similarity));
}

export function nearestNeighbor(query: Float32Array, vectors: Float32Array[]): number {
  if (vectors.length === 0) {
    return -1;
  }
  let bestIndex = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < vectors.length; i += 1) {
    const score = cosineSimilarity(query, vectors[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}
