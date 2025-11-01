import { useCallback, useMemo, useRef, useState } from 'react';
import { useAudioHints } from './useAudioHints';
import { startRecording, stopRecording } from '../services/recorder';
import { transcribe } from '../services/transcription';
import { generatePersonaResponse } from '../services/respond';
import { embedText, initEmbeddings } from '../services/embeddings';
import { saveEmbedding, upsertEntry } from '../storage/entries';
import type { EmotionHints, WordTime } from '@innervoice/persona-core';
import { showToast } from '../utils/notify';
import { useI18n, type Language } from '../i18n';

type ConversationPhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'analyzing'
  | 'responding'
  | 'saving'
  | 'completed'
  | 'error';

export type ConversationResult = {
  entryId: string;
  fileUri: string;
  transcription: { text: string; words: WordTime[] };
  persona: string | null;
  hints: EmotionHints | null;
  response: string;
};

function createEntryId() {
  return `entry_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export function useConversationFlow(preferredLanguage?: Language) {
  const { compute, hints, persona } = useAudioHints();
  const { language: contextLanguage, t } = useI18n();
  const language = preferredLanguage ?? contextLanguage;
  const [phase, setPhase] = useState<ConversationPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<ConversationResult | null>(null);
  const sessionRef = useRef<string | null>(null);
  const entryIdRef = useRef<string>('');

  const reset = useCallback(() => {
    sessionRef.current = null;
    entryIdRef.current = '';
    setPhase('idle');
    setError(null);
    setCurrentEntry(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPhase('recording');
    try {
      const session = await startRecording();
      sessionRef.current = session.sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.recordingStart');
      setError(message);
      setPhase('error');
      showToast(message);
      throw err;
    }
  }, []);

  const stop = useCallback(async () => {
    if (!sessionRef.current) {
      return;
    }
    try {
      setPhase('transcribing');
      const { fileUri } = await stopRecording(sessionRef.current);
      entryIdRef.current = createEntryId();
      setPhase('analyzing');
      const transcription = await transcribe(fileUri);
      const analysis = await compute({
        fileUri,
        words: transcription.words,
        text: transcription.text,
        lang: language,
        classifyOptions: { language, useTempoHints: true }
      });
      setPhase('responding');
      const { message } = generatePersonaResponse(analysis?.persona?.label ?? persona ?? null, analysis?.hints ?? hints, transcription.text);
      setPhase('saving');
      await upsertEntry({
        id: entryIdRef.current,
        text: transcription.text,
        activePersona: analysis?.persona?.label ?? persona ?? null,
        audioUri: fileUri,
        words: transcription.words,
        response: { message },
        hints: analysis?.hints
          ? {
              arousal: analysis.hints.arousal,
              tempoClass: analysis.hints.tempoClass,
              pauses_ratio: analysis.hints.pauses_ratio,
              pausesClass: analysis.hints.pausesClass
            }
          : undefined
      });
      let vector: Float32Array | null = null;
      try {
        await initEmbeddings();
        vector = embedText(transcription.text);
      } catch (embeddingError) {
        const hint = t('errors.embeddingMissing');
        console.error(hint, embeddingError);
        throw new Error(hint);
      }
      await saveEmbedding({ entryId: entryIdRef.current, vector });
      const result: ConversationResult = {
        entryId: entryIdRef.current,
        fileUri,
        transcription,
        persona: analysis?.persona?.label ?? persona ?? null,
        hints: analysis?.hints ?? hints ?? null,
        response: message
      };
      setCurrentEntry(result);
      setPhase('completed');
      showToast(t('toast.entrySaved'));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknown');
      setError(message);
      setPhase('error');
      showToast(message);
      throw err;
    }
    finally {
      sessionRef.current = null;
    }
  }, [compute, hints, language, persona, t]);

  const busy = phase !== 'idle' && phase !== 'completed' && phase !== 'error';

  return useMemo(
    () => ({
      phase,
      busy,
      error,
      currentEntry,
      persona: currentEntry?.persona ?? persona,
      hints: currentEntry?.hints ?? hints,
      start,
      stop,
      reset
    }),
    [phase, busy, error, currentEntry, persona, hints, start, stop, reset]
  );
}
