# EDHtrack
MTG / Commander match tracker. **GitHub Pages frontend + Google Sheets backend.**

No build steps required. Static HTML/JS auf GitHub Pages, Google Sheets als Datenbank in deinem eigenen Google Drive.

---

## Für Nutzer (einfach loslegen)

Sobald der Tracker eingerichtet ist (siehe Setup):
Öffne die URL (z.B. [https://stschoelzel.github.io/EDHtrack/](https://stschoelzel.github.io/EDHtrack/)), trage die Google Client ID und den API Key ein, klicke auf **Connect** und logge dich danach mit deinem Google-Account ein.

Sobald du eingeloggt bist, legt die App automatisch ein Google Sheet namens `EDHtrack_Data` in deinem Google Drive an. Du kannst sofort Matches eintragen.

---

## Security Model

**Deine Daten gehören dir.**
Der Tracker speichert alle Daten direkt in einem Google Sheet in deinem persönlichen Google Drive.

Schutz läuft komplett über **Google OAuth 2.0**:

* Die App greift via OAuth nur auf die Google Sheets zu, die von der App selbst erstellt wurden (über den Scope `https://www.googleapis.com/auth/drive.file`).
* Ohne deinen Login und deine explizite Freigabe passiert nichts.
* Es gibt kein zentrales Backend mehr, das gehackt werden könnte. Jeder Nutzer (oder jede Gruppe, die sich einen Account teilt) hat seine eigene Datenbank in Form eines Google Sheets.

---

## Setup (für Forker — eigene Instanz aufsetzen)

> **Du willst EDHtrack für deine eigene Gruppe hosten?** Dann fork das Repo und folge diesen Schritten. Jeder Nutzer verbindet sein eigenes Google Drive, um die Matches zu speichern.

### 1. Repo forken
Fork auf GitHub. Public oder private — die App ist statisch.

### 2. Google Cloud Projekt erstellen
Gehe zur [Google Cloud Console](https://console.cloud.google.com/) und erstelle ein neues Projekt.

### 3. APIs aktivieren
Gehe zu **APIs & Services > Library** und aktiviere folgende zwei APIs für dein Projekt:
1. **Google Sheets API**
2. **Google Drive API**

### 4. OAuth Consent Screen (Zustimmungsbildschirm) einrichten
Gehe zu **APIs & Services > OAuth consent screen**:
* Wähle **External** (oder Internal, wenn du Google Workspace nutzt).
* Fülle die Pflichtfelder aus (App name, User support email, Developer contact information).
* Klicke auf **Save and Continue**.
* Unter **Scopes**, klicke auf **Add or Remove Scopes** und füge folgende Scopes hinzu:
  * `https://www.googleapis.com/auth/drive.file`
* Klicke auf **Save and Continue**.
* Füge unter **Test users** die Google-Accounts hinzu, die den Tracker nutzen sollen (solange die App im "Testing" Status ist).
* Klicke auf **Save and Continue** und dann zurück zum Dashboard.

### 5. Credentials (Zugangsdaten) erstellen
Gehe zu **APIs & Services > Credentials**.

#### API Key erstellen:
* Klicke auf **Create Credentials > API key**.
* Kopiere den generierten API Key (du brauchst ihn später im Tracker).

#### OAuth Client ID erstellen:
* Klicke auf **Create Credentials > OAuth client ID**.
* Wähle als Application type **Web application**.
* Name: z.B. `EDHtrack`
* **Authorized JavaScript origins**: Trage die URL ein, unter der dein Tracker gehostet wird, z.B. `https://<dein-username>.github.io` und `http://localhost:8000` (für lokales Testen).
* **Authorized redirect URIs**: Trage die genaue URL zu deinem Tracker ein, z.B. `https://<dein-username>.github.io/<repo-name>/` (und `http://localhost:8000/` für lokal).
* Klicke auf **Create**.
* Kopiere die generierte **Client ID**.

### 6. GitHub Pages aktivieren
In deinem GitHub Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → `main`, `/ (root)` → Save.
Nach ~1 Minute ist die Seite live unter `https://<dein-username>.github.io/<repo-name>/`.

### 7. App verbinden
* Öffne deine Page-URL.
* Trage die generierte **Google Client ID** und den **Google API Key** ein.
* Klicke auf **Connect**.
* Im zweiten Schritt, klicke auf **Login mit Google** und melde dich an.

Beim ersten Login wird automatisch das Sheet `EDHtrack_Data` in deinem Drive erstellt und mit den nötigen Tabellen (`Matches`, `Players`, `Decks`, `Game_Types`, `Win_Conditions`) initialisiert.

## Schema Reference

Die Datenstruktur wird automatisch in Google Sheets (Tabs) angelegt:

| Sheet | Purpose |
|---|---|
| `Matches` | The core match data (`id`, `played_at`, `participants`, `winner`, `is_draw`, `turn`, `win_condition`, `game_type`, `created_at`). |
| `Players` | Lookup table for autocomplete. |
| `Decks` | Lookup table for autocomplete. |
| `Game_Types` | E.g., EDH, Planechase. |
| `Win_Conditions` | E.g., Combat Damage, Commander Damage. |

## How it works

- **OAuth Flow**: Die App nutzt Google Identity Services zur Authentifizierung. Beim Login stimmst du zu, dass die App in deinem Google Drive Dateien erstellen und bearbeiten darf (Scope `drive.file`).
- **Dynamic Learning**: Wenn du ein Match mit einem neuen Deck, Spieler, Spieltyp oder einer neuen Siegbedingung einträgst, fügt die App diese automatisch in die entsprechenden Sheets (Tabs) ein.
- **Datenhaltung**: Alle Daten liegen in deinem Google Drive als normales Spreadsheet. Du kannst es jederzeit öffnen, ansehen oder manuell bearbeiten.

## If something goes wrong

- **Fehler beim Login**: Stelle sicher, dass du deinen Google-Account unter "Test users" im OAuth Consent Screen (Google Cloud Console) hinzugefügt hast, falls die App noch im "Testing" Status ist.
- **Clearing local config**: Tippe auf "Reset Setup" in der App oder leere die Website-Daten deines Browsers, um die gespeicherte Google Client ID und den API Key vom Gerät zu löschen.
