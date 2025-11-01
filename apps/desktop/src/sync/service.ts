import { createOfflineAdapter, pushPendingChanges, PushReport, SyncBlobDescriptor } from '@innervoice/core-sync';
import { contentKeyStore, deviceKeyStore, ensureDesktopDeviceKey } from '../lib/crypto';
import { desktopSyncRepository } from './repository';

const offlineStore: { blobs: SyncBlobDescriptor[] } = { blobs: [] };
const adapter = createOfflineAdapter(offlineStore);

export async function syncNow(): Promise<PushReport> {
  await ensureDesktopDeviceKey();
  return pushPendingChanges({
    adapter,
    repository: desktopSyncRepository,
    deviceKeyStore,
    contentKeyStore
  });
}

export function getPreparedBlobCount(): number {
  return offlineStore.blobs.length;
}
