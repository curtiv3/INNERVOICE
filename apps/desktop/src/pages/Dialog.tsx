import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntryDetail } from '../lib/entries';
import { loadEntryDetail } from '../lib/entries';
import { regenerateResponse } from '../lib/dialog';

type DialogPageProps = {
  entryId: string | null;
  onNavigateHistory(): void;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatArousal(value: number | null | undefined): string {
  if (value == null) return '–';
  return `${Math.round(value * 100)}%`;
}

function DialogPage({ entryId, onNavigateHistory }: DialogPageProps) {
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!entryId) {
      setEntry(null);
      setResponseText('');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await loadEntryDetail(entryId);
      setEntry(detail);
      const message = detail?.response && typeof detail.response === 'object'
        ? (detail.response as { message?: string }).message ?? ''
        : '';
      setResponseText(message ?? '');
    } catch (err) {
      console.error('Dialog konnte nicht geladen werden', err);
      setError('Dialog konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const badges = useMemo(() => {
    if (!entry?.hints) return [] as { label: string; value: string }[];
    return [
      { label: 'Tempo', value: entry.hints.tempoClass ?? 'neutral' },
      { label: 'Arousal', value: formatArousal(entry.hints.arousal) },
      { label: 'Pausen', value: entry.hints.pausesClass ?? '–' }
    ];
  }, [entry]);

  const handleAction = useCallback(
    async (mode: 'reframe' | 'next' | 'question') => {
      if (!entry) return;
      setLoading(true);
      setError(null);
      try {
        const updated = await regenerateResponse(entry, mode);
        setResponseText(updated);
        await refresh();
      } catch (err) {
        console.error('Antwort konnte nicht generiert werden', err);
        setError('Antwort konnte nicht aktualisiert werden.');
      } finally {
        setLoading(false);
      }
    },
    [entry, refresh]
  );

  if (!entryId) {
    return (
      <div className="page">
        <section className="card">
          <h2>Kein Dialog ausgewählt</h2>
          <p className="muted">Wähle einen Eintrag im Verlauf oder starte einen neuen Dialog.</p>
          <button className="ghost" onClick={onNavigateHistory}>
            Verlauf öffnen
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card">
        <header className="card-header">
          <div>
            <h2>Dein Gedanke</h2>
            <p className="muted small">{entry ? formatDate(entry.created_at) : '–'}</p>
          </div>
          <div className="badge-group">
            {badges.map(badge => (
              <span key={badge.label} className="badge">
                <strong>{badge.label}:</strong> {badge.value}
              </span>
            ))}
          </div>
        </header>
        {loading && <p className="muted">Lade…</p>}
        {error && <p className="status error">{error}</p>}
        {entry && (
          <>
            <p className="dialog-text">{entry.text}</p>
            <div className="response">
              <h3>Antwort ({entry.activePersona ?? 'Mentor'})</h3>
              <pre>{responseText}</pre>
            </div>
          </>
        )}
      </section>
      <section className="card">
        <h2>Aktionen</h2>
        <div className="actions">
          <button className="ghost" onClick={() => handleAction('reframe')} disabled={loading || !entry}>
            Reframe
          </button>
          <button className="ghost" onClick={() => handleAction('next')} disabled={loading || !entry}>
            Nächster Schritt
          </button>
          <button className="ghost" onClick={() => handleAction('question')} disabled={loading || !entry}>
            Weitere Frage
          </button>
        </div>
        <button className="secondary" onClick={onNavigateHistory}>
          Verlauf anzeigen
        </button>
      </section>
    </div>
  );
}

export default DialogPage;
