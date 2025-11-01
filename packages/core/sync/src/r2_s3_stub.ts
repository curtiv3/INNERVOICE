import { SyncAdapter, SyncBlobDescriptor, RemoteBlobInfo } from './types';

export type R2S3StubOptions = {
  bucketName: string;
  endpoint: string;
};

export function createR2S3StubAdapter(_options: R2S3StubOptions): SyncAdapter {
  const inMemory: SyncBlobDescriptor[] = [];
  return {
    async putBlob(blob) {
      const index = inMemory.findIndex(item => item.id === blob.id);
      if (index >= 0) {
        inMemory.splice(index, 1, blob);
      } else {
        inMemory.push(blob);
      }
    },
    async listBlobs() {
      return inMemory.map<RemoteBlobInfo>(blob => ({
        id: blob.id,
        entryId: blob.entryId,
        updatedAt: blob.updatedAt,
        op: blob.op
      }));
    },
    async getBlob(id) {
      const found = inMemory.find(item => item.id === id);
      return found ? found.payload : null;
    }
  };
}
