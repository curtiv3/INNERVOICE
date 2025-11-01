import React, { useCallback, useState } from 'react';
import { readTextFile } from '@tauri-apps/api/fs';
import { createDialogFromText } from '../lib/dialog';

const HINT_TEXT = 'Offline • verschlüsselt · Dateien bleiben auf deinem Gerät';

type HomePageProps = {
  onCreateDialog(entryId: string): void;
  onOpenHistory(): void;
};

function HomePage({ onCreateDialog, onOpenHistory }: HomePageProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    } catch (error) {
      console.error('Dialog konnte nicht erstellt werden', error);
      setStatus('Ups, etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  }, [onCreateDialog, text]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (busy) return;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const path = (file as unknown as { path?: string }).path;
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt')) {
      try {
        const content = path ? await readTextFile(path) : await file.text();
        setText(content);
        setStatus('Transkript importiert. Du kannst es jetzt analysieren.');
      } catch (error) {
        console.error('Datei konnte nicht gelesen werden', error);
        setStatus('Datei konnte nicht gelesen werden.');
      }
      return;
    }
    if (name.endsWith('.wav') || name.endsWith('.mp3') || name.endsWith('.m4a')) {
      setStatus('Whisper Desktop folgt – aktuell kannst du Text importieren.');
      return;
    }
    setStatus('Dateiformat wird nicht unterstützt. Nutze Text oder WAV/MP3.');
  }, [busy]);

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
        <div
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p>Ziehe Text- oder Audio-Dateien hierher.</p>
          <p className="muted small">Audio-Transkription (Whisper Desktop) ist in Arbeit.</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" disabled>
            Whisper initialisieren (bald verfügbar)
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
