import { createOfflineAdapter, pushPendingChanges, PushReport, SyncBlobDescriptor } from '@innervoice/core-sync';
import { contentKeyStore, deviceKeyStore, ensureDeviceKeyMaterial } from '../crypto/deviceKeys';
import { mobileSyncRepository } from './repository';

const offlineStore: { blobs: SyncBlobDescriptor[] } = { blobs: [] };
const adapter = createOfflineAdapter(offlineStore);

export async function syncNow(): Promise<PushReport> {
  await ensureDeviceKeyMaterial();
  return pushPendingChanges({
    adapter,
    repository: mobileSyncRepository,
    deviceKeyStore,
    contentKeyStore
  });
}

export function getPreparedBlobCount(): number {
  return offlineStore.blobs.length;
}
