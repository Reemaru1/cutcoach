# Rückbaupunkt Ernährung vor 6.5.0

Der letzte veröffentlichte Stand vor dem kompakten Ernährungsumbau ist CutCoach 6.4.0 auf `main`.

- Commit: `0b1b3b754b1e140ecc0eb7f7ce2c107d912c9717`
- Oberfläche: großer Kopfbereich, drei hohe Schnellaktionskarten, separate Mahlzeitenstatistik und Trefferkarten
- Bibliotheksauswahl: jeder Treffer öffnet den Portionsdialog
- Vortagsaktion: delegiert an die allgemeine Übernahme aller Mahlzeiten

Für einen vollständigen Rückbau sind primär `nutrition.js`, `nutrition.css` und `library.js` aus diesem Commit wiederherzustellen. Versions- und Cachemarker müssen dabei gemeinsam zurückgesetzt werden.
