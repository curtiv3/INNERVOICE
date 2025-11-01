# InnerVoice

Ein leichtgewichtiger Prototyp, der eingehende Nachrichten analysiert, einer Persona zuordnet und passende Antwort-Templates ausspielt. Jede Interaktion wird in SQLite protokolliert und im UI visualisiert.

## Voraussetzungen

* Python 3.11 oder höher
* Keine zusätzlichen Abhängigkeiten – es wird ausschließlich die Standardbibliothek genutzt.

## Starten

```bash
python src/server.py
```

Der Server läuft anschließend auf <http://localhost:8000>. Öffne die Seite im Browser, schreibe eine Nachricht und beobachte die erkannte Persona, Tonfall, Stimmung sowie die generierte Antwort. Die letzten Interaktionen können unterhalb des Formulars eingesehen werden.

## Struktur

* `persona/` – Definitionsdateien für die Archetypen (Logisch, Emotional, Schatten, Mentor)
* `templates/` – Persona-spezifische Antwortbausteine
* `src/state_machine.py` – Regelbasierte Persona-State-Machine
* `src/responder.py` – Prompt-Füllung und Template-Auswahl
* `src/db.py` – SQLite Logging der Interaktionen
* `public/` – UI mit Feedback-Schleife und Log-Übersicht
