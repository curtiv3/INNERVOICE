declare module 'react-native-quick-sqlite' {
  export type ResultSet = {
    rows: { length: number; item: (index: number) => Record<string, unknown> };
    rowsAffected: number;
    insertId?: number;
  };

  export type QuickSQLiteConnection = {
    execute(sql: string, params?: unknown[]): ResultSet;
    executeAsync?(sql: string, params?: unknown[]): Promise<ResultSet>;
    close?(): void;
  };

  export function open(options: { name: string; location?: string }): QuickSQLiteConnection;
}
