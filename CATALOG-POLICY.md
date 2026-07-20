# CutCoach Katalogrichtlinie

Diese Regeln gelten für jede künftige Erweiterung von Lebensmitteln, Gerichten und Rezeptvorlagen.

## 1. Keine isolierten Notfallbegriffe

Ein einzelner fehlender Suchbegriff wird nicht allein als Einmal-Patch ergänzt. Neue Inhalte werden als fachlich zusammenhängendes Paket geplant, zum Beispiel:

- ein Grundgericht plus übliche Varianten und Beilagen
- eine Lebensmittelgruppe mit Singular, Plural und gebräuchlichen Schreibweisen
- eine Dessert-, Frühstücks-, Kantinen- oder Länderküchen-Gruppe

Das Paket muss einen echten Ausbau des Katalogs darstellen und darf nicht nur den gerade gemeldeten Beispielsatz bestehen lassen.

## 2. Keine Dubletten

Vor der Aufnahme wird der vollständige vorhandene Katalog geprüft. Der Vergleich erfolgt normalisiert und umfasst:

- stabile IDs
- Hauptnamen
- sämtliche Aliase
- Umlaute und ASCII-Schreibweisen
- Bindestriche, Leerzeichen und sonstige Satzzeichen
- Groß- und Kleinschreibung

Eine neue ID darf nicht bereits vorhanden sein. Ein neuer Hauptname darf weder mit einem vorhandenen Hauptnamen noch mit einem vorhandenen Alias kollidieren. Kollidierende Aliase werden nicht erneut gespeichert.

## 3. Bestehende Varianten bleiben getrennt

Unterschiedliche fachliche Einträge dürfen nicht gegenseitig überschrieben werden. Beispiele:

- `Köfte`
- `Köfte Teller`
- `Köfte im Fladenbrot`

Sie dürfen gemeinsame Suchbestandteile haben, benötigen aber eindeutige IDs, Namen, Portionsbasen und Nährwerte.

## 4. Suchsprache vollständig abdecken

Zu jedem Datensatz werden nur sinnvolle, eindeutige Suchvarianten aufgenommen, darunter je nach Eintrag:

- Singular und Plural
- Umlaute und ASCII-Umschriften
- zusammengeschriebene und getrennte Formen
- übliche deutsche Bezeichnungen
- gebräuchliche Originalbezeichnungen
- typische Reihenfolgen der Bestandteile

Aliase dürfen keine andere Speise oder Portionsform vortäuschen.

## 5. Nährwerte und Portionen nachvollziehbar halten

Jeder Datensatz benötigt:

- eine eindeutige Portionsbasis
- Einheit und Menge
- Kalorien, Eiweiß, Kohlenhydrate und Fett
- Herkunfts-/Schätzkennzeichnung
- einen Hinweis, wenn Werte rezept- oder portionsabhängig schwanken

## 6. Verbindliche Tests

Jedes Katalogpaket erhält Regressionen für:

- die gemeldeten realen Suchanfragen
- Singular, Plural und Mengen
- vollständige Gerichte mit Wörtern wie `mit`, `und`, `auf` oder `ohne`
- relevante Tipp- und Schreibvarianten
- Kollisionen mit bestehenden IDs, Namen und Aliasen
- Erhalt bereits vorhandener ähnlicher Gerichte
- produktiven Loader, Offline-Manifest und Service-Worker-Cache

Eine Erweiterung wird erst nach vollständig grüner Gesamttestkette in `main` übernommen.
