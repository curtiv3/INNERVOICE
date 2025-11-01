import { ensureContentKey, DeviceKeyStore, WrappedContentKeyStore } from '@innervoice/core-crypto';
import { lastWriteWinsMerge } from './merge';
import { unpackEntry } from './unpack';
import { SyncAdapter, SyncRepository, SyncRepositoryEntry, MergeResult } from './types';

export type SnapshotProvider = () => Promise<Map<string, SyncRepositoryEntry>>;

export type PullContext = {
  adapter: SyncAdapter;
  repository: SyncRepository;
  deviceKeyStore: DeviceKeyStore;
  contentKeyStore: WrappedContentKeyStore;
  snapshot: SnapshotProvider;
};

export type PullReport = {
  pulled: number;
  merge: MergeResult;
};

export async function pullRemoteChanges(context: PullContext): Promise<PullReport> {
  if (!context.adapter.listBlobs || !context.adapter.getBlob) {
    return { pulled: 0, merge: { applied: 0, conflicts: [] } };
  }
  const infos = await context.adapter.listBlobs();
  if (!infos || infos.length === 0) {
    return { pulled: 0, merge: { applied: 0, conflicts: [] } };
  }
  const contentKey = await ensureContentKey(context.contentKeyStore, context.deviceKeyStore);
  const localSnapshot = await context.snapshot();
  const unpacked: SyncRepositoryEntry[] = [];
  for (const info of infos) {
    const payload = await context.adapter.getBlob!(info.id);
    if (!payload) continue;
    try {
      unpacked.push(await unpackEntry(payload, info.entryId, contentKey));
    } catch (error) {
      // skip corrupted payloads but continue processing
    }
  }
  const plan = lastWriteWinsMerge(localSnapshot, unpacked);
  if (plan.accepted.length > 0) {
    await context.repository.applyRemote(plan.accepted);
  }
  return { pulled: unpacked.length, merge: { applied: plan.applied, conflicts: plan.conflicts } };
}
