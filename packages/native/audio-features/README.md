# @innervoice/audio-features

Native module that extracts lightweight prosody statistics from 16 kHz mono WAV files. The
features are used to enrich InnerVoice persona classification with tempo and arousal hints while
remaining completely offline.

## API

```ts
import { extractAudioFeatures } from '@innervoice/audio-features';

const features = await extractAudioFeatures(fileUri);
// {
//   duration: number,
//   rms_mean: number,
//   rms_std: number,
//   zcr_mean: number,
//   f0_mean: number | null,
//   f0_stability: number,
//   speech_ratio: number
// }
```

The binding returns within ~150 ms for 10 seconds of audio on modern devices.

## Example outputs

| Scenario | rms_mean | zcr_mean | f0_mean | speech_ratio | Interpretation |
|----------|----------|----------|---------|---------------|----------------|
| Ruhig (calm voice) | 0.032 | 0.05 | 148 | 0.62 | low arousal, stable | 
| Aufgeregt (excited) | 0.118 | 0.17 | 236 | 0.88 | high arousal, fast tempo |
| Zerhackt (many pauses) | 0.041 | 0.09 | 0 | 0.41 | hesitant with many pauses |

These synthetic examples are used in the persona README to demonstrate hint fusion results.
