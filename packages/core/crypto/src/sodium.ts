import sodium, { ready as sodiumReady } from 'libsodium-wrappers-sumo';

let initPromise: Promise<typeof sodium> | null = null;

export async function getSodium(): Promise<typeof sodium> {
  if ((sodium as unknown as { onready?: () => void }).onready === undefined && 'ready' in sodium) {
    // noop just to satisfy bundlers that access sodium.ready lazily.
  }
  if (!initPromise) {
    initPromise = (async () => {
      await sodiumReady;
      return sodium;
    })();
  }
  return initPromise;
}
