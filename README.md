# CutCoach

CutCoach ist eine mobile, offlinefähige Ernährungs- und Fitness-PWA. Das Produkt soll Menschen im Alltag verständlich unterstützen: schnell eintragen, Fortschritt ehrlich einordnen und konkrete nächste Schritte zeigen – ohne unnötige Komplexität oder irreführende Gesundheitsversprechen.

## Produktprinzipien

- **Menschen zuerst:** Jede Funktion muss einen klaren Nutzen im Alltag haben.
- **Verständlich statt technisch:** Zahlen werden erklärt und in konkrete Handlungen übersetzt.
- **Ehrlich mit Daten:** Fehlende Daten werden als fehlend dargestellt; Schätzungen werden nicht als Messwerte ausgegeben.
- **Sicher und privat:** Persönliche Daten bleiben standardmäßig lokal im Browser und dürfen bei Updates nicht verloren gehen.
- **Mobil und barrierearm:** iPhone-Safe-Areas, kleine Displays, Tastaturbedienung, reduzierte Bewegung und gute Kontraste gehören zur Definition von „fertig“.
- **Ruhiges Premium-Design:** Klare Hierarchie, wenige konkurrierende Aktionen und konsistente Komponenten sind wichtiger als zusätzliche Effekte.

## Aktueller Stand

- App-Release: **2.2.1 Alpha**
- Produktiver Einstieg: `index.html`
- Offline-App-Shell: `runtime-manifest.js` und `sw.js`
- Produktive Bereiche: Tagebuch, Ernährung, Bibliothek, Scanner, Body Progress und Einstellungen
- Isolierte Vorschau: `staging-v2/`

## Entwicklung

```sh
npm install --ignore-scripts
npm run check
```

`npm run check` prüft die Syntax aller JavaScript-Dateien und führt automatisch jede Datei unter `tests/*.test.js` aus. Neue Regressionstests müssen daher nicht mehr manuell in `package.json` eingetragen werden.

## Repository-Struktur

- `index.html` und Root-Assets: produktive statische PWA
- `assets/`: produktive Bilddateien
- `staging-v2/`: isolierte Vorschau mit getrenntem Browser-Speicher
- `tests/`: automatisch erkannte Regressionstests
- `tools/`: reproduzierbare Daten-/Katalogwerkzeuge
- `docs/`: Architektur, Quellenhinweise und fachliche Regeln
- `src/shared/`: Modulregister, gemeinsame UI und lokale Qualitätsmessung
- `src/features/`: schrittweise Adapter für Tagebuch, Ernährung und Fortschritt

Weitere Details stehen in [docs/architecture.md](docs/architecture.md).
