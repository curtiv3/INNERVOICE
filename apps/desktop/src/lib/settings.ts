import { execute, select } from './database';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await select<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (rows.length === 0) return null;
  const row = rows[0];
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await execute('DELETE FROM settings WHERE key = ?', [key]);
  } else {
    await execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

export async function getBooleanSetting(key: string, fallback = false): Promise<boolean> {
  const value = await getSetting(key);
  if (value === null) return fallback;
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export async function setBooleanSetting(key: string, enabled: boolean): Promise<void> {
  await setSetting(key, enabled ? '1' : '0');
}
