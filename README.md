# EDHtrack

Single-file MTG / Commander match tracker. No backend, no build. The repo itself is the database — match data lives in CSV files committed via the GitHub API.

## Security model

Read this before setting up.

- **The GitHub token and your username are NEVER committed to the repo.** They are entered once on the Setup screen and stored in your browser's `localStorage`. They live on your device only.
- **Use a fine-grained Personal Access Token scoped to this single repo.** Not a classic token, not an org-wide token, not a token with `repo` scope across all your repos. Just this one repo.
- **Repo-only token, repo-only token, repo-only token.** If the token leaks (e.g. someone gets your phone unlocked), the blast radius is limited to this one repo of match data — nothing else in your GitHub account.
- **GitHub Pages publishes everything in the repo as static files** — including `users.csv`. Even if your repo is private, the Pages URL is public, and anyone who guesses or finds `https://<user>.github.io/<repo>/users.csv` can read the plaintext credentials. Treat the app login as a **"cheap bike lock"**: it stops casual passers-by, not a determined attacker. Use a unique password you don't reuse elsewhere.

## Setup

### 1. Fork this repo

**Fork on GitHub. Setting the fork to PRIVATE is recommended** — it hides your match history, deck list, and source code from random visitors browsing GitHub.

But know this: **a private repo does not make your Pages site private.** Once Pages is enabled (step 4), `https://<user>.github.io/<repo>/users.csv` is reachable by anyone who knows the URL. So:

*   **The Reality:** Plaintext passwords in a CSV are a security nightmare by professional standards.
*   **Our Philosophy:** This is just match data and deck lists — nothing valuable to steal. The login is a minimal hurdle to keep random internet strangers from messing with your stats — it’s not meant to stop someone dedicated.
*   **The Fix:** Use a unique password (don't reuse one from your email, bank, etc.). Keep the repo private so your URL isn't trivially discoverable.

### 2. Create a fine-grained Personal Access Token

Go to GitHub → click your avatar → **Settings** → **Developer settings** (left side, very bottom) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.

The form has several sections — fill them as follows:

#### 2a. Basics

| Field | Value |
|---|---|
| Token name | `edhtrack` (or whatever helps you remember) |
| Expiration | up to you — shorter is safer (90 days is a good default) |
| Description | optional |
| Resource owner | **your account** (not an org) |

#### 2b. Repository access

This is where you pick **which** repos the token can touch.

- Select **Only select repositories**.
- A repository picker appears. Search for and select **only your `EDHtrack` fork**. Nothing else.
- Do **NOT** pick "All repositories" or "Public repositories".

#### 2c. Repository permissions

This is where you pick **what** the token can do.

Scroll down to the **Repository permissions** section and set:

| Permission | Value |
|---|---|
| **Contents** | **Read and write** ← this is the one the app needs |
| **Metadata** | **Read-only** ← already there, can't be turned off, this is normal |
| All other permissions | leave at **No access** |

> "Metadata: Read-only" is **mandatory** for any fine-grained token and is added automatically — that's expected, not a misconfiguration. It just lets GitHub identify which repo the token belongs to.

#### 2d. Generate and copy

Click **Generate token**. Copy the token (it starts with `github_pat_…`). You'll paste it into the app's Setup screen later. **GitHub only shows the token once** — if you lose it, generate a new one.

> **Do NOT** create a classic token. Do NOT pick "All repositories". Do NOT grant any permission other than Contents (read/write) and the auto-included Metadata (read-only). Repeat: token must be scoped to this **single** repo, with **only** Contents read/write.

### 3. Edit `users.csv`

Set your app login. Plaintext, one row per user:
```
Username,Password
admin,changeme
```
Commit and push.

### 4. Enable GitHub Pages

Go to your fork → **Settings** → **Pages** (left sidebar).

1. **Build and deployment → Source**: select **Deploy from a branch** (the other option, "GitHub Actions", is not what we want — we ship a plain static `index.html`, no build step).
2. **Branch**: select **`main`**, folder **`/ (root)`** → click **Save**.
3. GitHub will show a warning that **your site will be publicly available on the internet, even if your repository is private**. This is expected — see the security model section above. Confirm.
4. Wait ~1 minute. Refresh the Pages settings page. A box at the top will show:
   > **Your site is live at https://&lt;your-username&gt;.github.io/EDHtrack/**

That's your URL. Open it on phone, desktop, anywhere. Bookmark it.

> If your repo is named something other than `EDHtrack`, the URL is `https://<your-username>.github.io/<repo-name>/`. Use that name when entering "Repo Name" on the app's Setup screen too.

### 5. Open the URL on your phone

- First load: **Setup screen** appears. Enter your GitHub username, repo name (`EDHtrack`), and the fine-grained PAT. The app validates the token by hitting the repo, then stores it locally on the device. Never committed.
- Then: log in with the credentials from `users.csv`.
- Done. Submit matches with your thumb.

If you ever want to wipe the device's stored token: tap **Reset Setup** in the top bar, or clear browser storage for the page.

## Gotchas

- **Token expiration**: when the PAT expires, the app silently fails on submit (401 from GitHub). Generate a new token and tap **Reset Setup** in the app.
- **Incognito / private browsing**: `localStorage` is wiped when the tab closes. You'll re-enter the token each session.
- **Browser cache after updates**: after pushing a new `index.html`, GitHub Pages can serve the old version for up to a few minutes. Hard-reload (Ctrl+Shift+R / long-press reload on mobile) if something looks off.
- **`users.csv` lives in git history forever**: if you commit a real password and later change it, the old one is still recoverable from `git log`. If a password leaks, rotate it AND assume the old one is permanently exposed in history.
- **Multiple devices**: each device needs Setup once. Tokens are not synced — that's the whole point.

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

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → **Revoke**. Generate a new one, tap **Reset Setup** in the app, and paste the new token. 

Because the token is repo-scoped, the damage is strictly bounded. Here is the **Worst Case Scenario**:

*   **Data Corruption:** Someone could steal, delete, or mess with your `matches.csv`. Since it's just match data—**so what?** It’s annoying, but not a life-altering event.
*   **Page Hijacking:** Since the token has write-access, an attacker could replace `index.html` with a malicious version. If your friends use the site, the hijacked page could try to phish their app-passwords or worse...
*   **Your Account Stays Safe:** This is the most important part. Because you used a **fine-grained token**, the attacker has **ZERO access** to your other repositories, your private emails, your billing info, or your account settings. 

The "blast radius" is limited to your garden shed (this repo), while your main house (your GitHub account) remains locked and secure.