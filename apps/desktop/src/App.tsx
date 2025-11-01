import React, { useEffect, useMemo, useState } from 'react';
import HomePage from './pages/Home';
import DialogPage from './pages/Dialog';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import { getDatabase } from './lib/database';

export type AppView = 'home' | 'dialog' | 'history' | 'settings';

function App() {
  const [view, setView] = useState<AppView>('home');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    getDatabase()
      .then(() => setDatabaseReady(true))
      .catch(error => {
        console.error('Konnte Datenbank nicht initialisieren', error);
      });
  }, []);

  const navigation = useMemo(
    () => [
      { key: 'home', label: 'Start', description: 'Aufnahme & Text', view: 'home' as AppView },
      { key: 'dialog', label: 'Dialog', description: 'Aktuelle Session', view: 'dialog' as AppView },
      { key: 'history', label: 'Verlauf', description: 'Chronik & Suche', view: 'history' as AppView },
      { key: 'settings', label: 'Einstellungen', description: 'Modelle & Sync', view: 'settings' as AppView }
    ],
    []
  );

  const handleOpenDialog = (entryId: string) => {
    setActiveEntryId(entryId);
    setView('dialog');
    setRefreshToken(token => token + 1);
  };

  if (!databaseReady) {
    return (
      <div className="app-shell">
        <header className="top-bar">
          <strong>InnerVoice Desktop</strong>
        </header>
        <main className="content">
          <p className="muted">Initialisiere lokale Datenbank…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <strong>InnerVoice Desktop</strong>
        <span className="subtitle">Offline · Verschlüsselt · Lokal</span>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <nav>
            {navigation.map(item => (
              <button
                key={item.key}
                className={view === item.view ? 'nav-button active' : 'nav-button'}
                onClick={() => setView(item.view)}
              >
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="content">
          {view === 'home' && (
            <HomePage
              onCreateDialog={handleOpenDialog}
              onOpenHistory={() => setView('history')}
              onOpenSettings={() => setView('settings')}
            />
          )}
          {view === 'dialog' && (
            <DialogPage
              entryId={activeEntryId}
              onNavigateHistory={() => setView('history')}
            />
          )}
          {view === 'history' && (
            <HistoryPage
              activeEntryId={activeEntryId}
              onSelect={handleOpenDialog}
              refreshToken={refreshToken}
            />
          )}
          {view === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
