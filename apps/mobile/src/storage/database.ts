import { open, QuickSQLiteConnection, ResultSet } from 'react-native-quick-sqlite';

let connection: QuickSQLiteConnection | null = null;

export function getDatabase(): QuickSQLiteConnection {
  if (!connection) {
    connection = open({ name: 'innervoice.db' });
  }
  return connection;
}

async function executeInternal(sql: string, params: unknown[] = []): Promise<ResultSet> {
  const db = getDatabase();
  if (db.executeAsync) {
    return db.executeAsync(sql, params);
  }
  return Promise.resolve(db.execute(sql, params));
}

export async function run(sql: string, params: unknown[] = []): Promise<ResultSet> {
  return executeInternal(sql, params);
}

export async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await executeInternal(sql, params);
  const { rows } = result;
  const items: T[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rows.item(i) as T);
  }
  return items;
}
