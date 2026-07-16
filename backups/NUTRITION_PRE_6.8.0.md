# Rückbaupunkt Ernährung vor 6.8.0

Der letzte veröffentlichte Stand vor dem intelligenten Portions-, Such- und Nährwert-Upgrade ist CutCoach 6.7.1 auf `main`.

- Commit: `8ec2cad78a57c3cac03c16b973b174cf730dfc44`
- Tagebuchschema: 5
- Bibliotheksschema: 2
- Suche: exakte Teilbegriffe ohne Tippfehlerkorrektur oder Textmengen
- Portionen: Faktor-Auswahl mit nachträglich injiziertem Mengenfeld

Für einen vollständigen Rückbau sind vor allem `core.js`, `actions.js`, `library.js`, `library.css`, `nutrition.js`, `nutrition.css` und `index.html` aus diesem Commit wiederherzustellen. Versions- und Offline-Cachemarker müssen gemeinsam zurückgesetzt werden.
