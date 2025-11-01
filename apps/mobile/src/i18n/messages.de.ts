const messages = {
  app: {
    name: 'InnerVoice',
    tagline: 'offline • verschlüsselt • auf deiner Seite'
  },
  nav: {
    home: 'Home',
    dialog: 'Dialog',
    history: 'Verlauf',
    settings: 'Einstellungen'
  },
  onboarding: {
    slide1: {
      title: 'Privatheit zuerst',
      body: 'Alles bleibt lokal auf deinem Gerät. Keine Cloud, keine Weitergabe, volle Kontrolle.'
    },
    slide2: {
      title: 'Modelle zum Mitnehmen',
      body: 'Whisper.cpp und Embeddings laufen on-device. Lade nur, was du wirklich brauchst.'
    },
    slide3: {
      title: 'Ein Tap genügt',
      body: 'Tippen, sprechen, Antwort erhalten. Prosodie-Hints inklusive – ganz ohne Zusatzaufwand.'
    },
    actions: {
      skip: 'Überspringen',
      next: 'Weiter',
      start: 'Loslegen'
    }
  },
  common: {
    cancel: 'Abbrechen',
    continue: 'Fortfahren',
    delete: 'Löschen',
    error: 'Fehler',
    warning: 'Warnung',
    success: 'Erfolg',
    offline: 'Offline-Modus',
    syncBeta: 'Sync-Beta aktiv',
    loading: 'Lädt…'
  },
  record: {
    label: {
      default: 'Aufnahme starten',
      primary: '1-Tap Aufnahme'
    },
    status: {
      idle: 'Bereit für deine Stimme',
      processing: 'Verarbeite…',
      active: 'Aufnahme läuft'
    }
  },
  home: {
    loadingDatabase: 'Initialisiere Datenbank…',
    status: {
      idle: 'Bereit für deine Stimme',
      recording: 'Aufnahme läuft…',
      transcribing: 'Transkribiere offline',
      analyzing: 'Analysiere Emotion Hints',
      responding: 'Generiere Gegenstimme',
      saving: 'Speichere verschlüsselt',
      completed: 'Dialog gespeichert',
      error: 'Es gab ein Problem'
    },
    secondary: {
      prompt: 'Spreche frei – alles bleibt auf dem Gerät.',
      preview: '{snippet}{ellipsis}'
    },
    badges: {
      syncEnabled: 'Sync-Beta aktiv',
      offline: 'Offline-Modus'
    },
    latest: {
      title: 'Letzter Dialog',
      subtitle: 'Klingt nach:',
      personaPending: 'Persona in Analyse',
      tempo: 'Tempo {value}',
      arousal: 'Arousal {value}%',
      pauses: 'Pausen {value}%'
    },
    reset: 'Neuer Dialog',
    footer: {
      title: 'Schneller Ablauf',
      subtitle: 'Vier Schritte, ein Flow',
      step1: '1. Tippen und sprechen – keine zusätzlichen Aktionen.',
      step2: '2. Whisper.cpp transkribiert offline, Prosodie wird erfasst.',
      step3: '3. Persona erkennt Ton & antwortet direkt in der App.',
      step4: '4. Ergebnis landet verschlüsselt im Verlauf mit Suche.'
    }
  },
  dialog: {
    title: 'Dialog',
    subtitle: 'Analyse und Antwort in einem Flow',
    placeholder: 'Starte eine Aufnahme, um den Dialog zu sehen.',
    badges: {
      tempo: {
        slow: 'Tempo: langsam',
        neutral: 'Tempo: neutral',
        fast: 'Tempo: schnell'
      },
      pauses: {
        few: 'Pausen: wenige',
        medium: 'Pausen: moderat',
        many: 'Pausen: viele'
      },
      arousal: 'Arousal: {value}%'
    },
    personaFallback: 'Persona',
    bubble: {
      you: 'Du',
      pending: 'Antwort wird vorbereitet…'
    },
    actions: {
      title: 'Antwort-Aktionen',
      subtitle: 'Passe die Gegenstimme mit einem Tap an',
      reframe: 'Reframe',
      nextStep: 'Nächster Schritt',
      moreQuestion: 'Weitere Frage'
    },
    hints: {
      title: 'Emotion Hints',
      subtitle: 'Fusion aus Prosodie und Text',
      tempo: 'Tempo: {value}',
      pauses: 'Pausenanteil: {value}%',
      stability: 'Stabilität: {value}%',
      valence: 'Valenz: {value}'
    },
    toast: {
      restored: 'Standardantwort wiederhergestellt',
      updated: 'Antwort aktualisiert'
    }
  },
  history: {
    title: 'Verlauf',
    subtitle: 'Semantisch durchsuchbar – Long-Press für Aktionen',
    count: '{count} Einträge',
    searchPlaceholder: 'Suche nach Themen oder Gefühlen',
    empty: 'Noch keine Einträge gespeichert.',
    export: {
      title: 'Exportieren',
      prompt: 'Format auswählen',
      markdownMasked: 'Markdown (anonymisiert)',
      markdownOpen: 'Markdown (ohne Anonymisierung)',
      pdfMasked: 'PDF (anonymisiert)',
      pdfOpen: 'PDF (ohne Anonymisierung)'
    },
    actions: {
      title: 'Aktionen',
      export: 'Exportieren',
      share: 'Teilen',
      favorite: 'Als Favorit',
      unfavorite: 'Favorit entfernen',
      delete: 'Löschen',
      cancel: 'Abbrechen'
    },
    alerts: {
      exportFailedTitle: 'Export fehlgeschlagen',
      exportFailedMessage: 'Der Export konnte nicht erstellt werden.',
      deleteConfirm: '{title} wirklich löschen?'
    },
    toast: {
      favoriteAdded: 'Als Favorit gespeichert',
      favoriteRemoved: 'Favorit entfernt',
      deleted: 'Eintrag gelöscht'
    },
    item: {
      empty: 'Ohne Inhalt',
      relevance: 'Relevanz {value}%'
    }
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Kontrolliere Verschlüsselung & Modelle',
    sync: {
      title: 'E2EE-Sync (Beta)',
      description:
        'Standard bleibt offline. Wenn aktiviert, werden Inhalte als verschlüsselte Blobs vorbereitet und können manuell übertragen werden.',
      button: 'Jetzt synchronisieren',
      hint: 'Blobs werden lokal abgelegt – keine Cloudverbindung notwendig.',
      prepared: 'Synchronisation vorbereitet',
      preparedMessage: '{count} Blobs erstellt ({local} lokal gespeichert).',
      keyError: 'Schlüssel konnte nicht gespeichert werden'
    },
    export: {
      title: 'Export standardmäßig anonymisieren',
      description:
        'Wenn aktiviert, werden Namen, Orte und Kontaktangaben automatisch maskiert, bevor Markdown- oder PDF-Exporte erzeugt werden.',
      hint: 'Die Dateien bleiben lokal unter Documents/InnerVoice/exports gespeichert.',
      error: 'Einstellung konnte nicht gespeichert werden'
    },
    language: {
      title: 'Sprache',
      description: 'Wähle die Standardsprache für UI und Antworten.',
      german: 'Deutsch',
      english: 'Englisch'
    },
    models: {
      title: 'Modelle verwalten',
      subtitle: 'On-Device Whisper & Embeddings',
      usage: 'Gesamte Belegung: {value}',
      none: 'Noch keine Modelle installiert.',
      warning: {
        manual: 'Download nur manuell auf eigene Verantwortung.',
        whisperSource: 'Whisper-Dateien stammen z. B. aus dem ggerganov/whisper.cpp Repository.',
        embeddingSource: 'Embedding-Dateien findest du als ONNX-Variante auf HuggingFace.',
        ios: 'Auf iOS erfolgt der Import am besten über die Dateien-App.',
        android: 'Auf Android kannst du lokale Dateien über den Download-Ordner auswählen.'
      },
      size: {
        expected: '{value} MB erwartet',
        mb: '{value} MB belegt',
        gb: '{value} GB belegt'
      },
      status: {
        installed: 'Installiert',
        missing: 'Fehlt',
        default: 'Standard'
      },
      actions: {
        install: 'Installieren',
        reload: 'Neu laden',
        verify: 'Prüfen',
        remove: 'Entfernen'
      },
      alerts: {
        installTitle: 'Modell installieren',
        removeTitle: 'Modell entfernen',
        removeMessage: '{name} wirklich vom Gerät löschen?',
        success: '{name} wurde gespeichert.',
        installError: 'Modell konnte nicht installiert werden.',
        removeError: 'Modell konnte nicht gelöscht werden.',
        verifyOk: 'Checksumme ok – Modell einsatzbereit.',
        verifyFailed: 'Modellprüfung fehlgeschlagen.',
        verifyError: 'Prüfung nicht möglich'
      },
      verification: {
        missing: 'Nicht gefunden – bitte erneut laden.',
        hashMismatch: 'Checksumme stimmt nicht überein.',
        noChecksum: 'Keine Referenz-Checksumme hinterlegt.',
        noHashSupport: 'Plattform liefert keine Hashes – manuelle Prüfung nötig.',
        ok: 'Checksumme geprüft – Modell ok.'
      },
      progress: 'Download: {value}%'
    },
    footer:
      'Download nur bei Bedarf anstoßen. Modelle werden offline gehalten und niemals automatisch gesendet.'
  },
  exporter: {
    shareMessage: 'InnerVoice Dialog ({file})',
    saved: 'Export gespeichert: {file}',
    directoryMissing: 'Dokumentenverzeichnis nicht verfügbar.',
    entryMissing: 'Eintrag nicht gefunden.'
  },
  toast: {
    entrySaved: 'Eintrag gespeichert.'
  },
  errors: {
    recordingStart: 'Aufnahme konnte nicht gestartet werden.',
    embeddingMissing:
      'Embedding-Modell nicht verfügbar. Bitte Modelle im Einstellungsbildschirm laden und erneut versuchen.',
    unknown: 'Unbekannter Fehler',
    audioHints: 'Analyse der Audiohinweise fehlgeschlagen.',
    whisperInit: 'Whisper initialisierung fehlgeschlagen. Bitte Modelle laden.',
    whisperMissing: 'Whisper-Modell nicht gefunden. Bitte lade ein Modell im Einstellungsbildschirm.',
    embeddingInit: 'Embedding Initialisierung fehlgeschlagen. Bitte Modelle laden und erneut versuchen.',
    exportParse: 'Exportdaten konnten nicht gelesen werden.'
  },
  models: {
    whisperMissing: 'Whisper-Modell nicht gefunden. Bitte lade eines der Whisper-Modelle im Einstellungsbildschirm herunter.',
    embeddingMissing: 'Embedding-Modell nicht gefunden. Bitte installiere ein Embedding-Modell im Einstellungsbildschirm.'
  },
  transcription: {
    sample: 'Ich bin mir unsicher, wie es weitergeht, aber ich möchte ruhig bleiben.'
  }
} as const;

export type Messages = typeof messages;
export default messages;
