import { describe, expect, it } from 'vitest';
import { generatePersonaResponse } from './generate';

const hints = {
  arousal: 0.65,
  valence_est: 0 as const,
  tension: 0.4,
  tempoClass: 'neutral' as const,
  pausesClass: 'medium' as const,
  stability: 0.7,
  confidence: 0.8,
  wpm: 120,
  pauses_ratio: 0.2
};

describe('generatePersonaResponse', () => {
  it('produces multi-line mentor response without placeholders', () => {
    const { message } = generatePersonaResponse('MENTOR', hints, 'Halte einen ruhigen Fokus.');
    expect(message.split('\n\n').length).toBeGreaterThanOrEqual(3);
    expect(message).not.toMatch(/placeholder/i);
    expect(message).not.toMatch(/TODO/);
  });

  it('falls back gracefully when persona is missing', () => {
    const { voice } = generatePersonaResponse(null, null, 'Kurzer Text');
    expect(voice.tone).toMatch(/Ruhig/);
  });
});
