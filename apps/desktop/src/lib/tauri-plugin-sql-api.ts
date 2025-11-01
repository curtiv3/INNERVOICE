import { invoke } from '@tauri-apps/api/tauri';

class Database {
  private constructor(private readonly handle: string) {}

  static async load(uri: string): Promise<Database> {
    const handle = await invoke<string | undefined>('sql_load', {
      path: uri,
    });
    return new Database(handle ?? uri);
  }

  async select<T>(query: string, values: unknown[] = []): Promise<T[]> {
    return invoke<T[]>('sql_select', {
      db: this.handle,
      query,
      values,
    });
  }

  async execute(query: string, values: unknown[] = []): Promise<void> {
    await invoke('sql_execute', {
      db: this.handle,
      query,
      values,
    });
  }

  async close(): Promise<void> {
    await invoke('sql_close', { db: this.handle });
  }
}

export default Database;
export type { Database };
