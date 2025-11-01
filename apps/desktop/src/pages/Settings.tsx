import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { getBooleanSetting, getSetting, setBooleanSetting, setSetting } from '../lib/settings';
import { ensureDesktopContentKey, hasContentKey } from '../lib/crypto';
import { getPreparedBlobCount, syncNow } from '../sync/service';
import { verifyWhisperModelPath, whisperInit } from '../lib/whisper';

const SYNC_ENABLED_KEY = 'sync_enabled';
const WHISPER_MODEL_PATH_KEY = 'whisper_model_path';
const WHISPER_INITIALIZED_KEY = 'whisper_initialized';

type WhisperStatus = 'unconfigured' | 'ready' | 'error';

function resolveWhisperLabel(status: WhisperStatus): string {
  switch (status) {
    case 'ready':
      return 'Bereit';
    case 'error':
      return 'Fehler';
    default:
      return 'Nicht konfiguriert';
  }
}

function resolveWhisperBadgeClass(status: WhisperStatus): string {
  if (status === 'ready') return 'badge badge-ready';
  if (status === 'error') return 'badge badge-error';
  return 'badge';
}

function SettingsPage() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(0);
  const [hasKey, setHasKey] = useState(false);

  const [whisperPath, setWhisperPath] = useState('');
  const [whisperReady, setWhisperReady] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>('unconfigured');
  const [whisperMessage, setWhisperMessage] = useState<string | null>(null);
  const [whisperBusy, setWhisperBusy] = useState<'verify' | 'init' | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const enabled = await getBooleanSetting(SYNC_ENABLED_KEY, false);
      const keyAvailable = await hasContentKey();
      const storedPath = await getSetting(WHISPER_MODEL_PATH_KEY);
      const initialized = await getBooleanSetting(WHISPER_INITIALIZED_KEY, false);
      if (!mounted) return;
      setSyncEnabled(enabled);
      setHasKey(keyAvailable);
      setPrepared(getPreparedBlobCount());
      if (storedPath) {
        setWhisperPath(storedPath);
        try {
          await verifyWhisperModelPath(storedPath);
          setWhisperStatus(initialized ? 'ready' : 'unconfigured');
          setWhisperReady(initialized);
          setWhisperMessage(
            initialized
              ? 'Whisper-Modell ist initialisiert und einsatzbereit.'
              : 'Modell verifiziert. Initialisiere, um es zu laden.'
          );
        } catch (error) {
          console.error('Whisper-Modell konnte nicht verifiziert werden', error);
          setWhisperStatus('error');
          setWhisperReady(false);
          setWhisperMessage((error as Error).message ?? 'Modellprüfung fehlgeschlagen.');
        }
      } else {
        setWhisperPath('');
        setWhisperReady(false);
        setWhisperStatus('unconfigured');
        setWhisperMessage('Wähle ein Whisper ggml/gguf Modell aus.');
      }
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

  const pickWhisperModel = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Whisper ggml/gguf', extensions: ['bin', 'ggml', 'gguf'] },
        { name: 'Alle Dateien', extensions: ['*'] }
      ]
    });
    if (!selected) return;
    const value = Array.isArray(selected) ? selected[0] : selected;
    if (!value) return;
    setWhisperPath(value);
    await setSetting(WHISPER_MODEL_PATH_KEY, value);
    await setBooleanSetting(WHISPER_INITIALIZED_KEY, false);
    setWhisperReady(false);
    setWhisperStatus('unconfigured');
    setWhisperMessage('Modellpfad gespeichert. Bitte verifizieren und initialisieren.');
  }, []);

  const verifyWhisper = useCallback(async () => {
    if (!whisperPath) {
      setWhisperMessage('Bitte wähle zunächst einen Modellpfad aus.');
      return;
    }
    setWhisperBusy('verify');
    setWhisperMessage('Prüfe Modell…');
    try {
      await verifyWhisperModelPath(whisperPath);
      setWhisperStatus(whisperReady ? 'ready' : 'unconfigured');
      setWhisperMessage(
        whisperReady
          ? 'Modell verifiziert – bereit für Transkriptionen.'
          : 'Modell verifiziert. Jetzt initialisieren, um es zu laden.'
      );
    } catch (error) {
      console.error('Whisper-Verifikation fehlgeschlagen', error);
      setWhisperStatus('error');
      setWhisperReady(false);
      await setBooleanSetting(WHISPER_INITIALIZED_KEY, false);
      setWhisperMessage((error as Error).message ?? 'Verifikation fehlgeschlagen.');
    } finally {
      setWhisperBusy(null);
    }
  }, [whisperPath, whisperReady]);

  const initializeWhisper = useCallback(async () => {
    if (!whisperPath) {
      setWhisperMessage('Bitte wähle zunächst einen Modellpfad aus.');
      return;
    }
    setWhisperBusy('init');
    setWhisperMessage('Initialisiere Whisper…');
    try {
      await verifyWhisperModelPath(whisperPath);
      const result = await whisperInit(whisperPath);
      setWhisperStatus('ready');
      setWhisperReady(true);
      await setBooleanSetting(WHISPER_INITIALIZED_KEY, true);
      setWhisperMessage(result || 'Whisper initialisiert.');
    } catch (error) {
      console.error('Whisper-Initialisierung fehlgeschlagen', error);
      setWhisperStatus('error');
      setWhisperReady(false);
      await setBooleanSetting(WHISPER_INITIALIZED_KEY, false);
      setWhisperMessage((error as Error).message ?? 'Initialisierung fehlgeschlagen.');
    } finally {
      setWhisperBusy(null);
    }
  }, [whisperPath]);

  const whisperBadge = useMemo(
    () => resolveWhisperBadgeClass(whisperStatus),
    [whisperStatus]
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
          {hasKey ? 'Geräteschlüssel vorhanden.' : 'Noch kein Geräteschlüssel initialisiert.'} · {prepared} vorbereitete Blobs
        </p>
        {message ? <p className="status">{message}</p> : null}
      </section>
      <section className="card model-card">
        <div className="card-header">
          <div>
            <h2>Whisper</h2>
            <p className="muted small">Offline-Transkription mit whisper.cpp (ggml/gguf).</p>
          </div>
          <span className={whisperBadge}>{resolveWhisperLabel(whisperStatus)}</span>
        </div>
        <div className="whisper-path">
          <span className="muted small">Modellpfad</span>
          <code>{whisperPath || 'Kein Modell ausgewählt.'}</code>
        </div>
        <div className="whisper-actions">
          <button className="ghost" onClick={pickWhisperModel}>
            Modellpfad wählen…
          </button>
          <button
            className="ghost"
            onClick={verifyWhisper}
            disabled={!whisperPath || whisperBusy === 'init'}
          >
            {whisperBusy === 'verify' ? 'Prüfe…' : 'Verifizieren'}
          </button>
          <button
            className="primary"
            onClick={initializeWhisper}
            disabled={!whisperPath || whisperBusy === 'verify'}
          >
            {whisperBusy === 'init' ? 'Initialisiere…' : 'Initialisieren'}
          </button>
        </div>
        {whisperMessage ? (
          <p className={`status${whisperStatus === 'error' ? ' error' : ''}`}>{whisperMessage}</p>
        ) : null}
      </section>
    </div>
  );
}

export default SettingsPage;
