import { EncryptedPayload, decryptJSON } from '@innervoice/core-crypto';
import { SyncOperation, SyncRepositoryEntry } from './types';

type InternalPayload = {
  version: number;
  op: SyncOperation;
  updatedAt: number;
  entry: Record<string, unknown>;
  embedding: number[] | null;
};

export async function unpackEntry(
  payload: EncryptedPayload,
  entryId: string,
  contentKey: Uint8Array
): Promise<SyncRepositoryEntry> {
  const data = await decryptJSON<InternalPayload>(payload, contentKey);
  if (typeof data.version !== 'number' || data.version !== 1) {
    throw new Error('Unsupported sync payload version');
  }
  return {
    id: entryId,
    entryId,
    op: data.op,
    updatedAt: data.updatedAt,
    entry: data.entry,
    embedding: data.embedding ?? undefined
  };
}
