import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getBooleanSetting, setBooleanSetting } from '../lib/settings';
import { ensureDesktopContentKey, hasContentKey } from '../lib/crypto';
import { getPreparedBlobCount, syncNow } from '../sync/service';

const SYNC_ENABLED_KEY = 'sync_enabled';

function SettingsPage() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(0);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const enabled = await getBooleanSetting(SYNC_ENABLED_KEY, false);
      const keyAvailable = await hasContentKey();
      if (!mounted) return;
      setSyncEnabled(enabled);
      setHasKey(keyAvailable);
      setPrepared(getPreparedBlobCount());
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSync = useCallback(
    async (next: boolean) => {
      setSyncEnabled(next);
      await setBooleanSetting(SYNC_ENABLED_KEY, next);
      if (next) {
        await ensureDesktopContentKey();
        setHasKey(true);
      }
    },
    []
  );

  const handleSyncNow = useCallback(async () => {
    setMessage('Bereite Sync vor…');
    try {
      const report = await syncNow();
      setPrepared(report.blobs.length);
      setMessage(`Lokale Blobs vorbereitet: ${report.blobs.length}`);
    } catch (error) {
      console.error('Sync fehlgeschlagen', error);
      setMessage('Sync fehlgeschlagen – offline?');
    }
  }, []);

  const modelInfo = useMemo(
    () => [
      { name: 'Embeddings', status: 'On-Device (heuristisch)', ready: true },
      { name: 'Persona Engine', status: 'Regelwerk aktiv', ready: true },
      { name: 'Whisper', status: 'Desktop-Port in Arbeit', ready: false }
    ],
    []
  );

  return (
    <div className="page">
      <section className="card">
        <h2>Sync & Sicherheit</h2>
        {loading ? (
          <p className="muted">Lade Einstellungen…</p>
        ) : (
          <div className="settings-row">
            <label>
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={event => toggleSync(event.target.checked)}
              />
              <span>E2EE-Sync (Beta)</span>
            </label>
            <p className="muted small">
              {syncEnabled ? 'Sync ist vorbereitet. Nur manuell auslösen.' : 'Standard bleibt offline-only.'}
            </p>
          </div>
        )}
        <button className="secondary" onClick={handleSyncNow} disabled={!syncEnabled}>
          Jetzt synchronisieren
        </button>
        <p className="muted small">
          {hasKey ? 'Geräteschlüssel vorhanden.' : 'Noch kein Geräteschlüssel initialisiert.'} ·{' '}
          {prepared} vorbereitete Blobs
        </p>
        {message ? <p className="status">{message}</p> : null}
      </section>
      <section className="card">
        <h2>Modelle</h2>
        <ul className="model-list">
          {modelInfo.map(model => (
            <li key={model.name} className={model.ready ? 'model ready' : 'model'}>
              <div>
                <strong>{model.name}</strong>
                <p className="muted small">{model.status}</p>
              </div>
              <span>{model.ready ? 'Bereit' : 'In Arbeit'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default SettingsPage;
