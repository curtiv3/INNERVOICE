import { describe, expect, it } from 'vitest';
import { classifyActivePersona } from './classify';
import type { EmotionHints } from '../types/hints';

describe('classifyActivePersona', () => {
  it('prefers logical persona for analytical text', () => {
    const { label } = classifyActivePersona(
      'Welche 3 Optionen analysieren wir konkret? 42 hilft uns Schritt für Schritt.',
      { language: 'de', useTempoHints: false }
    );
    expect(label).toBe('LOGICAL');
  });

  it('boosts warrior persona when tempo hints are high', () => {
    const hints: EmotionHints = {
      arousal: 0.9,
      valence_est: 1,
      tension: 0.7,
      tempoClass: 'fast',
      pausesClass: 'few',
      stability: 0.8,
      confidence: 0.9,
      wpm: 180,
      pauses_ratio: 0.05
    };
    const base = classifyActivePersona('Los gehts wir handeln mutig und fokussiert', {
      language: 'de',
      useTempoHints: false
    });
    const adjusted = classifyActivePersona('Los gehts wir handeln mutig und fokussiert', {
      language: 'de',
      useTempoHints: true
    }, hints);
    expect(adjusted.scores.WARRIOR).toBeGreaterThan(base.scores.WARRIOR);
  });
});
