import { EmotionHints } from '../types/hints';
import { fuseHintsFromAudioAndText } from '../detectors/audioHints';

export type PersonaLabel = 'EMOTIONAL' | 'SHADOW' | 'LOGICAL' | 'WARRIOR' | 'CHILD' | 'MENTOR';

export type ClassifyOptions = {
  language: 'de' | 'en';
  useTempoHints?: boolean;
};

type PersonaScore = Record<PersonaLabel, number>;

function baseScoresFromText(text: string, language: 'de' | 'en'): PersonaScore {
  const baseline: PersonaScore = {
    EMOTIONAL: 0.5,
    SHADOW: 0.4,
    LOGICAL: 0.4,
    WARRIOR: 0.4,
    CHILD: 0.3,
    MENTOR: 0.3
  };
  const lower = text.toLowerCase();
  const intenseTokens = lower.match(/[!?]/g)?.length ?? 0;
  const questionTokens = lower.match(/\?/g)?.length ?? 0;
  const numbers = lower.match(/\d+/g)?.length ?? 0;
  if (intenseTokens > 1) baseline.EMOTIONAL += 0.2;
  if (questionTokens > 0) baseline.LOGICAL += 0.1;
  if (numbers > 0) baseline.LOGICAL += 0.05;
  if (lower.includes('angst') || lower.includes('fear')) baseline.SHADOW += 0.15;
  if (lower.includes('mut') || lower.includes('brave')) baseline.WARRIOR += 0.12;
  if (lower.includes('hilfe') || lower.includes('help')) baseline.CHILD += 0.1;
  if (lower.includes('danke') || lower.includes('thank')) baseline.MENTOR += 0.12;
  if (language === 'de' && lower.includes('vernünftig')) baseline.LOGICAL += 0.08;
  return baseline;
}

function softmax(scores: PersonaScore): PersonaScore {
  const values = (Object.keys(scores) as PersonaLabel[]).map(label => Math.exp(scores[label]));
  const sum = values.reduce((acc, value) => acc + value, 0);
  const labels = Object.keys(scores) as PersonaLabel[];
  const result = {} as PersonaScore;
  labels.forEach((label, index) => {
    result[label] = values[index] / (sum || 1);
  });
  return result;
}

export function classifyActivePersona(
  text: string,
  options: ClassifyOptions,
  hints?: EmotionHints
): { label: PersonaLabel; scores: PersonaScore; hints?: EmotionHints } {
  const base = baseScoresFromText(text, options.language);
  if (options.useTempoHints && hints) {
    base.EMOTIONAL += hints.arousal * 0.15 + hints.tension * 0.1;
    base.SHADOW += hints.tension > 0.6 ? 0.1 : 0;
    base.LOGICAL += hints.tempoClass === 'slow' && hints.pausesClass !== 'many' ? 0.05 : 0;
    base.WARRIOR += hints.tempoClass === 'fast' && hints.arousal > 0.6 ? 0.08 : 0;
    base.CHILD += hints.valence_est === -1 && hints.stability < 0.5 && hints.pauses_ratio > 0.25 ? 0.08 : 0;
    base.MENTOR += hints.tension < 0.35 && hints.stability > 0.7 ? 0.05 : 0;
  }
  const distribution = softmax(base);
  let bestLabel: PersonaLabel = 'EMOTIONAL';
  let bestScore = -Infinity;
  (Object.keys(distribution) as PersonaLabel[]).forEach(label => {
    if (distribution[label] > bestScore) {
      bestScore = distribution[label];
      bestLabel = label;
    }
  });
  return { label: bestLabel, scores: distribution, hints };
}

export { fuseHintsFromAudioAndText };
