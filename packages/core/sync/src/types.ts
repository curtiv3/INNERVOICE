import { EncryptedPayload } from '@innervoice/core-crypto';

export type SyncOperation = 'upsert' | 'delete';

export type SyncBlobDescriptor = {
  id: string;
  entryId: string;
  updatedAt: number;
  op: SyncOperation;
  payload: EncryptedPayload;
};

export interface SyncAdapter {
  putBlob(blob: SyncBlobDescriptor): Promise<void>;
  listBlobs?(opts?: { since?: number }): Promise<RemoteBlobInfo[]>;
  getBlob?(id: string): Promise<EncryptedPayload | null>;
}

export type RemoteBlobInfo = {
  id: string;
  entryId: string;
  updatedAt: number;
  op: SyncOperation;
};

export type SyncRepositoryEntry = {
  id: string;
  entryId: string;
  op: SyncOperation;
  updatedAt: number;
  entry: Record<string, unknown>;
  embedding?: number[];
};

export interface SyncRepository {
  listPending(): Promise<SyncRepositoryEntry[]>;
  markSynced(ids: string[]): Promise<void>;
  applyRemote(entries: SyncRepositoryEntry[]): Promise<void>;
}

export type MergeResult = {
  applied: number;
  conflicts: { entryId: string; kept: 'local' | 'remote'; discardedUpdatedAt: number }[];
};
