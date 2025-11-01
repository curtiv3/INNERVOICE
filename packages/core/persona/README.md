# @innervoice/persona-core

Core logic for InnerVoice persona detection. This package now fuses on-device audio prosody hints
with text heuristics to enrich persona classification.

## Emotion hints fusion

```ts
import { fuseHintsFromAudioAndText } from '@innervoice/persona-core';

const hints = fuseHintsFromAudioAndText(audioFeatures, wordTimestamps, text, 'de');
```

The helper consolidates RMS energy, zero-crossing rate, pitch stability and Whisper word timings
into actionable hints.

### Example scenarios

| Szenario | Audio Features (rms / zcr / speech ratio) | Whisper (WPM / Pausenanteil) | Hints |
|----------|-------------------------------------------|-------------------------------|-------|
| Ruhig | 0.032 / 0.05 / 0.62 | 98 / 0.18 | `{ arousal: 0.28, tempoClass: 'neutral', pausesClass: 'few' }` |
| Aufgeregt | 0.118 / 0.17 / 0.88 | 182 / 0.12 | `{ arousal: 0.81, tempoClass: 'fast', pausesClass: 'few' }` |
| Zerhackt | 0.041 / 0.09 / 0.41 | 72 / 0.46 | `{ arousal: 0.34, tempoClass: 'slow', pausesClass: 'many' }` |

These derived hints adjust persona scoring, highlighting cases where tempo or tension shifts the
conversation dynamics.
