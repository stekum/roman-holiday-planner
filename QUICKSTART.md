# Roman Holiday Planner

> Hab da mal ne App gebaut für unseren Rom-Trip. Ist kein Produkt, kein AppStore, kein nix — nur ein Bookmark im Browser. Aber dafür richtig praktisch, versprochen. 🇮🇹

**→ https://stekum.github.io/roman-holiday-planner/beta/**

**Passwort:** Frag Stefan (kriegt ihr per Signal)

> 💡 Am besten auf dem **Handy** öffnen und zum Homescreen hinzufügen (Safari: Teilen → „Zum Home-Bildschirm"). Dann öffnet sie sich wie eine echte App.

---

## Was das Ding kann

**Wir sammeln gemeinsam Orte für Rom** — Restaurants, Sehenswürdigkeiten, Trattorias, Gelaterias, das komische Boutique-Geschäft das jemand auf Instagram gesehen hat. Alles in einer gemeinsamen Karte, pro Familie farbig markiert. Und am Ende kann man sich pro Tag eine **Fußgänger-Route** basteln, die einem sagt welcher Ort nach welchem kommt.

Und das Geilste: **alles läuft in Echtzeit synchron**. Wenn ich auf meinem Handy in der Schlange beim Bäcker was eintrage, poppt es 2 Sekunden später auf deinem Laptop auf. Kein Refresh, kein Export, kein „ich hab dir gerade ne Liste geschickt". Genau wie in einem Google-Doc, nur mit Karte.

---

## Die drei Tabs

### 🧭 Entdecken
Karte oben, Orte-Liste unten. Hier sammelst du alles was euch einfällt.

### 🗺️ Reise
Deine Tagestouren. Jeder Tag hat seinen eigenen Tab, du wählst aus den Orten im Entdecken-Tab aus welche du am Tag X besuchen willst, sortierst sie mit den Pfeilen, und die App zeichnet dir die **echte Fußgänger-Route** mit Distanz und Dauer dazu. Ein Ort kann auch an mehreren Tagen auftauchen — wenn ihr z.B. zweimal am Pantheon vorbeikommt, ist das kein Problem.

### ⚙️ Settings
- **Reise-Zeitraum** — bestimmt wie viele Tage im Reise-Tab auftauchen
- **Familien** — Name + Farbe, so viele wie ihr wollt
- Unten die „Gefahrenzone" (Papierkorb für den lokalen Browser-Cache, falls mal was komisch ist)

---

## Einen Ort hinzufügen — 4 Wege

Unten rechts ist ein **„+"-Button**. Tippe drauf, wähle einen von vier Wegen:

### 🔍 Suchen
**Der goldene Standard.** Tipp den Namen ein — Restaurant, Airbnb, Hotel, Sehenswürdigkeit — und die App sucht in Google Places. Genau wie Google Maps selbst, nur dass du das Ergebnis direkt in unsere Sammlung packen kannst. Bild, Adresse, Sterne kommen automatisch mit.

### 📍 Auf Karte tippen
Du kannst **direkt auf die Karte tippen** und eins dieser kleinen Icons für Restaurants, Hotels, Cafés, Museen auswählen. Die App holt alle Daten von Google (Foto, Name, Adresse, Rating) und öffnet sofort den Dialog. Geht auch **ohne den „+"-Button** vorher — einfach tippen und los.

> ⚠️ **Achtung**: Google versteckt Airbnbs und Ferienwohnungen auf der eingebetteten Karte (keine Ahnung warum, Google-Politik). Wenn du ein Airbnb hinzufügen willst → nimm „Suchen" statt „Auf Karte".

### ✍️ Manuell
Für „ich hab da was auf Reddit gelesen, weiß nur den Namen". Du tippst Name + Notiz rein, der Ort landet in der **Inbox** (dazu gleich mehr) und wird später verortet.

### 📸 Instagram
Kopiere den Link eines Instagram-Posts rein → „Holen" → die App versucht Bild, Titel und Beschreibung zu extrahieren. **Klappt nicht immer** (Instagram blockt gerne), aber wenn's klappt ist es ganz nett. Ohne Ort landet der Eintrag in der Inbox und du kannst ihn später verorten.

---

## Die Inbox

Wenn ein Ort noch keine Koordinaten hat (aus „Manuell" oder „Instagram ohne Ort"), erscheint auf dem Entdecken-Tab oben ein **oranger Banner**: „3 Orte warten auf Verortung". Die betroffenen Karten haben einen **„Verorten"**-Button — anklicken, Google-Suche, Ort auswählen, fertig.

---

## Was du mit einer Karte in der Liste machen kannst

- **Bild antippen** → Karte zoomt zu dem Ort, kleines Info-Fensterchen mit Foto + Adresse
- **❤️ Herz** → liken (mehr Like = mehr „das will ich!"-Signal)
- **+ Zum Tag** → fügt den Ort zum aktuell im Reise-Tab ausgewählten Tag hinzu
- **✏️ Stift** → editieren: Titel, Familie, Kategorie, Notiz, Bild-URL (falls du ein besseres Foto hast)
- **🗑️ Papierkorb** → löscht **für alle** (Achtung: kein Undo!)
- Wenn verlinkt: **Google Maps** + **Instagram** als Chips direkt auf der Karte

Unter dem Titel siehst du **Tag-Chips** wie „Tag 3 · So, 01. Nov" — zeigt euch an welchen Tagen dieser Ort schon im Plan steht.

---

## Familien

In den Settings legst du ein **Familien an**, jede mit Namen und Farbe. Die Farbe taucht überall wieder auf:
- **Pins** auf der Karte in Familienfarbe
- **Badge** auf jeder Karte (z.B. „Kummert" in Grün)
- Die **Nummerierung** im Tagesplaner bekommt ihre Farbe

Beim Anlegen eines Ortes wählst du aus, welche Familie den Tipp gebracht hat. Kleine Eifersuchts-Statistik am Ende der Reise inklusive. 😏

---

## Ein paar Dinge die du wissen solltest

### Alles läuft live synchron
Änderungen sind **sofort für alle sichtbar**. Kein „ich schick dir gleich die neue Liste". Gleichzeitig heißt das auch: **Wenn jemand auf den Papierkorb drückt, ist es für alle weg**. Vorsicht mit dem Löschen.

### Passwortgeschützt
Damit nicht wahllos Leute aus dem Internet mit unserer Planung rumspielen, hab ich nen Passwort-Riegel vorgebaut. Ist nicht Fort Knox, aber hält Zufalls-Besucher raus.

### Die App ist noch Bastelarbeit
Das ist kein glattgeschliffenes Produkt, sondern ein privates Tool für uns. Wenn was komisch aussieht, bitte einfach Stefan Bescheid geben — meistens ist's in 5 Minuten gefixt.

### Wenn mal gar nichts geht
- **Seite neu laden** (`Cmd+Shift+R` am Laptop, lange tippen → Neu laden auf Handy)
- **Settings → Gefahrenzone → Alle Daten zurücksetzen** (löscht lokalen Cache, Firebase-Daten bleiben erhalten)
- **Stefan anschreiben** mit Screenshot

### Browser-Kompatibilität
Funktioniert in **Safari, Chrome, Firefox, Edge** — auf Handy und Desktop. Internet Explorer wird nicht unterstützt. (Falls jemand noch IE benutzt: kauf dir ein neues Leben.)

---

## Tipp: So würde ich das machen

1. **Jetzt schon mal einige Favoriten reinkloppen** — die offensichtlichen Sehenswürdigkeiten, die Restaurants die jemand empfohlen hat, die Airbnbs falls noch nicht gebucht
2. Während der Reise **nach jedem Tag kurz durchgehen** — was hat sich bewährt, was kommt für morgen?
3. **Instagram-Links im Vorfeld sammeln**: wenn ihr was scrollt und denkt „huh, sieht cool aus" → Link kopieren, in die App pasten, in die Inbox damit
4. **Am Anreisetag die Route für Tag 1 fixieren**: Reise-Tab → Tag 1 → Orte reinziehen → Reihenfolge so setzen dass die Route zu Fuß Sinn ergibt → los geht's

---

## Feedback willkommen

Die App wird gebaut während wir sie benutzen. Wenn dir was fehlt, wenn was nervt, wenn ein Bug auftaucht — schick mir einfach ne Nachricht mit Screenshot. Fast alles lässt sich in einer Stunde fixen.

**Buon viaggio!** 🍕🍝🍦
