# EDHtrack

Single-file MTG / Commander match tracker. No backend, no build. The repo itself is the database — match data lives in CSV files committed via the GitHub API.

## Security model

Read this before setting up.

- **The GitHub token and your username are NEVER committed to the repo.** They are entered once on the Setup screen and stored in your browser's `localStorage`. They live on your device only.
- **Use a fine-grained Personal Access Token scoped to this single repo.** Not a classic token, not an org-wide token, not a token with `repo` scope across all your repos. Just this one repo.
- **Repo-only token, repo-only token, repo-only token.** If the token leaks (e.g. someone gets your phone unlocked), the blast radius is limited to this one repo of match data — nothing else in your GitHub account.
- App-login credentials in `users.csv` are plaintext on purpose. They gate access to the form, not anything sensitive. Low-priority by design.

## Setup

### 1. Fork this repo

Fork on GitHub. Public or private — your choice. Match data is not sensitive.

### 2. Create a fine-grained Personal Access Token

GitHub → Settings → Developer settings → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.

Configure exactly like this:

| Setting | Value |
|---|---|
| Token name | `edhtrack` (or whatever) |
| Expiration | up to you — short is safer |
| Resource owner | your account |
| **Repository access** | **Only select repositories** → pick **this fork only** |
| **Repository permissions** | **Contents: Read and write** |
| All other permissions | leave as `No access` |

Copy the token. It starts with `github_pat_…`.

> **Do NOT** create a classic token. Do NOT pick "All repositories". Do NOT grant any permission other than `Contents: Read and write`. Repeat: token must be scoped to this **single** repo, with **only** Contents read/write.

### 3. Edit `users.csv`

Set your app login. Plaintext, one row per user:
```
Username,Password
admin,changeme
```
Commit and push.

### 4. Enable GitHub Pages

Repo → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder: `/ (root)` → Save. Wait ~1 min, copy the published URL.

### 5. Open the URL on your phone

- First load: **Setup screen** appears. Enter your GitHub username, repo name (`EDHtrack`), and the fine-grained PAT. The app validates the token by hitting the repo, then stores it locally on the device. Never committed.
- Then: log in with the credentials from `users.csv`.
- Done. Submit matches with your thumb.

If you ever want to wipe the device's stored token: tap **Reset Setup** in the top bar, or clear browser storage for the page.

## How it works

- All data is stored as CSV files in this repo.
- The app reads/writes them via the GitHub Contents API: load → base64-decode → parse, then encode → PUT with previous SHA.
- New player names, deck names, game types, and winning conditions typed into the form are appended to their lookup CSVs automatically and become dropdown options next time.
- Branch is hardcoded to `main`.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app |
| `matches.csv` | Match history (append-only) |
| `players.csv` | Known player names |
| `decks.csv` | Known deck names |
| `gametypes.csv` | Known game types |
| `winconditions.csv` | Known winning conditions |
| `users.csv` | App-login credentials (plaintext, low-priority) |

## `matches.csv` schema

```
Date,Player1,Deck1,Player2,Deck2,Player3,Deck3,Player4,Deck4,Player5,Deck5,Player6,Deck6,Winner,Turn,WinCondition,GameType
```

Up to 6 players per match. Empty slots for shorter games. `Winner` is the player name (not index).

## If a token leaks

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → **Revoke**. Generate a new one, tap **Reset Setup** in the app, paste the new token. Done. Because the token is repo-scoped, the damage is bounded to this repo only.
