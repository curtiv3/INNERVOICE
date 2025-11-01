import { describe, expect, it } from 'vitest';
import { cosineSimilarity, embedText } from './index';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = embedText('ruhiger gedanke');
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it('returns higher value for related phrases than unrelated ones', () => {
    const calm = embedText('ruhig bleiben und atmen');
    const stress = embedText('stress und druck überall');
    const unrelated = embedText('tomate garten werkzeug');
    const calmVsStress = cosineSimilarity(calm, stress);
    const calmVsUnrelated = cosineSimilarity(calm, unrelated);
    expect(calmVsStress).toBeGreaterThan(calmVsUnrelated);
  });
});
