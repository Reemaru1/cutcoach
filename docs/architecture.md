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
- `nutrition.js` und `nutrition.css` – fehlertolerante Mahlzeitensuche, Sprach-/Textmengen wie „200 g Haferflocken“, Routine- und Tages-Fit-Priorisierung, Makro-Kompass, Schnell-Eintragung mit Rückgängig und kategoriegerechte Vortagsübernahme
- `journal-date.css` und `journal-ui.css` – finale responsive Tagebuch- und Kalenderregeln
- `upgrade-340.js` – weiterhin aktive Kompatibilitätsschicht für Komplettbackups und fensterübergreifende Bibliotheks-/Wasser-Synchronisierung
- `body-progress-v220.js` und `body-progress-v220.css` – produktiver Körper- und Trainingsfortschritt mit validierten Eingaben, Trendberechnung und Muskelmapping

Die noch geladenen `upgrade-*.css` enthalten ausschließlich das etablierte visuelle Design. Weitere historische `upgrade-*.js`-Ketten sind nicht mehr produktiv.

## Ernährung und Bibliothek

- `food-catalog.js` – schreibgeschützter, kompakter BLS-4.0-Lebensmittelkatalog
- `library.js`
- `library-init.js`
- `library.css`
- `scanner-v2.js`
- `off-lookup.js`

`food-catalog.js` liefert offizielle Referenzwerte, wird aber nie durch Benutzeraktionen verändert. `library.js` ist die einzige Schreibinstanz für persönliche Lebensmittel und Rezepte und stellt der Ernährungsoberfläche sichere Methoden für exakte Portionen, Eintragen und Rückgängigmachen bereit. Mahlzeiten bewahren Menge, Einheit, Quelle sowie verfügbare Zusatznährwerte verlustfrei. Die Ernährungsoberfläche greift nicht eigenständig schreibend auf den Bibliotheksspeicher zu.

## Nicht produktiv

- `staging-v2/` lädt die aktuelle App in einer isolierten Vorschau mit getrenntem Browser-Speicher und ohne produktiven Service Worker.
- Historische Prototypen und Rückbaukopien werden nicht im aktiven Dateibaum behalten. Git-Commits und Tags sind die Rückbaupunkte.

## Regeln für weitere Entwicklung

1. Die App-Version in `package.json`, `core.js`, `version-v7.js`, `runtime-manifest.js`, `sw.js`, `index.html` und `update.html` gemeinsam ändern. `tests/repository-integrity.test.js` prüft die Übereinstimmung.
2. Neue produktive Dateien in `index.html` laden und in `runtime-manifest.js` für Offline-Nutzung registrieren.
3. Keine neuen einzelnen Patch-Marker oder Versionsnotizen im Repository-Stamm anlegen.
4. Entfernte Experimente nicht im aktiven Produktionspfad behalten.
5. Vor größeren Umbauten einen klar benannten Git-Branch oder Tag als Rückbaupunkt verwenden.
6. Tagebuchdaten nur über `commitDayMutation`, globale Einstellungen nur über `commitStateMutation` und komplette Zustände nur über `commitStateReplacement` speichern.
7. Vor einem Release vollständig `npm run check` ausführen.
