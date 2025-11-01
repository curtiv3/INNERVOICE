import { describe, expect, it } from 'vitest';
import { toMarkdown } from './md';
import { toPdf } from './pdf';
import type { ExportEntry } from './common';

const baseEntry: ExportEntry = {
  id: 'entry_test',
  text: 'Anna traf sich mit Peter und schrieb an anna@example.com.',
  createdAt: Date.UTC(2024, 0, 1),
  updatedAt: Date.UTC(2024, 0, 2),
  persona: 'EMOTIONAL',
  counterPersona: 'MENTOR',
  moodScore: 3,
  hints: {
    arousal: 0.6,
    tempoClass: 'fast',
    pauses_ratio: 0.15,
    pausesClass: 'few'
  }
};

describe('export markdown', () => {
  it('sanitises content when anonymize is enabled', () => {
    const { content, replacements } = toMarkdown(baseEntry, { message: 'Hallo Anna!' }, { locale: 'de-DE' }, {
      anonymize: true
    });
    expect(content).not.toContain('Anna');
    expect(content).not.toContain('anna@example.com');
    expect(replacements.length).toBeGreaterThan(0);
  });

  it('keeps original text when anonymize is disabled', () => {
    const { content } = toMarkdown(baseEntry, { message: 'Hallo Anna!' }, { locale: 'de-DE' }, {
      anonymize: false
    });
    expect(content).toContain('Anna');
  });
});

describe('export pdf', () => {
  it('returns a base64 encoded document', async () => {
    const result = await toPdf(baseEntry, { message: 'Antwort von Peter' }, { locale: 'de-DE' }, {
      anonymize: true
    });
    expect(result.base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(result.base64.length).toBeGreaterThan(50);
  });
});
