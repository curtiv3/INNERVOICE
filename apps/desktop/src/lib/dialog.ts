import { embedText } from '@innervoice/core-embeddings';
import {
  EmotionHints,
  PersonaLabel,
  classifyActivePersona,
  generatePersonaResponse
} from '@innervoice/persona-core';
import { saveEntry, updateEntryResponse, EntryDetail } from './entries';

export type DialogResult = {
  entryId: string;
  persona: PersonaLabel | null;
  response: string;
  hints: EmotionHints | null;
};

function normalizeLanguage(value: string): 'de' | 'en' {
  return value.startsWith('en') ? 'en' : 'de';
}

export async function createDialogFromText(text: string, language: string = 'de'): Promise<DialogResult> {
  const languageCode = normalizeLanguage(language);
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const classification = classifyActivePersona(text, { language: languageCode, useTempoHints: false });
  const generated = generatePersonaResponse(classification.label, classification.hints ?? null, text);
  const embedding = embedText(text);
  await saveEntry({
    id,
    text,
    activePersona: classification.label,
    counterPersona: null,
    response: { message: generated.message, persona: classification.label },
    hints: classification.hints
      ? {
          arousal: classification.hints.arousal,
          tempoClass: classification.hints.tempoClass,
          pauses_ratio: classification.hints.pauses_ratio,
          pausesClass: classification.hints.pausesClass
        }
      : null,
    embedding
  });
  return { entryId: id, persona: classification.label, response: generated.message, hints: classification.hints ?? null };
}

function inflateHints(entry: EntryDetail): EmotionHints | null {
  if (!entry.hints) return null;
  const basePauses = entry.hints.pausesClass ?? 'medium';
  const tempo = entry.hints.tempoClass ?? 'neutral';
  const pauseRatio = entry.hints.pauses_ratio ?? 0.2;
  const baseStability = 0.5 + Math.max(0, 0.4 - pauseRatio);
  return {
    arousal: entry.hints.arousal,
    tempoClass: tempo,
    pauses_ratio: pauseRatio,
    pausesClass: basePauses,
    tension: Math.min(1, 0.4 + entry.hints.arousal * 0.2),
    stability: Math.max(0, Math.min(1, baseStability)),
    confidence: 0.6,
    valence_est: 0,
    wpm: tempo === 'fast' ? 140 : tempo === 'slow' ? 90 : 110,
    // Provide conservative defaults for missing fields.
  } as EmotionHints;
}

export async function regenerateResponse(
  entry: EntryDetail,
  mode: 'reframe' | 'next' | 'question'
): Promise<string> {
  const modifier =
    mode === 'reframe'
      ? '\nBitte hilf mir, diese Perspektive neu zu rahmen.'
      : mode === 'next'
        ? '\nFokussiere dich auf den nächsten konkreten Schritt.'
        : '\nStelle mir eine weitere reflektierende Frage.';
  const persona = entry.activePersona ?? null;
  const hints = inflateHints(entry);
  const generated = generatePersonaResponse(persona, hints, `${entry.text}${modifier}`);
  await updateEntryResponse(entry.id, { message: generated.message, persona }, persona);
  return generated.message;
}
