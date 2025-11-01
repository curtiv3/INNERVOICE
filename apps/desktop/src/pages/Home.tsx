import React, { useCallback, useEffect, useState } from 'react';
import { readTextFile } from '@tauri-apps/api/fs';
import { createDialogFromText } from '../lib/dialog';
import { getBooleanSetting, getSetting } from '../lib/settings';
import { whisperTranscribeWav16Mono } from '../lib/whisper';

const HINT_TEXT = 'Offline • verschlüsselt · Dateien bleiben auf deinem Gerät';

const WHISPER_MODEL_PATH_KEY = 'whisper_model_path';
const WHISPER_INITIALIZED_KEY = 'whisper_initialized';

type HomePageProps = {
  onCreateDialog(entryId: string): void;
  onOpenHistory(): void;
  onOpenSettings(): void;
};

function normalizeLanguage(value: string | undefined): 'de' | 'en' {
  if (!value) return 'de';
  return value.toLowerCase().startsWith('en') ? 'en' : 'de';
}

function HomePage({ onCreateDialog, onOpenHistory, onOpenSettings }: HomePageProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [whisperReady, setWhisperReady] = useState(false);
  const [whisperConfigured, setWhisperConfigured] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const path = await getSetting(WHISPER_MODEL_PATH_KEY);
      const ready = await getBooleanSetting(WHISPER_INITIALIZED_KEY, false);
      if (!mounted) return;
      setWhisperConfigured(Boolean(path));
      setWhisperReady(ready);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshWhisperState = useCallback(async () => {
    const path = await getSetting(WHISPER_MODEL_PATH_KEY);
    const ready = await getBooleanSetting(WHISPER_INITIALIZED_KEY, false);
    setWhisperConfigured(Boolean(path));
    setWhisperReady(ready);
    return { ready, path };
  }, []);

  const handleSubmit = useCallback(async () => {
    const payload = text.trim();
    if (!payload) {
      setStatus('Bitte gib einen Gedanken ein oder importiere eine Datei.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const locale = typeof navigator !== 'undefined' ? navigator.language : 'de';
      const { entryId } = await createDialogFromText(payload, locale);
      setText('');
      onCreateDialog(entryId);
      setStatus('Dialog erstellt.');
    } catch (error) {
      console.error('Dialog konnte nicht erstellt werden', error);
      setStatus('Ups, etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  }, [onCreateDialog, text]);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (busy) return;
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt')) {
        try {
          const path = (file as unknown as { path?: string }).path;
          const content = path ? await readTextFile(path) : await file.text();
          setText(content);
          setStatus('Transkript importiert. Du kannst es jetzt analysieren.');
        } catch (error) {
          console.error('Datei konnte nicht gelesen werden', error);
          setStatus('Datei konnte nicht gelesen werden.');
        }
        return;
      }
      if (!name.endsWith('.wav')) {
        setStatus('Bitte importiere WAV-Dateien (PCM16 · 16 kHz · mono).');
        return;
      }
      const actualPath = (file as unknown as { path?: string }).path;
      if (!actualPath) {
        setStatus('Dateipfad konnte nicht bestimmt werden.');
        return;
      }
      setBusy(true);
      setStatus('Prüfe Whisper-Status…');
      try {
        const { ready, path } = await refreshWhisperState();
        if (!path || !ready) {
          setStatus('Whisper ist nicht initialisiert. Öffne die Einstellungen, um das Modell zu laden.');
          setBusy(false);
          return;
        }
        setStatus('Transkribiere Audio…');
        const language = normalizeLanguage(typeof navigator !== 'undefined' ? navigator.language : 'de');
        const transcript = await whisperTranscribeWav16Mono(actualPath, language);
        const { entryId } = await createDialogFromText(transcript, language);
        setStatus('Transkription abgeschlossen. Dialog geöffnet.');
        onCreateDialog(entryId);
      } catch (error) {
        console.error('Transkription fehlgeschlagen', error);
        setStatus('Transkription fehlgeschlagen. Bitte überprüfe Modell und Audioformat.');
      } finally {
        setBusy(false);
      }
    },
    [busy, onCreateDialog, refreshWhisperState]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <h1>InnerVoice Desktop</h1>
        <p className="muted">{HINT_TEXT}</p>
      </section>
      <section className="card">
        <h2>Schneller Start</h2>
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Was beschäftigt dich gerade?"
          className="text-input"
          rows={6}
          disabled={busy}
        />
        <div className="actions">
          <button className="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Analysiere…' : 'Dialog starten'}
          </button>
          <button className="ghost" onClick={onOpenHistory} disabled={busy}>
            Verlauf öffnen
          </button>
        </div>
        {status ? <p className="status">{status}</p> : null}
      </section>
      <section className="card">
        <h2>Audio & Dateien</h2>
        <div className="dropzone" onDragOver={handleDragOver} onDrop={handleDrop}>
          <p>Ziehe WAV-Dateien (PCM16 · 16 kHz · mono) hierher.</p>
          <p className="muted small">Optional: Textdateien (.txt) werden direkt übernommen.</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={onOpenSettings} disabled={busy}>
            Whisper initialisieren
          </button>
          <span className="muted small">
            {whisperReady
              ? 'Status: Whisper bereit.'
              : whisperConfigured
                ? 'Status: Modellpfad gesetzt – bitte initialisieren.'
                : 'Status: Kein Whisper-Modell konfiguriert.'}
          </span>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
