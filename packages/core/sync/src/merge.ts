import { SyncRepositoryEntry, MergeResult } from './types';

export type MergePlan = MergeResult & { accepted: SyncRepositoryEntry[] };

export function lastWriteWinsMerge(
  localSnapshot: Map<string, SyncRepositoryEntry>,
  remoteEntries: SyncRepositoryEntry[]
): MergePlan {
  const accepted: SyncRepositoryEntry[] = [];
  const conflicts: MergeResult['conflicts'] = [];
  for (const remote of remoteEntries) {
    const local = localSnapshot.get(remote.entryId);
    if (!local || remote.updatedAt >= local.updatedAt) {
      if (local && remote.updatedAt === local.updatedAt && remote.op === local.op) {
        // identical timestamp and op - treat as already applied
        continue;
      }
      if (local && remote.updatedAt > local.updatedAt) {
        conflicts.push({ entryId: remote.entryId, kept: 'remote', discardedUpdatedAt: local.updatedAt });
      }
      accepted.push(remote);
      localSnapshot.set(remote.entryId, remote);
    } else {
      conflicts.push({ entryId: remote.entryId, kept: 'local', discardedUpdatedAt: remote.updatedAt });
    }
  }
  return { applied: accepted.length, conflicts, accepted };
}
