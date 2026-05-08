# EDHtrack
Single-file MTG / Commander match tracker. **GitHub Pages frontend + Supabase backend.**

No build steps required. The app is a static HTML/JS page hosted for free on GitHub Pages, connecting to a free Supabase Postgres database. 

## Security Model

**The Supabase Publishable Key is PUBLIC.**
You will paste the Publishable Key and the Supabase URL into the Setup screen. It is saved in your browser's `localStorage` and will be sent with every request. **This is completely safe and by design.** 

Supabase uses **Row Level Security (RLS)** in Postgres.
This means the Publishable Key alone gives an attacker **zero** ability to read or write data unless they are an authenticated user explicitly listed in the `allowed_users` table. Even if the key is extracted from your frontend, the RLS policies act as an unbreakable shield. 

* The database knows who the user is via OAuth.
* RLS checks if the user is in `allowed_users`.
* If yes, they can read and write matches.
* If no, they get access denied.

## Setup



Follow these steps to set up EDHtrack for yourself.

### 1. Fork this repo
Fork this repository to your GitHub account. It can be public or private, since no secrets are stored in the code anymore.

### 2. Create a Supabase Account
Register for free at [supabase.com](https://supabase.com).

### 3. Create a New Project
Create a new project in Supabase. Choose a region near you. **Save the database password** (you won't need it for the app, but you'll need it if you ever want to connect to the DB directly).

### 4. Import the Schema
In the Supabase Dashboard, go to **SQL Editor**. 
Open the `supabase/schema.sql` file from this repository, paste its contents into the SQL Editor, and click **Run**.
(Optional) You can also run `supabase/seed.sql` to add default game types.

### 5. Create a GitHub OAuth App
To allow users to log in with GitHub, you need an OAuth app:
1. Go to GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**.
2. **Application name**: `EDHtrack`
3. **Homepage URL**: `https://<your-username>.github.io/<your-repo-name>/`
4. **Authorization callback URL**: Copy this from Supabase (Dashboard → Authentication → Providers → GitHub → "Callback URL").
5. Save and copy the **Client ID** and **Client Secret**.

### 6. Enable the GitHub Provider in Supabase
In the Supabase Dashboard, go to **Authentication** → **Providers** → **GitHub**.
Enable it, and paste the Client ID and Client Secret you got from GitHub. Click Save.

### 7. Configure Site URL
In Supabase Dashboard → **Authentication** → **URL Configuration**:
Set the **Site URL** to your GitHub Pages URL: `https://<your-username>.github.io/<your-repo-name>/`

### 8. Enable GitHub Pages
In your GitHub Repo → **Settings** → **Pages**.
Set **Source** to "Deploy from a branch", pick `main`, and click Save. 
Wait a minute and open your live site URL.

### 9. Complete App Setup
1. Open the app on your phone or desktop.
2. The **Setup Screen** will ask for your Supabase Project URL, your Publishable Key (find these in Supabase Dashboard → Settings → API), and your GitHub Username.
3. Click Connect. The app will save the URL and Key locally and register you as the owner in the database.
4. Click **Login with GitHub**. You will automatically be granted Admin rights!

### 10. Invite Players
Once logged in, click the **Manage Users** button in the top bar.
You can invite your friends using their GitHub usernames, Discord usernames, Google emails, or Apple emails. 
When they visit your URL and click "Login", they will instantly be whitelisted and can start submitting matches.

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