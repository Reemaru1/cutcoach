# Intelligente Suche · A–Z-Integritätsaudit 1.9.0

Dieser Audit prüft die vollständige Sucharchitektur aus Stufe 1 bis 6 als zusammenhängendes System.

## Behobene Übergangsfehler

- vollständige Gerichte mit `mit`, `und` oder Kommas bleiben auch innerhalb einer Mehrfachsuche ein einzelner Treffer
- Dezimalkommas werden nicht als Lebensmitteltrenner interpretiert
- mengenlose vollständige Gerichte können sicher mit weiteren Lebensmitteln kombiniert werden
- die Kompatibilitätsfassade gibt bei mehreren Ergebnissen nicht mehr still den ersten Treffer zurück
- ein inaktiver Sprachabbruch kann keine später manuell eingegebene Suche überschreiben
- nicht erkannte oder fehlgeschlagen beendete Spracheingaben hinterlassen keinen Vorschauzustand
- Sprachvorschauen blenden veraltete Suchergebnisse sofort aus
- Haushaltsmengen-Auswahlen werden vom lokalen Lernen erfasst
- die Confidence-Schicht kann bei alternativer Modul-Ladereihenfolge keine Mutation-Render-Schleife mehr erzeugen
- bestehende, aber nicht fertig geladene Scripts blockieren die Suchinitialisierung nicht unbegrenzt

## Prüfung

Die neue Regression `tests/v190-intelligent-search-a-z-integrity.test.js` läuft zusätzlich zu sämtlichen bisherigen Such-, Vollkatalog-, Portions-, Lern-, Voice-, Scanner-, Offline-, Journal- und Produktionsprüfungen.
