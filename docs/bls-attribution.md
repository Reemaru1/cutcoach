# Bundeslebensmittelschlüssel 4.0

Der in `food-catalog.js` enthaltene CutCoach-Lebensmittelkatalog wurde aus dem offiziellen Bundeslebensmittelschlüssel (BLS), Version 4.0, erzeugt.

- Herausgeber: Max Rubner-Institut
- Veröffentlichung: 2025
- DOI: `10.25826/Data20251217-134202-0`
- Quelle: https://www.blsdb.de/
- Lizenz: CC BY 4.0 – https://creativecommons.org/licenses/by/4.0/deed.de
- Zitierweise: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank. Karlsruhe.

## CutCoach-Aufbereitung

Die vollständige Quelldatei enthält 7.140 Lebensmittel und 138 Nährstoffe. Für den mobilen Laufzeitkatalog werden 7.064 Einträge mit positiven Kalorienwerten und vollständigen Kernmakronährstoffen übernommen. Je Lebensmittel enthält CutCoach:

- Energie
- Protein
- verfügbare Kohlenhydrate
- Fett
- Ballaststoffe
- Zucker
- gesättigte Fettsäuren
- Salz

Alle Angaben beziehen sich auf 100 g essbaren Anteil. Fehlende optionale Werte bleiben `null` und werden nicht als echte Null interpretiert.

Der Katalog ist reproduzierbar mit:

```sh
python3 tools/build-bls-catalog.py /pfad/zu/BLS_4_0_Daten_2025_DE.xlsx --output food-catalog.js
```
