# CutCoach Architektur

Aktiver Stand: **5.8.0**

## Einstieg und Grundsystem

- `index.html` – statische Grundstruktur, Dialoge und Navigation
- `style.css` – globale Basisgestaltung
- `core.js` – Datenmodell, lokale Speicherung, Validierung und Hilfsfunktionen
- `render.js` – Basis-Rendering und Auswertungen
- `actions.js` – Eingaben und Benutzeraktionen
- `app.js` – Start, Navigation, Service Worker und Update-Logik
- `sw.js` – einzige verbindliche Liste der produktiv geladenen Dateien
- `update.html` – erzwungener Cache- und Service-Worker-Wechsel

## Aktive Funktionsmodule

- `library.js`, `library-init.js`, `library.css` – Lebensmittelbibliothek
- `scanner-v2.js` – Barcode-Scanner
- `off-lookup.js` – Open-Food-Facts-Abfragen
- `upgrade-340.js` – vollständige Backups, Wiederherstellung und Bibliotheks-Hilfen
- `upgrade-360.js`, `upgrade-430.js`, `upgrade-440.js` – aktive Bewertungs-, Hydrations- und Tagesstatus-Engine; diese Dateien bleiben vorerst zusammen erhalten, bis die Engine separat konsolidiert und vollständig getestet wird
- `upgrade-560.js`, `upgrade-560.css` – stabile Grundstruktur des Tagebuch-Redesigns
- `coach.css` – zusammengeführte globale Coach-, Wasser- und Eingabestile
- `journal.js`, `journal.css` – konsolidierte finale Tagebuch-Funktionen und Darstellungsregeln

## Nicht mehr produktiv vorhanden

Die aufeinanderfolgenden Tagebuch-Patches `upgrade-550`, `upgrade-561`, `upgrade-562`, `upgrade-563`, `upgrade-564`, `upgrade-565` und `upgrade-570` wurden in `journal.js` und `journal.css` zusammengeführt und aus `main` entfernt.

Der pausierte Flutter-/HealthKit-Prototyp unter `native_app/` wurde aus der produktiven Codebasis entfernt.

## Rückbau

Der vollständige Stand unmittelbar vor der Konsolidierung liegt unverändert auf dem Branch:

`archive/pre-consolidation-5.7.0`

Ausgangspunkt ist Commit:

`83dfdcd758507dbda00f153387cffd1458548cdb`

Die lokalen Nutzerdaten liegen im Browser und werden durch die Repository-Bereinigung nicht verändert.

## Regel für kommende Bereiche

Neue größere Bereiche erhalten eine eindeutig benannte Moduldatei, zum Beispiel `nutrition.js` und `nutrition.css`. Kleine Korrekturen werden in dieses Modul eingearbeitet und nicht dauerhaft als neue nummerierte Patch-Dateien angehäuft.
