import { ensureContentKey, DeviceKeyStore, WrappedContentKeyStore } from '@innervoice/core-crypto';
import { packEntry } from './pack';
import { SyncAdapter, SyncBlobDescriptor, SyncRepository } from './types';

export type PushContext = {
  adapter: SyncAdapter;
  repository: SyncRepository;
  deviceKeyStore: DeviceKeyStore;
  contentKeyStore: WrappedContentKeyStore;
};

export type PushReport = {
  pushed: number;
  blobs: SyncBlobDescriptor[];
};

export async function pushPendingChanges(context: PushContext): Promise<PushReport> {
  const pending = await context.repository.listPending();
  if (pending.length === 0) {
    return { pushed: 0, blobs: [] };
  }
  const contentKey = await ensureContentKey(context.contentKeyStore, context.deviceKeyStore);
  const blobs: SyncBlobDescriptor[] = [];
  for (const entry of pending) {
    const payload = await packEntry(entry, contentKey);
    const descriptor: SyncBlobDescriptor = {
      id: entry.id,
      entryId: entry.entryId,
      updatedAt: entry.updatedAt,
      op: entry.op,
      payload
    };
    await context.adapter.putBlob(descriptor);
    blobs.push(descriptor);
  }
  await context.repository.markSynced(pending.map(item => item.id));
  return { pushed: blobs.length, blobs };
}
