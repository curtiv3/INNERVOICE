import { SyncAdapter, SyncBlobDescriptor, RemoteBlobInfo } from './types';

export type OfflineSyncStore = {
  blobs: SyncBlobDescriptor[];
};

export function createOfflineAdapter(store: OfflineSyncStore = { blobs: [] }): SyncAdapter {
  return {
    async putBlob(blob) {
      const existingIndex = store.blobs.findIndex(item => item.id === blob.id);
      if (existingIndex >= 0) {
        store.blobs.splice(existingIndex, 1, blob);
      } else {
        store.blobs.push(blob);
      }
    },
    async listBlobs() {
      return store.blobs.map<RemoteBlobInfo>(blob => ({
        id: blob.id,
        entryId: blob.entryId,
        updatedAt: blob.updatedAt,
        op: blob.op
      }));
    },
    async getBlob(id) {
      const found = store.blobs.find(blob => blob.id === id);
      return found ? found.payload : null;
    }
  };
}
