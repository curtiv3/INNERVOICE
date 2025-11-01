import { NativeModules, NativeEventEmitter, EmitterSubscription, Platform } from 'react-native';
import { Buffer } from 'buffer';

export type ModelInfo = {
  name: string;
  url: string;
  sizeBytes: number;
};

export type TranscriptionEvent = {
  text: string;
  durationMs: number;
  model: string;
};

const LINKING_ERROR =
  `The package 'react-native-innervoice-whisper' doesn't seem to be linked. Make sure:\n\n` +
  Platform.select({ ios: "- You have run 'pod install'", default: '' }) +
  '\n- You rebuilt the app after installing the package' +
  '\n- You are not using Expo Go\n';

const { IVWhisperModule } = NativeModules;

if (!IVWhisperModule) {
  throw new Error(LINKING_ERROR);
}

const emitter = new NativeEventEmitter(IVWhisperModule);

export function loadModel(model: ModelInfo): Promise<void> {
  return IVWhisperModule.loadModel(model);
}

export function transcribe(
  pcm: Int16Array,
  sampleRate: number,
  options: { translate?: boolean; diarize?: boolean; maxThreads?: number } = {}
) {
  const buffer = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  return IVWhisperModule.transcribe(
    buffer,
    sampleRate,
    options.translate ?? false,
    options.diarize ?? false,
    options.maxThreads ?? 4
  );
}

export function addTranscriptionListener(
  listener: (event: TranscriptionEvent) => void
): EmitterSubscription {
  return emitter.addListener('onTranscription', listener);
}

export const WhisperBridge = {
  loadModel,
  transcribe,
  addTranscriptionListener,
};
