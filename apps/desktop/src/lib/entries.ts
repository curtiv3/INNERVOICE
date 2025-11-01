import { embedText, cosineSimilarity } from '@innervoice/core-embeddings';
import type { EmotionHints, PersonaLabel } from '@innervoice/persona-core';
import { decryptPayload, encryptPayload } from './crypto';
import { execute, select } from './database';

export type EntryRecord = {
  id: string;
  created_at: number;
  text: string;
  mood_score: number | null;
  active_persona: PersonaLabel | null;
  counter_persona: string | null;
  response_json: string | null;
  audio_uri: string | null;
  words_json: string | null;
  hints_json: string | null;
  updated_at: number;
  deleted: number;
  favorite: number;
};

export type EntryHints = Pick<EmotionHints, 'arousal' | 'tempoClass' | 'pauses_ratio'> & {
  pausesClass?: EmotionHints['pausesClass'];
};

export type SaveEntryPayload = {
  id: string;
  text: string;
  activePersona: PersonaLabel | null;
  counterPersona?: string | null;
  response?: unknown;
  hints?: EntryHints | null;
  moodScore?: number | null;
  embedding?: Float32Array | null;
};

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

export type EntryDetail = {
  id: string;
  text: string;
  activePersona: PersonaLabel | null;
  counterPersona: string | null;
  response: unknown | null;
  hints: EntryHints | null;
  created_at: number;
  updated_at: number;
};

function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

async function recordSync(entryId: string, op: 'upsert' | 'delete', timestamp: number) {
  await execute('INSERT OR REPLACE INTO sync_log (id, entry_id, op, ts) VALUES (?, ?, ?, ?)', [
    entryId,
    entryId,
    op,
    timestamp
  ]);
}

function vectorToParam(vector: Float32Array): number[] {
  return Array.from(new Uint8Array(vector.buffer.slice(0)));
}

function parseVector(dim: number | null, raw: unknown): Float32Array | null {
  if (!dim || !raw) return null;
  if (Array.isArray(raw)) {
    const uint = new Uint8Array(raw as number[]);
    return new Float32Array(uint.buffer).slice(0, dim);
  }
  if (raw instanceof Uint8Array) {
    return new Float32Array(raw.buffer.slice(0)).slice(0, dim);
  }
  if (raw instanceof ArrayBuffer) {
    return new Float32Array(raw).slice(0, dim);
  }
  return null;
}

export async function saveEntry(payload: SaveEntryPayload): Promise<void> {
  const now = Date.now();
  await execute(
    'INSERT OR IGNORE INTO entries (id, created_at, text, mood_score, updated_at, deleted, favorite) VALUES (?, ?, ?, ?, ?, 0, 0)',
    [payload.id, now, payload.text, payload.moodScore ?? null, now]
  );
  const encryptedResponse = await encryptPayload(payload.response ?? null);
  const hintsPayload = payload.hints
    ? {
        arousal: payload.hints.arousal,
        tempoClass: payload.hints.tempoClass,
        pauses_ratio: payload.hints.pauses_ratio,
        pausesClass: payload.hints.pausesClass ?? null
      }
    : null;
  await execute(
    `UPDATE entries SET text = ?, mood_score = ?, active_persona = ?, counter_persona = ?, response_json = ?, hints_json = ?, updated_at = ?, deleted = 0 WHERE id = ?`,
    [
      payload.text,
      payload.moodScore ?? null,
      payload.activePersona ?? null,
      payload.counterPersona ?? null,
      encryptedResponse,
      serialize(hintsPayload),
      now,
      payload.id
    ]
  );
  if (payload.embedding) {
    await execute('INSERT OR REPLACE INTO embeddings (entry_id, dim, vec) VALUES (?, ?, ?)', [
      payload.id,
      payload.embedding.length,
      vectorToParam(payload.embedding)
    ]);
  }
  await recordSync(payload.id, 'upsert', now);
}

export async function updateEntryResponse(
  entryId: string,
  response: unknown,
  counterPersona: string | null
): Promise<void> {
  const now = Date.now();
  const encrypted = await encryptPayload(response);
  await execute('UPDATE entries SET response_json = ?, counter_persona = ?, updated_at = ? WHERE id = ?', [
    encrypted,
    counterPersona ?? null,
    now,
    entryId
  ]);
  await recordSync(entryId, 'upsert', now);
}

export async function listHistoryEntries(): Promise<HistoryEntry[]> {
  const rows = await select<
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

export async function listHistoryEntriesWithEmbeddings(): Promise<
  (HistoryEntry & { embedding: Float32Array | null })[]
> {
  const rows = await select<
    HistoryEntry & {
      hints_json: string | null;
      favorite: number;
      pendingSync: number;
      dim: number | null;
      vec: number[] | Uint8Array | ArrayBuffer | null;
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
    embedding: parseVector(row.dim, row.vec)
  }));
}

export async function searchEntries(query: string): Promise<HistoryEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return listHistoryEntries();
  }
  const reference = embedText(trimmed);
  const candidates = await listHistoryEntriesWithEmbeddings();
  const scored = candidates
    .map(entry => ({
      ...entry,
      score: entry.embedding ? cosineSimilarity(reference, entry.embedding) : -Infinity
    }))
    .filter(entry => Number.isFinite(entry.score ?? -Infinity))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 20)
    .map(entry => ({
      id: entry.id,
      text: entry.text,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      pendingSync: entry.pendingSync,
      hasHints: entry.hasHints,
      favorite: entry.favorite,
      score: entry.score
    }));
  return scored;
}

export async function loadEntryDetail(id: string): Promise<EntryDetail | null> {
  const rows = await select<EntryRecord>('SELECT * FROM entries WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return null;
  const record = rows[0];
  const hints = record.hints_json
    ? (() => {
        const raw = JSON.parse(record.hints_json) as Partial<EntryHints> & { pausesClass?: string | null };
        if (!raw) return null;
        return {
          arousal: raw.arousal ?? 0,
          tempoClass: raw.tempoClass ?? 'neutral',
          pauses_ratio: raw.pauses_ratio ?? 0,
          pausesClass: raw.pausesClass ?? undefined
        } satisfies EntryHints;
      })()
    : null;
  const response = await decryptPayload(record.response_json);
  return {
    id: record.id,
    text: record.text,
    activePersona: record.active_persona,
    counterPersona: record.counter_persona,
    response,
    hints,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

export async function markFavorite(entryId: string, favorite: boolean): Promise<void> {
  const now = Date.now();
  await execute('UPDATE entries SET favorite = ?, updated_at = ? WHERE id = ?', [favorite ? 1 : 0, now, entryId]);
  await recordSync(entryId, 'upsert', now);
}

export async function deleteEntry(entryId: string): Promise<void> {
  const now = Date.now();
  await execute('UPDATE entries SET deleted = 1, updated_at = ? WHERE id = ?', [now, entryId]);
  await recordSync(entryId, 'delete', now);
}

export async function ensureEmbedding(entryId: string, text: string): Promise<void> {
  const vector = embedText(text);
  await execute('INSERT OR REPLACE INTO embeddings (entry_id, dim, vec) VALUES (?, ?, ?)', [
    entryId,
    vector.length,
    vectorToParam(vector)
  ]);
}
