import { useCallback, useState } from 'react';
import { extractAudioFeatures } from '@innervoice/audio-features';
import {
  ClassifyOptions,
  EmotionHints,
  NativeAudioFeatureSet,
  WordTime,
  classifyActivePersona,
  fuseHintsFromAudioAndText
} from '@innervoice/persona-core';
import { useI18n } from '../i18n';

export type UseAudioHintsArgs = {
  fileUri: string;
  words: WordTime[];
  text: string;
  lang: 'de' | 'en';
  classifyOptions: ClassifyOptions;
};

export function useAudioHints() {
  const [hints, setHints] = useState<EmotionHints | null>(null);
  const [features, setFeatures] = useState<NativeAudioFeatureSet | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const compute = useCallback(async ({ fileUri, words, text, lang, classifyOptions }: UseAudioHintsArgs) => {
    setLoading(true);
    setError(null);
    try {
      const af = await extractAudioFeatures(fileUri);
      const fused = fuseHintsFromAudioAndText(af, words, text, lang);
      const classification = classifyActivePersona(text, classifyOptions, fused);
      setFeatures(af);
      setHints(fused);
      setPersona(classification.label);
      return { features: af, hints: fused, persona: classification };
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.audioHints');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { hints, features, persona, loading, error, compute };
}
