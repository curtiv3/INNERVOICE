import Database from './tauri-plugin-sql-api';
type DatabaseInstance = Database;
import { runMigrations } from './migrations';

let databasePromise: Promise<DatabaseInstance> | null = null;

async function openDatabase(): Promise<DatabaseInstance> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const instance = await Database.load('sqlite:innervoice.db');
      await runMigrations(instance);
      return instance;
    })();
  }
  return databasePromise;
}

export async function getDatabase(): Promise<DatabaseInstance> {
  return openDatabase();
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const db = await openDatabase();
  await db.execute(sql, params);
}

export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await openDatabase();
  return db.select<T>(sql, params);
}
