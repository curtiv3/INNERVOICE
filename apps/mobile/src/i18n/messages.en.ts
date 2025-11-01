const messages = {
  app: {
    name: 'InnerVoice',
    tagline: 'offline • encrypted • on your side'
  },
  nav: {
    home: 'Home',
    dialog: 'Dialog',
    history: 'History',
    settings: 'Settings'
  },
  onboarding: {
    slide1: {
      title: 'Privacy first',
      body: 'Everything stays on your device. No cloud uploads, no tracking, complete control.'
    },
    slide2: {
      title: 'Models on-device',
      body: 'Whisper.cpp and embeddings run locally. Download only what you really need.'
    },
    slide3: {
      title: 'One tap to start',
      body: 'Tap, speak, receive a response. Prosody hints included – zero extra effort.'
    },
    actions: {
      skip: 'Skip',
      next: 'Next',
      start: 'Get started'
    }
  },
  common: {
    cancel: 'Cancel',
    continue: 'Continue',
    delete: 'Delete',
    error: 'Error',
    warning: 'Warning',
    success: 'Success',
    offline: 'Offline mode',
    syncBeta: 'Sync beta enabled',
    loading: 'Loading…'
  },
  record: {
    label: {
      default: 'Start recording',
      primary: 'One-tap record'
    },
    status: {
      idle: 'Ready for your voice',
      processing: 'Processing…',
      active: 'Recording'
    }
  },
  home: {
    loadingDatabase: 'Initialising database…',
    status: {
      idle: 'Ready for your voice',
      recording: 'Recording…',
      transcribing: 'Transcribing offline',
      analyzing: 'Analysing emotion hints',
      responding: 'Crafting counter-voice',
      saving: 'Saving encrypted',
      completed: 'Dialogue saved',
      error: 'Something went wrong'
    },
    secondary: {
      prompt: 'Speak freely – everything stays on device.',
      preview: '{snippet}{ellipsis}'
    },
    badges: {
      syncEnabled: 'Sync beta enabled',
      offline: 'Offline mode'
    },
    latest: {
      title: 'Latest dialogue',
      subtitle: 'Sounds like:',
      personaPending: 'Persona analysing',
      tempo: 'Tempo {value}',
      arousal: 'Arousal {value}%',
      pauses: 'Pauses {value}%'
    },
    reset: 'New dialogue',
    footer: {
      title: 'Quick flow',
      subtitle: 'Four steps, one motion',
      step1: '1. Tap and speak – no extra actions needed.',
      step2: '2. Whisper.cpp transcribes offline, prosody is captured.',
      step3: '3. Persona detects tone & replies instantly.',
      step4: '4. Result is stored encrypted with semantic search.'
    }
  },
  dialog: {
    title: 'Dialog',
    subtitle: 'Analysis and response in one flow',
    placeholder: 'Start a recording to view the dialog.',
    badges: {
      tempo: {
        slow: 'Tempo: slow',
        neutral: 'Tempo: neutral',
        fast: 'Tempo: fast'
      },
      pauses: {
        few: 'Pauses: few',
        medium: 'Pauses: moderate',
        many: 'Pauses: many'
      },
      arousal: 'Arousal: {value}%'
    },
    personaFallback: 'Persona',
    bubble: {
      you: 'You',
      pending: 'Preparing response…'
    },
    actions: {
      title: 'Response actions',
      subtitle: 'Adjust the counter-voice with a tap',
      reframe: 'Reframe',
      nextStep: 'Next step',
      moreQuestion: 'Follow-up question'
    },
    hints: {
      title: 'Emotion hints',
      subtitle: 'Blending prosody and text',
      tempo: 'Tempo: {value}',
      pauses: 'Pause ratio: {value}%',
      stability: 'Stability: {value}%',
      valence: 'Valence: {value}'
    },
    toast: {
      restored: 'Default reply restored',
      updated: 'Response updated'
    }
  },
  history: {
    title: 'History',
    subtitle: 'Semantic search with long-press actions',
    count: '{count} entries',
    searchPlaceholder: 'Search feelings or topics',
    empty: 'No entries stored yet.',
    export: {
      title: 'Export',
      prompt: 'Choose a format',
      markdownMasked: 'Markdown (anonymised)',
      markdownOpen: 'Markdown (no anonymisation)',
      pdfMasked: 'PDF (anonymised)',
      pdfOpen: 'PDF (no anonymisation)'
    },
    actions: {
      title: 'Actions',
      export: 'Export',
      share: 'Share',
      favorite: 'Mark favourite',
      unfavorite: 'Remove favourite',
      delete: 'Delete',
      cancel: 'Cancel'
    },
    alerts: {
      exportFailedTitle: 'Export failed',
      exportFailedMessage: 'The export could not be created.',
      deleteConfirm: 'Delete {title}?'
    },
    toast: {
      favoriteAdded: 'Saved to favourites',
      favoriteRemoved: 'Favourite removed',
      deleted: 'Entry deleted'
    },
    item: {
      empty: 'No content',
      relevance: 'Relevance {value}%'
    }
  },
  settings: {
    title: 'Settings',
    subtitle: 'Control encryption & models',
    sync: {
      title: 'E2EE sync (beta)',
      description:
        'Default is offline. When enabled, encrypted blobs are prepared locally and can be transferred manually.',
      button: 'Sync now',
      hint: 'Blobs stay local – no network connection required.',
      prepared: 'Sync prepared',
      preparedMessage: '{count} blobs prepared ({local} stored locally).',
      keyError: 'Key could not be stored'
    },
    export: {
      title: 'Anonymise exports by default',
      description:
        'When enabled, names, places, and contacts are masked automatically before Markdown or PDF exports are generated.',
      hint: 'Files remain local under Documents/InnerVoice/exports.',
      error: 'Setting could not be saved'
    },
    language: {
      title: 'Language',
      description: 'Choose the default language for UI and responses.',
      german: 'German',
      english: 'English'
    },
    models: {
      title: 'Manage models',
      subtitle: 'On-device Whisper & embeddings',
      usage: 'Total usage: {value}',
      none: 'No models installed yet.',
      warning: {
        manual: 'Manual downloads only – at your own discretion.',
        whisperSource: 'Whisper files typically come from ggerganov/whisper.cpp.',
        embeddingSource: 'Embedding ONNX files are available on HuggingFace.',
        ios: 'On iOS import via the Files app works best.',
        android: 'On Android pick local files from the Downloads folder.'
      },
      size: {
        expected: '{value} MB expected',
        mb: '{value} MB used',
        gb: '{value} GB used'
      },
      status: {
        installed: 'Installed',
        missing: 'Missing',
        default: 'Default'
      },
      actions: {
        install: 'Install',
        reload: 'Reload',
        verify: 'Verify',
        remove: 'Remove'
      },
      alerts: {
        installTitle: 'Install model',
        removeTitle: 'Remove model',
        removeMessage: 'Remove {name} from this device?',
        success: '{name} stored successfully.',
        installError: 'Model could not be installed.',
        removeError: 'Model could not be removed.',
        verifyOk: 'Checksum valid – model ready.',
        verifyFailed: 'Model verification failed.',
        verifyError: 'Verification not possible'
      },
      verification: {
        missing: 'Not found – please reinstall.',
        hashMismatch: 'Checksum mismatch detected.',
        noChecksum: 'No reference checksum available.',
        noHashSupport: 'Platform does not expose hashes – verify manually.',
        ok: 'Checksum verified – model OK.'
      },
      progress: 'Download: {value}%'
    },
    footer: 'Trigger downloads only when needed. Models stay offline and are never uploaded automatically.'
  },
  exporter: {
    shareMessage: 'InnerVoice dialog ({file})',
    saved: 'Export saved: {file}',
    directoryMissing: 'Document directory unavailable.',
    entryMissing: 'Entry not found.'
  },
  toast: {
    entrySaved: 'Entry stored.'
  },
  errors: {
    recordingStart: 'Could not start recording.',
    embeddingMissing:
      'Embedding model unavailable. Please install a model in settings and try again.',
    unknown: 'Unknown error',
    audioHints: 'Audio hint analysis failed.',
    whisperInit: 'Whisper initialisation failed. Please install a model.',
    whisperMissing: 'Whisper model missing. Install one in settings.',
    embeddingInit: 'Embedding initialisation failed. Install a model and try again.',
    exportParse: 'Export data could not be parsed.'
  },
  models: {
    whisperMissing: 'Whisper model not found. Install one of the Whisper models in settings.',
    embeddingMissing: 'Embedding model not found. Install an embedding model in settings.'
  },
  transcription: {
    sample: 'I am unsure how to move forward, but I want to stay calm.'
  }
} as const;

export type Messages = typeof messages;
export default messages;
