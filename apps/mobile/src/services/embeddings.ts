import { embedText as coreEmbedText, cosineSimilarity as coreCosineSimilarity } from '@innervoice/core-embeddings';
import { ensureEmbeddingModelAvailable } from './models';
import { translate } from '../i18n';

let embeddingReady = false;
let initialising: Promise<void> | null = null;

export function resetEmbeddingStatus() {
  embeddingReady = false;
}

async function ensureEmbeddingReady() {
  if (embeddingReady) {
    return;
  }
  if (!initialising) {
    initialising = (async () => {
      await ensureEmbeddingModelAvailable();
      embeddingReady = true;
    })().finally(() => {
      initialising = null;
    });
  }
  await initialising;
}

export async function initEmbeddings() {
  await ensureEmbeddingReady();
}

export function embedText(text: string): Float32Array {
  if (!embeddingReady) {
    throw new Error(translate('errors.embeddingMissing'));
  }
  try {
    return coreEmbedText(text);
  } catch (error) {
    embeddingReady = false;
    const message = translate('errors.embeddingInit');
    console.error(message, error);
    throw new Error(message);
  }
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  try {
    return coreCosineSimilarity(a, b);
  } catch (error) {
    console.error('Embedding similarity failed', error);
    return 0;
  }
}
