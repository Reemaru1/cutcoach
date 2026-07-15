# CutCoach Architektur

## Produktiver Einstieg

Die Web-App wird über `index.html` gestartet. Der Service Worker `sw.js` liest die zentrale Produktionskonfiguration aus `runtime-manifest.js`.

`runtime-manifest.js` ist ab Version 5.8.0 die einzige Stelle für:

- sichtbare Release-Version
- produktiv geladene Basisdateien
- produktiv geladene Styles
- produktiv geladene Skripte
- Cache-Version

## Kern der App

- `core.js` – Datenmodell, Validierung und lokale Speicherung
- `render.js` – Basisdarstellung und Berechnungen
- `actions.js` – Benutzeraktionen und Formulare
- `app.js` – Start, Navigation und Service-Worker-Integration
- `style.css` – Basisdesign

## Produktive Erweiterungen

Die Dateien `upgrade-*` sind derzeit noch Teil der aktiven Laufzeit. Sie dürfen nicht einzeln gelöscht werden, da spätere Tagebuch-Verbesserungen auf zuvor erzeugten Elementen und Funktionen aufbauen.

Die Reihenfolge wird ausschließlich in `runtime-manifest.js` verwaltet. Neue Bereiche sollen künftig nicht mehr durch Änderungen im Service Worker registriert werden.

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

1. Release-Version nur in `runtime-manifest.js`, `runtime-version.js` und `update.html` ändern.
2. Neue produktive Dateien nur in `runtime-manifest.js` registrieren.
3. Keine neuen einzelnen Patch-Marker oder Versionsnotizen im Repository-Stamm anlegen.
4. Entfernte Experimente nicht im aktiven Produktionspfad behalten.
5. Vor größeren Umbauten einen Rückbaupunkt unter `backups/` dokumentieren.
