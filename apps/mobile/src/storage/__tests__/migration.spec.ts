import { describe, expect, it, vi, beforeEach } from 'vitest';

const runMock = vi.fn(async () => ({ rows: { length: 0, item: () => ({}) }, rowsAffected: 0 }));
const tableColumns = new Map<string, Set<string>>();

vi.mock('../database', () => ({
  run: runMock,
  query: vi.fn(async (sql: string) => {
    if (sql.startsWith('PRAGMA table_info')) {
      const table = sql.match(/PRAGMA table_info\(([^)]+)\)/)?.[1] ?? '';
      const cols = tableColumns.get(table) ?? new Set<string>();
      return Array.from(cols).map(name => ({ name }));
    }
    return [];
  })
}));

import { runMigrations } from '../migrations';

function registerColumns(statement: string) {
  const match = statement.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
  if (match) {
    const [, table, column] = match;
    if (!tableColumns.has(table)) {
      tableColumns.set(table, new Set());
    }
    tableColumns.get(table)!.add(column);
  }
}

runMock.mockImplementation(async (sql: string) => {
  registerColumns(sql);
  if (sql.startsWith('CREATE TABLE IF NOT EXISTS entries')) {
    tableColumns.set(
      'entries',
      new Set([
        'id',
        'created_at',
        'text',
        'mood_score',
        'active_persona',
        'counter_persona',
        'response_json',
        'audio_uri',
        'words_json',
        'hints_json',
        'updated_at',
        'deleted',
        'favorite'
      ])
    );
  }
  return { rows: { length: 0, item: () => ({}) }, rowsAffected: 0 };
});

describe('migrations', () => {
  beforeEach(() => {
    tableColumns.clear();
    runMock.mockClear();
  });

  it('can run multiple times without throwing', async () => {
    await expect(runMigrations()).resolves.toBeDefined();
    await expect(runMigrations()).resolves.toBeDefined();
    expect(runMock).toHaveBeenCalled();
  });
});
