import { useCallback, useEffect, useState } from 'react';
import { addTranscriptionListener, loadModel, transcribe } from '../../react-native-bridge/src';
import { useAudioRecorder } from '../utils/audio';

type WhisperModelPreset = 'tiny' | 'base' | 'small' | 'medium' | 'large';

type ModelConfig = {
  name: string;
  url: string;
  sizeBytes: number;
};

const MODEL_PRESETS: Record<WhisperModelPreset, ModelConfig> = {
  tiny: {
    name: 'ggml-tiny.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    sizeBytes: 15129600,
  },
  base: {
    name: 'ggml-base.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    sizeBytes: 29272320,
  },
  small: {
    name: 'ggml-small.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    sizeBytes: 96636760,
  },
  medium: {
    name: 'ggml-medium.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin',
    sizeBytes: 191265200,
  },
  large: {
    name: 'ggml-large-v2',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin',
    sizeBytes: 310964815,
  },
};

export function useOneTapTranscription(preset: WhisperModelPreset = 'small') {
  const recorder = useAudioRecorder();
  const [transcript, setTranscript] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = addTranscriptionListener(event => {
      setTranscript(event.text);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const ensureModel = useCallback(async () => {
    setLoadingModel(true);
    try {
      await loadModel(MODEL_PRESETS[preset]);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoadingModel(false);
    }
  }, [preset]);

  const startRecording = useCallback(async () => {
    setError(null);
    await ensureModel();
    await recorder.start();
  }, [ensureModel, recorder]);

  const stopAndTranscribe = useCallback(async () => {
    const audio = await recorder.stop();
    try {
      const text = await transcribe(audio, 16000, { maxThreads: 4 });
      setTranscript(text);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [recorder]);

  return {
    transcript,
    loadingModel,
    error,
    state: recorder.state,
    startRecording,
    stopAndTranscribe,
  };
}
