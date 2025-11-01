import { EmotionHints, NativeAudioFeatureSet, PauseClass, TempoClass, WordTime } from '../types/hints';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function computePauses(words: WordTime[]): { totalPause: number; pauseRatio: number; tokens: number } {
  if (words.length === 0) {
    return { totalPause: 0, pauseRatio: 0, tokens: 0 };
  }
  let pauses = 0;
  for (let i = 1; i < words.length; i += 1) {
    const gap = Math.max(0, words[i].start - words[i - 1].end);
    if (gap > 0.2) {
      pauses += gap;
    }
  }
  const totalDuration = Math.max(words[words.length - 1].end - words[0].start, 0.0001);
  return { totalPause: pauses, pauseRatio: clamp01(pauses / totalDuration), tokens: words.length };
}

function inferTempoClass(wpm: number, pauseRatio: number): TempoClass {
  if (wpm < 90 || pauseRatio > 0.45) {
    return 'slow';
  }
  if (wpm > 150 && pauseRatio < 0.25) {
    return 'fast';
  }
  return 'neutral';
}

function inferPauseClass(pauseRatio: number): PauseClass {
  if (pauseRatio < 0.18) return 'few';
  if (pauseRatio > 0.38) return 'many';
  return 'medium';
}

function computePunctuationDensity(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[!?;,\.]/g);
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!matches || tokens.length === 0) {
    return 0;
  }
  return matches.length / tokens.length;
}

function computeSentiment(text: string, lang: 'de' | 'en'): number {
  const lower = text.toLowerCase();
  const positive = lang === 'de'
    ? ['danke', 'gut', 'freu', 'liebe', 'glücklich']
    : ['thank', 'good', 'happy', 'love', 'glad'];
  const negative = lang === 'de'
    ? ['angst', 'schlecht', 'wütend', 'traurig', 'müde']
    : ['afraid', 'bad', 'angry', 'sad', 'tired'];
  let score = 0;
  for (const term of positive) {
    if (lower.includes(term)) score += 1;
  }
  for (const term of negative) {
    if (lower.includes(term)) score -= 1;
  }
  return Math.max(-2, Math.min(2, score));
}

export function fuseHintsFromAudioAndText(
  af: NativeAudioFeatureSet,
  words: WordTime[],
  fullText: string,
  lang: 'de' | 'en'
): EmotionHints {
  const textDuration = words.length > 0 ? Math.max(words[words.length - 1].end, af.duration) : af.duration;
  const { totalPause, pauseRatio, tokens } = computePauses(words);
  const durationMinutes = Math.max(textDuration / 60, 0.001);
  const wpm = tokens / durationMinutes;

  const punctDensity = computePunctuationDensity(fullText);

  const normEnergy = clamp01((af.rms_mean - 0.015) / (0.18 - 0.015));
  const zcrEnergy = clamp01((af.zcr_mean - 0.03) / (0.25 - 0.03));
  const pauseImpact = clamp01(1 - pauseRatio);
  const arousal = clamp01(0.6 * normEnergy + 0.25 * zcrEnergy + 0.15 * pauseImpact);

  const stability = clamp01(af.f0_stability * af.speech_ratio);
  const punctuationBoost = clamp01(punctDensity * 2.5);
  const tension = clamp01(arousal * 0.6 + (1 - stability) * 0.25 + punctuationBoost * 0.15);

  const tempoClass = inferTempoClass(wpm, pauseRatio);
  const pausesClass = inferPauseClass(pauseRatio);

  const confidence = clamp01(stability * 0.6 + pauseImpact * 0.3 + (1 - af.rms_std * 10) * 0.1);

  const sentiment = computeSentiment(fullText, lang);
  let valence: -1 | 0 | 1 = 0;
  if (sentiment > 0 && arousal < 0.75) {
    valence = 1;
  } else if (sentiment < 0 || (tension > 0.65 && pauseRatio > 0.3)) {
    valence = -1;
  }

  return {
    arousal,
    valence_est: valence,
    tension,
    tempoClass,
    pausesClass,
    stability,
    confidence,
    wpm,
    pauses_ratio: pauseRatio
  };
}
