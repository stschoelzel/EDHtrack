# EDHtrack
MTG / Commander match tracker. **GitHub Pages frontend + Supabase backend.**

No build steps required. Static HTML/JS on GitHub Pages, Supabase Postgres as database.

---

## Für Mitspieler (einfach loslegen)

Öffne [https://stschoelzel.github.io/EDHtrack/](https://stschoelzel.github.io/EDHtrack/), klick auf **Login mit GitHub** — fertig. Supabase-Verbindung ist bereits eingebaut. Sobald du eingeloggt bist und der Admin dich freigeschaltet hat, kannst du Matches eintragen.

Du brauchst kein eigenes Supabase-Konto, keinen Token, kein Setup.

---

## Security Model

**Der Supabase Publishable Key ist bewusst öffentlich.**
Er steckt direkt im Quellcode — das ist by design, wie eine Restauranttür: sie ist offen, aber an der Kasse wirst du trotzdem aufgehalten.

Schutz läuft komplett über **Row Level Security (RLS)** in Postgres:

* Die Datenbank weiß via OAuth wer du bist.
* RLS prüft ob du in `allowed_users` stehst.
* Ja → lesen und schreiben erlaubt. Nein → Access Denied.

Der Key alleine gibt einem Angreifer **null** Möglichkeit, Daten zu lesen oder zu manipulieren.

---

## Setup (für Forker — eigene Instanz aufsetzen)

> **Du willst EDHtrack für deine eigene Gruppe hosten?** Dann fork das Repo und folge diesen Schritten. Du bekommst deine eigene Datenbank, deine eigene Benutzerverwaltung, unabhängig vom Original.

### 1. Repo forken
Fork auf GitHub. Public oder private — kein Geheimnis liegt mehr im Code (außer dem Anon Key, der aber public-by-design ist).

### 2. Supabase-Projekt anlegen
Gratis-Account auf [supabase.com](https://supabase.com). Neues Projekt erstellen, Region wählen, DB-Passwort speichern (nur für direkten DB-Zugriff nötig, nicht für die App).

### 3. Schema importieren
Supabase Dashboard → **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
Optional: [`supabase/seed.sql`](supabase/seed.sql) für Default-Spieltypen (EDH, Planechase, …).

### 4. GitHub OAuth App erstellen
GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**:

| Feld | Wert |
|---|---|
| Application name | `EDHtrack` |
| Homepage URL | `https://<dein-username>.github.io/<repo-name>/` |
| Authorization callback URL | Aus Supabase kopieren: Dashboard → Authentication → Providers → GitHub → "Callback URL" |

Client ID + Client Secret notieren.

### 5. GitHub-Provider in Supabase aktivieren
Dashboard → **Authentication** → **Providers** → **GitHub** → aktivieren → Client ID + Secret eintragen → Save.

### 6. Site URL + Redirect URLs setzen
Dashboard → **Authentication** → **URL Configuration**:
- **Site URL** = `https://<dein-username>.github.io/<repo-name>/`
- **Redirect URLs** — klick auf "Add URL" und trage **beide** ein:
  - `https://<dein-username>.github.io/<repo-name>/tracker.html`
  - `https://<dein-username>.github.io/<repo-name>/index.html`

> Ohne diese Einträge schlägt der OAuth-Redirect fehl und du landest nach dem GitHub-Login auf einer Fehlerseite.

### 7. DEFAULT_CONFIG in `js/supabase-client.js` anpassen
Öffne `js/supabase-client.js` und trage deine eigenen Werte ein:

```js
const DEFAULT_CONFIG = {
    url: "https://dein-projekt.supabase.co",   // Supabase → Settings → API → Project URL
    key: "dein_anon_key",                       // Supabase → Settings → API → Anon / Public
    owner: "dein-github-username",              // Dein GitHub-Login (wird automatisch Admin)
};
```

Committen und pushen.

### 8. GitHub Pages aktivieren
Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → `main`, `/ (root)` → Save.
Nach ~1 Minute ist die Seite live unter `https://<dein-username>.github.io/<repo-name>/`.

GitHub zeigt eine Warnung dass die Seite öffentlich erreichbar ist, auch bei privatem Repo. Das ist gewollt — der Schutz liegt in RLS, nicht im URL-Geheimnis.

### 9. Einloggen & Admin werden
Öffne deine Page-URL, klick **Login mit GitHub**. Da dein GitHub-Username in `DEFAULT_CONFIG.owner` steht, erkennt die Datenbank dich als Owner und setzt dich automatisch als Admin.

### 10. Mitspieler einladen
**Manage Users** im Topbar → GitHub-Username, Discord-Name oder E-Mail eintragen → eingeladen. Beim nächsten Login deines Mitspielers wird er automatisch freigeschaltet.

## Schema Reference

All schema definitions are located in [`supabase/schema.sql`](supabase/schema.sql).

| Table | Purpose |
|---|---|
| `app_config` | Stores the GitHub username of the Repo Owner. |
| `allowed_users` | Whitelisted users who can use the app. |
| `pending_invites` | Invitations created by the Admin. |
| `matches` | The core match data. |
| `players`, `decks` | Lookup tables for autocomplete. |
| `game_types` | E.g., EDH, Planechase, Pentagram. |
| `win_conditions` | E.g., Combat Damage, Commander Damage. |

## How it works

- **OAuth Flow**: The app uses Supabase GoTrue for authentication. When you click "Login", Supabase redirects you to the provider, then back to the app, establishing a secure session.
- **Admin Bootstrap**: The first time the app connects to the database, it saves the Repo Owner's GitHub username in `app_config`. A Postgres trigger automatically grants `is_admin = true` to the first user who logs in matching that username.
- **Dynamic Learning**: When a user submits a match with a new Deck or Player name, the app uses an `upsert` query to dynamically add it to the lookup tables, keeping autocomplete lists up-to-date.
- **RLS Policies**: Every read and write to the data tables is validated by the database. If you aren't in `allowed_users`, the Postgres database rejects your query instantly.

## Gotchas

- **Supabase Free Tier**: Free tier projects are paused after 1 week of zero activity. You will need to log into the Supabase Dashboard to unpause it if you haven't played Magic in a while.
- **OAuth Redirects**: If your GitHub Pages URL changes, you MUST update the Site URL in the Supabase Dashboard, or login will fail.
- **Publishable Key**: It is public. Do not panic if you see it in your browser console.

## If something goes wrong

- **Compromised Auth Provider**: If you accidentally leak your GitHub OAuth Client Secret, rotate it in GitHub immediately, then update it in the Supabase Dashboard.
- **Lockout**: If you somehow lose Admin rights, you can manually fix it. Go to the Supabase SQL Editor and run:
  ```sql
  update allowed_users set is_admin = true where display_name = 'your_username';
  ```
- **Clearing local config**: Tap "Reset Setup" in the app or clear your browser's site data to wipe the stored Supabase URL and Key from the device.