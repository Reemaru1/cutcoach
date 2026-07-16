# CutCoach Architektur

## Produktiver Einstieg

Die Web-App wird vollständig und deterministisch über `index.html` gestartet. Der Service Worker `sw.js` liest die Cache-Liste aus `runtime-manifest.js` und stellt dieselben Dateien offline bereit.

`runtime-manifest.js` ist die zentrale Stelle für:

- Cache-Version
- offline verfügbare Basisdateien, Styles und Skripte

Die produktive Ladefolge steht zusätzlich explizit in `index.html`. So hängt der erste App-Start nicht von einem bereits installierten Service Worker ab.

## Kern der App

- `core.js` – Datenmodell, Validierung und lokale Speicherung
- `render.js` – Basisdarstellung und Berechnungen
- `actions.js` – Benutzeraktionen und Formulare
- `app.js` – Start, Navigation und Service-Worker-Integration
- `style.css` – Basisdesign

## Produktive Erweiterungen

- `journal.js` – einzige zuständige Laufzeit für Aufbau, Interaktion und Logik des Tagebuchs
- `nutrition.js` und `nutrition.css` – Mahlzeitenauswahl aus dem Tagebuch
- `journal-date.css` und `journal-ui.css` – finale responsive Tagebuch- und Kalenderregeln

Die noch geladenen `upgrade-*.css` enthalten ausschließlich das etablierte visuelle Design. Historische `upgrade-*.js`-Ketten sind nicht mehr produktiv.

## Ernährung und Bibliothek

- `library.js`
- `library-init.js`
- `library.css`
- `scanner-v2.js`
- `off-lookup.js`

## Nicht produktiv

- `backups/` enthält dokumentierte Rückbaupunkte und wird nicht ausgeführt.
- `native_app/` ist ein pausierter Flutter-/iOS-Prototyp und gehört nicht zur Web-App.

## Regeln für weitere Entwicklung

1. Release-Version in `core.js`, `runtime-manifest.js`, `sw.js`, `index.html` und `update.html` gemeinsam ändern.
2. Neue produktive Dateien in `index.html` laden und in `runtime-manifest.js` für Offline-Nutzung registrieren.
3. Keine neuen einzelnen Patch-Marker oder Versionsnotizen im Repository-Stamm anlegen.
4. Entfernte Experimente nicht im aktiven Produktionspfad behalten.
5. Vor größeren Umbauten einen Rückbaupunkt unter `backups/` dokumentieren.
