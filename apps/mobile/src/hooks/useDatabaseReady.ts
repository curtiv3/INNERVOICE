import { useEffect, useState } from 'react';
import { runMigrations } from '../storage/migrations';

let migrationsPromise: Promise<void> | null = null;

async function ensureMigrations() {
  if (!migrationsPromise) {
    migrationsPromise = runMigrations().then(() => undefined);
  }
  await migrationsPromise;
}

export function useDatabaseReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureMigrations()
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);
  return ready;
}
