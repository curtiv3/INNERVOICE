export type TempoClass = 'slow' | 'neutral' | 'fast';
export type PauseClass = 'few' | 'medium' | 'many';

export type EmotionHints = {
  arousal: number;
  valence_est: -1 | 0 | 1;
  tension: number;
  tempoClass: TempoClass;
  pausesClass: PauseClass;
  stability: number;
  confidence: number;
  wpm: number;
  pauses_ratio: number;
};

export type WordTime = {
  text: string;
  start: number;
  end: number;
};

export type NativeAudioFeatureSet = {
  duration: number;
  rms_mean: number;
  rms_std: number;
  zcr_mean: number;
  f0_mean: number | null;
  f0_stability: number;
  speech_ratio: number;
};
