import { EmotionHints, WordTime } from '@innervoice/persona-core';
import { run, query } from './database';

export type EntryRecord = {
  id: string;
  created_at: number;
  text: string;
  mood_score: number | null;
  active_persona: string | null;
  counter_persona: string | null;
  response_json: string | null;
  audio_uri: string | null;
  words_json: string | null;
  hints_json: string | null;
  updated_at: number;
  deleted: number;
  favorite: number;
};

export type EntryUpsertInput = {
  id: string;
  text: string;
  moodScore?: number | null;
  activePersona?: string | null;
  counterPersona?: string | null;
  response?: unknown;
  audioUri?: string | null;
  words?: WordTime[];
  hints?: Pick<EmotionHints, 'arousal' | 'tempoClass' | 'pauses_ratio'> & { pausesClass?: EmotionHints['pausesClass'] };
  favorite?: boolean;
};

export type EmbeddingInput = {
  entryId: string;
  vector: number[] | Float32Array;
};

function serializeJSON(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.stringify(value);
}

async function recordSync(entryId: string, op: 'upsert' | 'delete', timestamp: number) {
  await run('INSERT OR REPLACE INTO sync_log (id, entry_id, op, ts) VALUES (?, ?, ?, ?)', [
    entryId,
    entryId,
    op,
    timestamp
  ]);
}

export async function upsertEntry(input: EntryUpsertInput): Promise<void> {
  const now = Date.now();
  const words = input.words?.map(word => ({ text: word.text, start: word.start, end: word.end }));
  await run(
    'INSERT OR IGNORE INTO entries (id, created_at, text, mood_score, updated_at, deleted, favorite) VALUES (?, ?, ?, ?, ?, 0, 0)',
    [input.id, now, input.text, input.moodScore ?? null, now]
  );
  await run(
    `UPDATE entries SET text = ?, mood_score = ?, active_persona = ?, counter_persona = ?, response_json = ?, audio_uri = ?, words_json = ?, hints_json = ?, updated_at = ?, deleted = 0, favorite = COALESCE(?, favorite) WHERE id = ?`,
    [
      input.text,
      input.moodScore ?? null,
      input.activePersona ?? null,
      input.counterPersona ?? null,
      serializeJSON(input.response),
      input.audioUri ?? null,
      serializeJSON(words),
      serializeJSON(
        input.hints
          ? {
              arousal: input.hints.arousal,
              tempoClass: input.hints.tempoClass,
              pauses_ratio: input.hints.pauses_ratio,
              pausesClass: input.hints.pausesClass ?? null
            }
          : null
      ),
      now,
      input.favorite != null ? (input.favorite ? 1 : 0) : null,
      input.id
    ]
  );
  await recordSync(input.id, 'upsert', now);
}

export async function markEntryDeleted(entryId: string): Promise<void> {
  const now = Date.now();
  await run('UPDATE entries SET deleted = 1, updated_at = ? WHERE id = ?', [now, entryId]);
  await recordSync(entryId, 'delete', now);
}

export async function saveEmbedding({ entryId, vector }: EmbeddingInput): Promise<void> {
  const dim = vector.length;
  const floatView =
    vector instanceof Float32Array ? vector : Float32Array.from(vector as number[]);
  const buffer = new Uint8Array(floatView.buffer.slice(0));
  await run(
    'INSERT OR REPLACE INTO embeddings (entry_id, dim, vec) VALUES (?, ?, ?)',
    [entryId, dim, buffer]
  );
}

export type HistoryEntry = {
  id: string;
  text: string;
  created_at: number;
  updated_at: number;
  pendingSync: boolean;
  hasHints: boolean;
  favorite: boolean;
  score?: number;
};

export async function listHistoryEntries(): Promise<HistoryEntry[]> {
  const rows = await query<
    HistoryEntry & { hints_json: string | null; pendingSync: number; favorite: number }
  >(
    `SELECT e.id, e.text, e.created_at, e.updated_at, e.hints_json, e.favorite,
            CASE WHEN s.ts IS NOT NULL THEN 1 ELSE 0 END AS pendingSync
     FROM entries e
     LEFT JOIN sync_log s ON s.entry_id = e.id
     WHERE e.deleted = 0
     ORDER BY e.favorite DESC, e.updated_at DESC`
  );
  return rows.map(row => ({
    id: row.id,
    text: row.text,
    created_at: row.created_at,
    updated_at: row.updated_at,
    pendingSync: !!row.pendingSync,
    hasHints: Boolean(row.hints_json),
    favorite: !!row.favorite
  }));
}

export type HistoryEntryWithEmbedding = HistoryEntry & {
  embedding: Float32Array | null;
};

function deserializeEmbedding(
  dim: number | null | undefined,
  vec: Uint8Array | number[] | ArrayBuffer | null
): Float32Array | null {
  if (!dim || !vec) return null;
  const buffer =
    vec instanceof Uint8Array
      ? vec
      : Array.isArray(vec)
        ? new Uint8Array(Float32Array.from(vec as number[]).buffer)
        : new Uint8Array((vec as ArrayBuffer) ?? new ArrayBuffer(0));
  const floatView = new Float32Array(buffer.buffer.slice(0));
  return floatView.slice(0, dim);
}

export async function listHistoryEntriesWithEmbeddings(): Promise<HistoryEntryWithEmbedding[]> {
  const rows = await query<
    HistoryEntry & {
      favorite: number;
      hints_json: string | null;
      pendingSync: number;
      dim: number | null;
      vec: Uint8Array | number[] | ArrayBuffer | null;
    }
  >(
    `SELECT e.id, e.text, e.created_at, e.updated_at, e.hints_json, e.favorite,
            CASE WHEN s.ts IS NOT NULL THEN 1 ELSE 0 END AS pendingSync,
            emb.dim, emb.vec
     FROM entries e
     LEFT JOIN sync_log s ON s.entry_id = e.id
     LEFT JOIN embeddings emb ON emb.entry_id = e.id
     WHERE e.deleted = 0`
  );
  return rows.map(row => ({
    id: row.id,
    text: row.text,
    created_at: row.created_at,
    updated_at: row.updated_at,
    pendingSync: !!row.pendingSync,
    hasHints: Boolean(row.hints_json),
    favorite: !!row.favorite,
    embedding: deserializeEmbedding(row.dim, row.vec)
  }));
}

export async function setEntryFavorite(entryId: string, favorite: boolean): Promise<void> {
  const now = Date.now();
  await run('UPDATE entries SET favorite = ?, updated_at = ? WHERE id = ?', [favorite ? 1 : 0, now, entryId]);
  await recordSync(entryId, 'upsert', now);
}

export async function updateEntryResponse(
  entryId: string,
  response: unknown,
  counterPersona: string | null
): Promise<void> {
  const now = Date.now();
  await run('UPDATE entries SET response_json = ?, counter_persona = ?, updated_at = ? WHERE id = ?', [
    serializeJSON(response),
    counterPersona,
    now,
    entryId
  ]);
  await recordSync(entryId, 'upsert', now);
}

export async function loadEntry(entryId: string): Promise<EntryRecord | null> {
  const rows = await query<EntryRecord>('SELECT * FROM entries WHERE id = ?', [entryId]);
  return rows.length > 0 ? rows[0] : null;
}

export async function loadPendingSyncEntries() {
  return query<{ id: string; entry_id: string; op: 'upsert' | 'delete'; ts: number }>('SELECT id, entry_id, op, ts FROM sync_log');
}
