import { invoke } from '@tauri-apps/api/tauri';

class Database {
  private constructor(private readonly handle: string) {}

  static async load(uri: string): Promise<Database> {
    const handle = await invoke<string | undefined>('plugin:sql|load', {
      path: uri,
      db: uri,
    });
    return new Database(handle ?? uri);
  }

  async select<T>(query: string, values: unknown[] = []): Promise<T[]> {
    return invoke<T[]>('plugin:sql|select', {
      db: this.handle,
      query,
      values,
    });
  }

  async execute(query: string, values: unknown[] = []): Promise<void> {
    await invoke('plugin:sql|execute', {
      db: this.handle,
      query,
      values,
    });
  }

  async close(): Promise<void> {
    await invoke('plugin:sql|close', { db: this.handle });
  }
}

export default Database;
export type { Database };
