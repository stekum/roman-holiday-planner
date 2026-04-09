# Roman Holiday Planner — Kurzanleitung

Unser gemeinsamer Rom-Planer. Mobile-first, kollaborativ, pro Familie farbcodiert, mit echten Google-Maps-Daten und Tagestouren-Routing zu Fuß.

**→ https://stekum.github.io/roman-holiday-planner/**

**Passwort:** siehe private Nachricht

> 💡 Am besten auf dem Handy benutzen. Die App merkt sich alles lokal im Browser — auf jedem Gerät hast du deine eigene Sammlung, bis wir eine echte Synchronisation einbauen.

---

## Die drei Tabs

### 🧭 Entdecken
Karte oben, POI-Liste unten. Hier sammelst du alle Orte, die euch interessieren.

### 🗺️ Reise
Pro Tag eine eigene Route. Du ziehst POIs aus der Entdecken-Liste in einen Tag, ordnest sie an, und die App zeichnet dir die Fuß-Route mit Zeit + Distanz.

### ⚙️ Settings
Reise-Zeitraum (bestimmt wie viele Tage im Reise-Tab auftauchen) und Familien-Liste (Name + Farbe für jede Familie, beliebig viele).

---

## So legst du einen Ort an

Tippe unten rechts auf den **„+"-Button**. Vier Wege:

### 🔍 Suchen
Tippe den Namen ein — Restaurant, Hotel, Airbnb, Sehenswürdigkeit, egal was. Die App durchsucht Google Places wie Google Maps selbst. Foto, Adresse und Rating werden direkt angezeigt, bevor du speicherst.

### 📍 Auf Karte
Tipp einfach auf ein **Restaurant-/Hotel-/Sehenswürdigkeit-Icon** direkt auf der Karte. Die App holt alle Daten von Google und öffnet sofort den Hinzufügen-Dialog.

> Geht auch **direkt ohne „+"-Button**: einfach auf der Karte ein Icon antippen → Dialog ist sofort da.

### ✍️ Manuell
Für Orte ohne genaue Adresse, z.B. „Der Aussichtspunkt den XY empfohlen hat". Du gibst nur Name + Notiz ein. Der Ort landet in der **Inbox** und kann später verortet werden.

### 📸 Instagram
Kopiere einen Instagram-Post-Link rein → „Holen" → die App versucht Bild, Titel und Beschreibung zu extrahieren. Funktioniert oft, aber nicht immer (Instagram blockiert manches).

> Instagram-Posts haben **keine Koordinaten**. Du kannst unten im Dialog optional den Ort suchen (Places-Suche), oder den POI ohne Ort speichern — er landet in der **Inbox**.

---

## Inbox (Orte ohne Koordinaten)

Oben auf dem Entdecken-Tab erscheint ein **oranger Banner**, wenn Orte noch nicht verortet sind (aus manuellen Einträgen oder Instagram-Importen).

Auf jeder betroffenen POI-Card siehst du einen **„Verorten"**-Button → öffnet die Places-Suche, und sobald du einen Ort wählst, bekommt der POI seine Koordinaten.

---

## Was du mit einer POI-Card machen kannst

- **Bildbereich antippen** → Karte zoomt zum Ort und zeigt ein Info-Fenster
- **❤️ Herz** → liken (zählt hoch)
- **+ Zum Tag** → fügt den Ort in den aktuell aktiven Tag im Reise-Tab ein
- **✏️ Stift** (oben rechts) → Name, Familie, Kategorie, Notiz, Bild editieren
- **🗑️ Papierkorb** → löschen (wird auch aus allen Tagen entfernt)
- Wenn verlinkt: **Google Maps** und **Instagram** als klickbare Chips

Die **Tage-Chips** unter dem Titel zeigen, an welchen Tagen dieser Ort bereits im Plan steht (z.B. „Tag 3 · Do, 16. Okt"). Ein Ort kann mehreren Tagen zugeordnet sein.

---

## Tagestour planen

1. Geh in den **Reise-Tab**
2. Oben kannst du zwischen den Tagen wechseln (Chip pro Tag)
3. Wechsle zurück zu **Entdecken**, tippe „+ Zum Tag" auf den Orten die du am ausgewählten Tag besuchen willst
4. Zurück im Reise-Tab: Reihenfolge mit den ↑ ↓ Pfeilen ändern
5. Die Karte zeigt die **Fuß-Route** zwischen allen Stopps mit Gesamtdistanz und -zeit

Jeder Tag hat seine eigene Auswahl und Route. Ein Ort kann an mehreren Tagen liegen.

---

## Familien

In den Settings legst du an, welche Familien/Leute dabei sind. Jede bekommt eine Farbe, und diese Farbe taucht überall wieder auf — Pins auf der Karte, Card-Badges, Nummerierung im Tagesplan. Beim Anlegen eines POIs wählst du aus, wer den Tipp gebracht hat.

---

## Das musst du wissen

### Daten liegen nur in deinem Browser
Alles — POIs, Likes, Tagesplan, Settings — wird in `localStorage` gespeichert. Das heißt:
- **Jedes Gerät hat seine eigene Sammlung** (Handy ≠ Laptop)
- **Privater Modus funktioniert nicht** (wird beim Schließen gelöscht)
- **Browser-Daten löschen = alles weg**

### Kollaboration ist (noch) manuell
Wenn zwei Familien Orte sammeln, müssen wir das gelegentlich zusammenführen — aktuell noch per Hand. Echte Sync kommt später falls die App sich bewährt.

### Die App ist passwortgeschützt
Das Passwort hält Zufalls-Besucher raus. Es ist **kein** hartes Security-Feature — wer es drauf anlegt, kommt rein. Aber der Google-Maps-Key ist serverseitig über die Cloud Console eingeschränkt und kann nicht missbraucht werden.

### Wenn mal was nicht geht
- **Seite neu laden** (`Cmd+Shift+R` oder lange tippen → Neu laden)
- **Settings → Gefahrenzone → Alles zurücksetzen** — löscht alle lokalen Daten und startet frisch

---

## Habt Spaß dabei 🇮🇹

Wenn ihr Feedback habt, Bugs findet oder eine Funktion vermisst: einfach Bescheid geben.
