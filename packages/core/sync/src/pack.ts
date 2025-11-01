import { EncryptedPayload, encryptJSON } from '@innervoice/core-crypto';
import { SyncRepositoryEntry } from './types';

export type PackResult = EncryptedPayload;

export async function packEntry(entry: SyncRepositoryEntry, contentKey: Uint8Array): Promise<PackResult> {
  const payload = {
    version: 1,
    op: entry.op,
    updatedAt: entry.updatedAt,
    entry: entry.entry,
    embedding: entry.embedding ?? null
  };
  return encryptJSON(payload, contentKey);
}
