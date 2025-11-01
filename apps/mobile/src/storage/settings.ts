import { query, run } from './database';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return rows.length > 0 ? (rows[0].value as string) : null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await run('DELETE FROM settings WHERE key = ?', [key]);
  } else {
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

export async function getBooleanSetting(key: string, fallback = false): Promise<boolean> {
  const value = await getSetting(key);
  if (value === null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export async function setBooleanSetting(key: string, enabled: boolean): Promise<void> {
  await setSetting(key, enabled ? '1' : '0');
}
