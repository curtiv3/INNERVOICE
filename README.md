# InnerVoice

Prototype monorepo for InnerVoice persona dialogue system. This snapshot focuses on task 8
and 9: prosody-driven emotion hints that stay on-device plus encrypted persistence and
optional sync preparation.

## Structure

- `packages/native/audio-features` – React Native module extracting RMS, ZCR, F0 and speech ratio
  from 16 kHz mono WAV files using lightweight C++/ObjC++/Kotlin code.
- `packages/core/persona` – Persona classifier updated to accept `EmotionHints` and fuse audio +
  text heuristics for tempo and valence adjustments.
- `packages/core/crypto` – libsodium-based utilities for device key management and sealed box
  content wrapping.
- `packages/core/export` – Markdown/PDF renderer with optional anonymisation for offline dialog
  exports.
- `packages/core/sync` – Packing helpers, merge logic and offline adapters for encrypted blob
  handling.
- `packages/core/models` – Catalog + manager for Whisper/Embedding Modelle inklusive Install-,
  Prüf- und Speicherverbrauchs-APIs.
- `apps/mobile` – Example hooks, storage layer, and screens integrating the new hints, SQLite
  persistence, sync toggles, and calm dark UI.
- `apps/desktop` – Tauri (Windows/macOS) shell using the shared core packages, SQLite via the
  Tauri SQL plugin, and a React-based offline UI for text import, persona dialoguing, and local
  sync preparation.

All processing happens locally; only aggregated hints (arousal, tempo, pause ratio) are persisted
alongside encrypted sync blobs.

## Dialog Flow – Aufgabe 10

- 1-Tap Aufnahme auf dem Home Screen startet sofort eine neue Session. Whisper.cpp und die Prosodie-Engine
  laufen komplett offline, während Badges in Echtzeit über Tempo, Arousal und Pausen informieren.
- Die Dialogansicht zeigt Chat-Bubbles, Persona-Badges und Aktionen (Reframe, Nächster Schritt, Weitere Frage),
  die das Antwort-Template ohne Cloud-Anbindung anpassen.
- Der Verlauf bietet semantische Suche auf lokalen Embeddings, Favoriten, Offline-Share sowie Sync-Marker.
- Die Einstellungen bündeln E2EE-Sync und Modellverwaltung (Whisper & Embedding) mit klaren Status-Badges.

## Datensicherheit & Sync

- SQLite schema managed via idempotent migrations ensures `entries`, `embeddings`, `sync_log` and
  `settings` tables exist and pick up new columns without data loss.
- Device keys are created in the system Keychain/Keystore and wrap a 256-bit content key stored in
  the local database.
- `@innervoice/core-crypto` exposes helpers to encrypt JSON/binary buffers with `crypto_secretbox`
  and to seal/unseal content keys per device.
- `@innervoice/core-sync` prepares zero-knowledge blobs (no plaintext) and uses last-write-wins
  merging plus conflict logging.
- Mobile settings allow toggling E2EE sync (disabled by default) and manually preparing offline
  blobs without network access.

## Lokaler Export – Aufgabe 12

- History-Einträge lassen sich per Long-Press als Markdown oder PDF exportieren; Dateien landen
  offline im Verzeichnis `Documents/InnerVoice/exports/{Datum}-{ID}`.
- Optionaler Anonymisierungsmodus maskiert automatisch Namen, Orte, E-Mails und Telefonnummern –
  gesteuert über einen Toggle in den Einstellungen.
- Der neue Workspace `@innervoice/core-export` bündelt Sanitizer, Markdown-Template und PDF-Erzeugung
  (via `pdf-lib`) für wiederverwendbare On-Device-Exports.
- Nach jedem Export öffnet sich das native Share Sheet; keine Cloud-Verbindung oder Roh-Audio wird
  benötigt.

## Modellverwaltung – Aufgabe 14

- Die neue Bibliothek `@innervoice/core-models` beschreibt Whisper- und Embedding-Modelle (tiny/base/small,
  GTE Small, MiniLM) mit Größe, Pfad und optionalen Checksummen.
- Ein plattformunabhängiger Manager kapselt Installieren (Download oder lokale Quelle kopieren),
  Entfernen, Prüfen und die Berechnung des belegten Speichers.
- Die Mobile-App nutzt Expo FileSystem, um Modelle nach `Documents/InnerVoice/models/...` zu laden;
  Fortschritt, Prüfergebnisse und Standard-Modelle werden in den Einstellungen visualisiert.
- Downloads starten ausschließlich auf ausdrücklichen Knopfdruck, versehen mit Warnhinweis – es findet
  keine automatische Netzaktivität statt. Bereits vorhandene Modelle lassen sich ebenso verifizieren
  oder löschen.

## Onboarding & Lokalisierung – Aufgabe 15

- Beim ersten Start führt ein dreistufiges Onboarding durch Privatsphäre, Modellverwaltung und den
  Ein-Tap-Fluss. Es lässt sich jederzeit überspringen und speichert den Abschluss lokal in den Settings.
- Sämtliche UI-Texte werden über ein zentrales i18n-Layer verwaltet (`messages.de.ts` / `messages.en.ts`).
  Home-, Dialog-, Verlauf- und Einstellungsansichten greifen ausschließlich über Übersetzungsschlüssel
  auf Texte zu – keine Hardcoded Strings mehr.
- Die Einstellungen enthalten einen Sprachumschalter (Deutsch/Englisch). Änderungen werden persistiert und
  wirken sich sofort auf alle Screens, Toasts, Alerts sowie den Mock-Transkriptionsfallback aus.

## QA & Performance Budgets

- **Unit Tests:** `npm test` executes targeted specs for persona classification/generation, cosine
  similarity, crypto boxes, and database migrations. Crypto sodium bindings are mocked for fast
  execution.
- **Smoke Checks:** `npm run smoke:mobile` simulates Whisper → transcription → embedding → persona
  → response → packing, while `npm run smoke:search` indexes dummy entries and validates a semantic
  lookup result.
- **Static Analysis:** `npm run lint` (ESLint) and `npm run typecheck` ensure code quality and type
  safety across packages.
- **Build Targets:** `npm run build:core` compiles all core workspaces; `npm run build:native`
  transpiles the React Native audio features bridge.
- **Performance Targets:** logging within smoke checks asserts budgets — 5s transcription under 2 s,
  embeddings under 250 ms, semantic search over 1k rows under 50 ms — to guard regressions.

## Release Builds & Signing – Aufgabe 16

- **Android (.aab):**
  1. Export your keystore path and credentials as environment variables (`ANDROID_KEYSTORE_PATH`,
     `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, optional
     `ANDROID_KEYSTORE_TYPE`).
  2. Run `npm run build:android`. The script performs `expo prebuild --platform android`, writes a
     `signing.properties` file via `apps/mobile/scripts/write-signing-properties.mjs`, and executes
     `./gradlew bundleRelease` to emit `app/build/outputs/bundle/release/app-release.aab`.
  3. The config plugin `apps/mobile/plugins/withReleaseSigning.ts` injects a release signing config
     into `android/app/build.gradle` whenever Expo regenerates native code.

- **iOS (.ipa):**
  1. Provide signing context via `IOS_TEAM_ID`, `IOS_EXPORT_METHOD` (default `app-store`),
     `IOS_PROVISIONING_PROFILE` (profile name), `IOS_SIGNING_CERTIFICATE` (optional) and
     `IOS_SIGNING_STYLE` (defaults to `manual`). Override workspace/scheme paths with `IOS_WORKSPACE`
     or `IOS_SCHEME` if you rename the Xcode project.
  2. Run `npm run build:ios`. The helper script generates `ios/ExportOptions.plist` from the
     environment, archives the app with `xcodebuild` and exports an `.ipa` into `ios/build/`.
  3. All steps stay local; certificates/profiles remain on your machine and the archive can be
     notarised or uploaded manually.

- **Optional EAS:** If you later enable EAS Build, keep the environment variables for keystores and
  provisioning profiles in your CI secrets store – the scripts continue to work locally without EAS.

### Privacy-Checkliste vor Release

- [ ] Mikrofonzugriff nur bei aktiver Aufnahme; keine Hintergrundaufnahmen.
- [ ] Whisper-, Embedding- und Persona-Modelle laufen vollständig offline.
- [ ] Roh-Audio wird nach der Transkription verworfen; nur aggregierte Hints + verschlüsselte
      Inhalte verbleiben in SQLite.
- [ ] Exporte (Markdown/PDF) werden lokal erstellt und nur via Share Sheet geteilt.
- [ ] E2EE-Sync ist standardmäßig deaktiviert; vorbereitete Blobs enthalten keine Klartexte.
- [ ] Datenschutzhinweise im Onboarding und in den Einstellungen spiegeln den Offline-Charakter
      und die fehlende Cloud-Analyse wider.

## Desktop App (Tauri) – Aufgabe 13

- **Scope:** Shared persona/embedding/crypto modules now back a desktop-first workflow. The React
  shell mirrors the mobile flows: quick text capture, drag & drop for transcripts, persona
  classification, encrypted response storage, and semantische Suche über lokale Embeddings.
- **SQLite & Crypto:** A bundled `sqlite:innervoice.db` database lives inside the app config
  directory (`AppData/` on Windows, `~/Library/Application Support/` on macOS). Device and content
  keys are generated once via `@innervoice/core-crypto` and stored locally (sealed); response blobs
  remain encrypted at rest.
- **Optional Sync:** Settings expose the familiar E2EE toggle plus a "Jetzt synchronisieren"
  button. Sync still works offline via the offline adapter and only prepares sealed blobs for a
  future backend.
- **Offline Whisper:** Einstellungen enthalten eine Whisper-Karte mit Status-Badge, Pfadauswahl,
  Verifikation (>40 MB ggml/gguf) und Initialisierung. Nach erfolgreichem Laden transkribiert der
  Desktop-Client WAV-Dateien komplett offline und leitet das Ergebnis direkt in die Persona-Pipeline über.


### Entwickeln & Bauen (Desktop)

1. Install dependencies: `npm install` (Rust toolchain + Tauri prerequisites müssen vorhanden sein).
2. Entwickeln: `npm run dev:desktop` startet Vite + `tauri dev` (Port 1420, HMR aktiviert).
3. Produzieren: `npm run build:desktop` erstellt den Vite-Build und packt eine Tauri-App.
4. Codesigning (macOS/Windows): Hinterlege `TAURI_PRIVATE_KEY` und `TAURI_KEY_PASSWORD` oder passe
   `tauri.conf.json` an deine Signierungs-Identitäten an, bevor du binäre Releases verteilst.

#### Whisper-Modelle & Audio-Import

- Lege ein Whisper ggml/gguf Modell (z. B. `ggml-base.bin` oder `ggml-tiny.en.gguf`) lokal ab und wähle den Pfad in den
  Desktop-Einstellungen unter „Whisper“. Dateien unter 40 MB oder ohne `whisper`/`ggml|gguf` im Namen werden abgelehnt.
- Verwende „Verifizieren“, um Existenz und Größe zu prüfen, und „Initialisieren“, um das Modell in den Whisper-Kontext zu laden.
- Unterstütztes Audio: PCM16, 16 kHz, mono WAV. Andere Formate werden verworfen. Lege für Tests selbst eine kurze WAV-Datei an
  (z. B. über QuickTime, Voice Recorder oder `ffmpeg -i input.mp3 -ar 16000 -ac 1 -sample_fmt s16 output.wav`).
- Nach der Transkription wird das Ergebnis automatisch klassifiziert, eine Gegenpersona generiert und verschlüsselt gespeichert – alles offline.
