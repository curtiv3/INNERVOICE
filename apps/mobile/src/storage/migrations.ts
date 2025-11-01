import { query, run } from './database';

export type MigrationResult = {
  executed: string[];
};

async function columnExists(table: string, column: string): Promise<boolean> {
  const info = await query<{ name: string }>(`PRAGMA table_info(${table})`);
  return info.some(col => col.name === column);
}

async function ensureColumn(table: string, definition: string, executed: string[]) {
  const column = definition.split(' ')[0];
  if (!(await columnExists(table, column))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    executed.push(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export async function runMigrations(): Promise<MigrationResult> {
  const executed: string[] = [];
  await run(
    `CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      created_at INTEGER,
      text TEXT,
      mood_score INTEGER,
      active_persona TEXT NULL,
      counter_persona TEXT NULL,
      response_json TEXT NULL,
      audio_uri TEXT NULL,
      words_json TEXT NULL,
      hints_json TEXT NULL,
      updated_at INTEGER,
      deleted INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0
    )`
  );
  executed.push('CREATE TABLE IF NOT EXISTS entries');

  await ensureColumn('entries', 'words_json TEXT NULL', executed);
  await ensureColumn('entries', 'hints_json TEXT NULL', executed);
  await ensureColumn('entries', 'updated_at INTEGER', executed);
  await ensureColumn('entries', 'deleted INTEGER DEFAULT 0', executed);
  await ensureColumn('entries', 'audio_uri TEXT NULL', executed);
  await ensureColumn('entries', 'favorite INTEGER DEFAULT 0', executed);

  await run(
    `CREATE TABLE IF NOT EXISTS embeddings (
      entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
      dim INTEGER NOT NULL,
      vec BLOB NOT NULL
    )`
  );
  executed.push('CREATE TABLE IF NOT EXISTS embeddings');

  await run(
    `CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      entry_id TEXT,
      op TEXT CHECK(op IN ('upsert','delete')),
      ts INTEGER
    )`
  );
  executed.push('CREATE TABLE IF NOT EXISTS sync_log');

  await run(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  );
  executed.push('CREATE TABLE IF NOT EXISTS settings');

  return { executed };
}
