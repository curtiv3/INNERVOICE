import { describe, expect, it } from 'vitest';
import { lastWriteWinsMerge } from '../merge';
import { SyncRepositoryEntry } from '../types';

describe('lastWriteWinsMerge', () => {
  it('prefers the more recent update and records conflicts', () => {
    const localEntry: SyncRepositoryEntry = {
      id: '1',
      entryId: 'entry-1',
      op: 'upsert',
      updatedAt: 100,
      entry: { text: 'alt' }
    };
    const remoteEntry: SyncRepositoryEntry = {
      id: '2',
      entryId: 'entry-1',
      op: 'upsert',
      updatedAt: 200,
      entry: { text: 'neu' }
    };
    const snapshot = new Map([[localEntry.entryId, localEntry]]);
    const plan = lastWriteWinsMerge(snapshot, [remoteEntry]);
    expect(plan.applied).toBe(1);
    expect(plan.accepted[0].entry).toEqual({ text: 'neu' });
    expect(plan.conflicts).toEqual([
      { entryId: 'entry-1', kept: 'remote', discardedUpdatedAt: 100 }
    ]);
  });
});
