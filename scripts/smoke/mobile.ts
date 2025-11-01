import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { embedText } from '@innervoice/core-embeddings';
import {
  classifyActivePersona,
  fuseHintsFromAudioAndText,
  generatePersonaResponse
} from '@innervoice/persona-core';
import { packEntry } from '@innervoice/core-sync';

async function main() {
  console.log('🌀 Smoke: mobile pipeline');
  const transcription = await measure('transcribe', 2000, async () => {
    const result = {
      text: 'Ich fühle mich angespannt, aber ich möchte mutig bleiben und klar handeln.',
      words: [
        { text: 'Ich', start: 0, end: 0.2 },
        { text: 'fühle', start: 0.2, end: 0.4 },
        { text: 'mich', start: 0.4, end: 0.6 },
        { text: 'angespannt,', start: 0.6, end: 1.0 },
        { text: 'aber', start: 1.0, end: 1.2 },
        { text: 'ich', start: 1.2, end: 1.3 },
        { text: 'möchte', start: 1.3, end: 1.5 },
        { text: 'mutig', start: 1.5, end: 1.7 },
        { text: 'bleiben', start: 1.7, end: 1.9 },
        { text: 'und', start: 1.9, end: 2.0 },
        { text: 'klar', start: 2.0, end: 2.2 },
        { text: 'handeln.', start: 2.2, end: 2.6 }
      ]
    };
    await new Promise(resolve => setTimeout(resolve, 120));
    return result;
  });

  const vector = await measure('embed', 250, async () => embedText(transcription.text));

  const hints = await measure('hints', 100, async () =>
    fuseHintsFromAudioAndText(
      {
        duration: 2.6,
        rms_mean: 0.35,
        rms_std: 0.1,
        zcr_mean: 0.08,
        f0_mean: 180,
        f0_stability: 0.7,
        speech_ratio: 0.76
      },
      transcription.words,
      transcription.text,
      'de'
    )
  );

  const persona = await measure('classify', 50, async () =>
    classifyActivePersona(transcription.text, { language: 'de', useTempoHints: true }, hints)
  );

  const response = await measure('generate', 100, async () =>
    generatePersonaResponse(persona.label, hints, transcription.text)
  );
  if (response.message.length < 20) {
    throw new Error('Generated response too short for smoke expectations');
  }

  const blob = await measure('pack', 150, async () =>
    packEntry(
      {
        id: 'local_smoke',
        entryId: 'entry_smoke',
        op: 'upsert',
      updatedAt: Date.now(),
      entry: {
        text: transcription.text,
        persona: persona.label,
        hints
      },
      embedding: Array.from(vector)
      },
      randomBytes(32)
    )
  );

  if (!(blob instanceof Uint8Array) || blob.length === 0) {
    throw new Error('Encrypted blob generation failed');
  }

  if (persona.label === 'EMOTIONAL' && hints.tempoClass === 'fast') {
    console.warn('Persona hints indicate tension – budget check result.');
  }

  console.log('✅ Mobile smoke completed');
}

async function measure<T>(label: string, budgetMs: number, work: () => Promise<T> | T): Promise<T> {
  const start = performance.now();
  const result = await work();
  const duration = performance.now() - start;
  const message = `${label}: ${duration.toFixed(1)}ms`;
  if (duration > budgetMs) {
    console.warn(`⚠️  ${message} (budget ${budgetMs}ms überschritten)`);
  } else {
    console.log(`✅ ${message}`);
  }
  return result;
}

main().catch(error => {
  console.error('❌ Mobile smoke failed', error);
  process.exitCode = 1;
});
