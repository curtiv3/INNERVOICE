import { NativeModules, Platform } from 'react-native';

export type NativeAudioFeatures = {
  duration: number;
  rms_mean: number;
  rms_std: number;
  zcr_mean: number;
  f0_mean: number | null;
  f0_stability: number;
  speech_ratio: number;
};

type AudioFeaturesModuleShape = {
  extractAudioFeatures: (fileUri: string) => Promise<NativeAudioFeatures>;
};

const LINKING_ERROR =
  `The package '@innervoice/audio-features' doesn't seem to be linked. Make sure:\n` +
  Platform.select({
    ios: "- You have run 'pod install'\n",
    default: ''
  }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const audioFeaturesModule: AudioFeaturesModuleShape | undefined = (NativeModules as any)
  .AudioFeaturesModule;

if (!audioFeaturesModule) {
  throw new Error(LINKING_ERROR);
}

export async function extractAudioFeatures(fileUri: string): Promise<NativeAudioFeatures> {
  if (!fileUri) {
    throw new Error('extractAudioFeatures requires a fileUri');
  }
  const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  const result = await audioFeaturesModule.extractAudioFeatures(normalizedUri);
  return {
    duration: result.duration,
    rms_mean: result.rms_mean,
    rms_std: result.rms_std,
    zcr_mean: result.zcr_mean,
    f0_mean: result.f0_mean === null ? null : result.f0_mean,
    f0_stability: result.f0_stability,
    speech_ratio: result.speech_ratio
  };
}

export default {
  extractAudioFeatures
};
