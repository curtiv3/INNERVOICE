import { NativeModules } from 'react-native';
import type { WordTime } from '@innervoice/persona-core';
import { ensureWhisperModelAvailable } from './models';
import { translate } from '../i18n';

export type TranscriptionResult = {
  text: string;
  words: WordTime[];
};

const Whisper: undefined | {
  transcribe(fileUri: string): Promise<TranscriptionResult>;
} = NativeModules?.InnerVoiceWhisper;

export async function transcribe(fileUri: string): Promise<TranscriptionResult> {
function buildSampleWords(text: string): WordTime[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const step = 0.4;
  return tokens.map((token, index) => ({
    text: token,
    start: Number((index * step).toFixed(1)),
    end: Number(((index + 1) * step).toFixed(1))
  }));
}

export async function transcribe(fileUri: string): Promise<TranscriptionResult> {
  if (Whisper?.transcribe) {
    try {
      await ensureWhisperModelAvailable();
      return await Whisper.transcribe(fileUri);
    } catch (error) {
      console.error(translate('errors.whisperInit'), error);
    }
  }
  console.warn('InnerVoiceWhisper native module not found – returning mock transcription');
  const text = translate('transcription.sample');
  return {
    text,
    words: buildSampleWords(text)
  };
}
