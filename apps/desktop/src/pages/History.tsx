import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HistoryEntry,
  deleteEntry,
  listHistoryEntries,
  markFavorite,
  searchEntries
} from '../lib/entries';

const SEARCH_DELAY = 200;

type HistoryPageProps = {
  activeEntryId: string | null;
  onSelect(entryId: string): void;
  refreshToken: number;
};

function formatRelative(timestamp: number): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  return formatter.format(new Date(timestamp));
}

function HistoryPage({ activeEntryId, onSelect, refreshToken }: HistoryPageProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = query.trim() ? await searchEntries(query) : await listHistoryEntries();
      setEntries(data);
    } catch (err) {
      console.error('Verlauf konnte nicht geladen werden', err);
      setError('Verlauf konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshToken]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadEntries();
    }, SEARCH_DELAY);
    return () => clearTimeout(handle);
  }, [query, loadEntries]);

  const handleFavorite = useCallback(
    async (entry: HistoryEntry) => {
      try {
        await markFavorite(entry.id, !entry.favorite);
        await loadEntries();
      } catch (err) {
        console.error('Favorit konnte nicht aktualisiert werden', err);
      }
    },
    [loadEntries]
  );

  const handleDelete = useCallback(
    async (entry: HistoryEntry) => {
      if (!confirm('Eintrag wirklich löschen?')) return;
      try {
        await deleteEntry(entry.id);
        await loadEntries();
      } catch (err) {
        console.error('Eintrag konnte nicht gelöscht werden', err);
      }
    },
    [loadEntries]
  );

  const summary = useMemo(() => {
    if (loading) return 'Lade Verlauf…';
    if (error) return error;
    if (entries.length === 0) return query ? 'Keine Treffer' : 'Noch keine Einträge';
    return `${entries.length} Einträge`;
  }, [entries.length, error, loading, query]);

  return (
    <div className="page">
      <section className="card">
        <h2>Verlauf</h2>
        <input
          type="search"
          placeholder="Suche nach Themen oder Emotionen"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="text-input"
        />
        <p className="muted small">{summary}</p>
        <ul className="history-list">
          {entries.map(entry => (
            <li key={entry.id} className={entry.id === activeEntryId ? 'history-item active' : 'history-item'}>
              <button className="history-button" onClick={() => onSelect(entry.id)}>
                <div className="history-text">
                  <strong>{formatRelative(entry.updated_at)}</strong>
                  <span>{entry.text.slice(0, 120) || '–'}</span>
                </div>
                <div className="history-icons">
                  <span title="Lokal verschlüsselt">🔒</span>
                  {entry.pendingSync ? <span title="Für Sync vorgemerkt">☁️</span> : null}
                  {entry.score != null ? <span className="score">{entry.score.toFixed(2)}</span> : null}
                  {entry.hasHints ? <span title="Emotionale Hinweise">🎧</span> : null}
                  {entry.favorite ? <span title="Favorit">★</span> : null}
                </div>
              </button>
              <div className="entry-actions">
                <button className="ghost" onClick={() => handleFavorite(entry)}>
                  {entry.favorite ? 'Unfavorisieren' : 'Favorisieren'}
                </button>
                <button className="ghost" onClick={() => handleDelete(entry)}>
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default HistoryPage;
