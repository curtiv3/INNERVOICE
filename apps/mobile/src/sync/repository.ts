import { SyncRepository, SyncRepositoryEntry } from '@innervoice/core-sync';
import { query, run } from '../storage/database';

async function getEntryPayload(entryId: string): Promise<Record<string, unknown>> {
  const rows = await query<Record<string, unknown>>('SELECT * FROM entries WHERE id = ?', [entryId]);
  if (rows.length === 0) {
    return { id: entryId };
  }
  return rows[0];
}

async function getEmbedding(entryId: string): Promise<number[] | undefined> {
  const rows = await query<{ dim: number; vec: Uint8Array | number[] | ArrayBuffer }>(
    'SELECT dim, vec FROM embeddings WHERE entry_id = ?',
    [entryId]
  );
  if (rows.length === 0) return undefined;
  const row = rows[0];
  const buffer = row.vec instanceof Uint8Array
    ? row.vec
    : Array.isArray(row.vec)
      ? new Uint8Array(Float32Array.from(row.vec as number[]).buffer)
      : new Uint8Array(row.vec as ArrayBuffer);
  const floatView = new Float32Array(buffer.buffer.slice(0));
  return Array.from(floatView).slice(0, row.dim);
}

async function listPending(): Promise<SyncRepositoryEntry[]> {
  const logs = await query<{ id: string; entry_id: string; op: 'upsert' | 'delete'; ts: number }>(
    'SELECT id, entry_id, op, ts FROM sync_log'
  );
  const entries: SyncRepositoryEntry[] = [];
  for (const log of logs) {
    const entryPayload = await getEntryPayload(log.entry_id);
    entries.push({
      id: log.id,
      entryId: log.entry_id,
      op: log.op,
      updatedAt: log.ts,
      entry: entryPayload,
      embedding: await getEmbedding(log.entry_id)
    });
  }
  return entries;
}

async function markSynced(ids: string[]): Promise<void> {
  for (const id of ids) {
    await run('DELETE FROM sync_log WHERE id = ?', [id]);
  }
}

async function applyRemote(entries: SyncRepositoryEntry[]): Promise<void> {
  for (const item of entries) {
    if (item.op === 'delete') {
      await run('UPDATE entries SET deleted = 1, updated_at = ? WHERE id = ?', [item.updatedAt, item.entryId]);
      continue;
    }
    const payload = item.entry as Record<string, unknown>;
    const text = (payload.text as string) ?? '';
    const moodScore = (payload.mood_score as number) ?? null;
    const activePersona = (payload.active_persona as string) ?? null;
    const counterPersona = (payload.counter_persona as string) ?? null;
    const responseJson = typeof payload.response_json === 'string' ? (payload.response_json as string) : serializeMaybe(payload.response_json);
    const audioUri = (payload.audio_uri as string) ?? null;
    const wordsJson = typeof payload.words_json === 'string' ? (payload.words_json as string) : serializeMaybe(payload.words_json);
    const hintsJson = typeof payload.hints_json === 'string' ? (payload.hints_json as string) : serializeMaybe(payload.hints_json);
    const createdAt = (payload.created_at as number) ?? item.updatedAt;
    const favoriteValue = typeof payload.favorite === 'number'
      ? (payload.favorite as number)
      : (payload.favorite ? 1 : 0);
    await run(
      'INSERT OR IGNORE INTO entries (id, created_at, text, mood_score, updated_at, deleted, favorite) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [item.entryId, createdAt, text, moodScore, item.updatedAt, favoriteValue]
    );
    await run(
      `UPDATE entries SET text = ?, mood_score = ?, active_persona = ?, counter_persona = ?, response_json = ?, audio_uri = ?, words_json = ?, hints_json = ?, updated_at = ?, deleted = 0, favorite = ? WHERE id = ?`,
      [
        text,
        moodScore,
        activePersona,
        counterPersona,
        responseJson,
        audioUri,
        wordsJson,
        hintsJson,
        item.updatedAt,
        favoriteValue,
        item.entryId
      ]
    );
    if (item.embedding) {
      const floatBuffer = Float32Array.from(item.embedding).buffer.slice(0);
      await run('INSERT OR REPLACE INTO embeddings (entry_id, dim, vec) VALUES (?, ?, ?)', [
        item.entryId,
        item.embedding.length,
        new Uint8Array(floatBuffer)
      ]);
    }
  }
}

function serializeMaybe(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export const mobileSyncRepository: SyncRepository = {
  listPending,
  markSynced,
  applyRemote
};
