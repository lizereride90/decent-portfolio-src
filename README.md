# Portfolio + Visual Editor

A personal portfolio site with a secure, Framer-style visual editor. The owner edits content directly from the live site — no code changes. Deployable to **Netlify or Vercel** as-is (`netlify/` functions + `api/` functions share all logic via `lib/`).

## How it works

- **Public site** (`index.html`): static HTML/CSS/JS. Renders portfolio data, no secrets anywhere.
- **Editor** (`js/editor/`): opens only after a server-side session check. Live preview, undo/redo, mobile/desktop preview, publish.
- **Backend** (`netlify/functions/`): login/logout/session/portfolio-get/portfolio-save. Auth enforced server-side on every write.

## Security model

- The admin password lives **only** in the `ADMIN_PASSWORD` environment variable. It never appears in frontend code or API responses.
- Login sets an `HttpOnly`, `SameSite=Lax`, `Secure`-in-production session cookie holding an HMAC-signed token (signed with `SESSION_SECRET`, 12h expiry).
- `portfolio-save` and `auth-logout` require the session cookie **and** pass a CSRF check (same-origin `Origin`/`Referer` + `X-Requested-With` custom header).
- Login is rate-limited (8 attempts / 10 min per IP) with a small delay on failure.
- All saved content is validated and sanitized server-side (`netlify/lib/validate.js`): field whitelist, length caps, URL allowlist (`http/https`, `mailto/tel`, `#`/`/` relative, `data:image`), 1.5MB payload cap.
- The editor button (`#adminFab`) is `hidden` unless `/auth-session` confirms a session. Entry points (footer dot ×5, `Ctrl+Shift+E`, `?edit`, `#admin`) open a login form — never the editor itself.
- `netlify.toml` adds `nosniff`, `DENY` framing, and `no-store` on API responses.

## Setup

1. **Environment variables** (Netlify → Site settings → Environment variables):
   - `ADMIN_PASSWORD` — a long random password. Generate: `openssl rand -base64 24`
   - `SESSION_SECRET` — a different random string. Generate: `openssl rand -hex 32`
2. That's it for storage — content persists in **Netlify Blobs** (store `portfolio-data`), provisioned automatically. No database to set up.

> If publishing ever reports a *"not configured to use Netlify Blobs"* storage
> error, your Functions runtime didn't auto-provision credentials. Fix: add two
> more env vars and redeploy — `BLOBS_SITE_ID` (Site settings → General → Site ID)
> and `BLOBS_TOKEN` (avatar → User settings → Applications → Personal access
> tokens → New access token). The backend uses them as an explicit fallback.

## Deploy — Netlify

Option A — drag & drop: zip this folder (without `node_modules`) and drop it on Netlify Drop.

Option B — Git:
1. Push this folder to a repo.
2. Netlify → Add new site → Import from Git. Build settings are read from `netlify.toml` (no build command, publish `.`, functions `netlify/functions`).
3. Set the two env vars above, redeploy.

## Deploy — Vercel

1. Push this folder to a repo.
2. Vercel → Add New → Project → Import the repo. Framework preset: **Other** (static). No build command, output directory `.` (defaults work — `api/` is picked up automatically).
3. Project → Settings → Environment Variables: add `ADMIN_PASSWORD` and `SESSION_SECRET` (same values as above).
4. Storage → Create Database → **Blob** → connect it to the project. This auto-injects `BLOB_READ_WRITE_TOKEN`. (Without it, the editor will warn that saves aren't persisted.)
5. Deploy. Same editor flow as Netlify (`?edit` → password → Publish).

## Local development

```bash
python3 dev-server.py          # serves the site + API at http://127.0.0.1:8123/
```

No dependencies needed (stdlib only). The dev server mirrors the Netlify
Functions (same session-cookie format, same auth/CSRF/validation rules) and
persists published content to `.dev-portfolio.json`. Dev admin password is
`admin123` (override with `ADMIN_PASSWORD` / `SESSION_SECRET` env vars).

Without any server, opening `index.html` directly still renders the default
content; login/save need `dev-server.py` (or `npx netlify-cli dev`, which runs
the real functions).

To reuse for your own portfolio: open the live site, sign in, and edit everything in the visual editor — or change `js/config-default.js` (and keep `netlify/functions/default-data.js` in sync) before first deploy.

## Project structure

```
index.html            public portfolio + hidden login + editor shell
css/                  base.css (tokens/login/fab) · portfolio.css · editor.css
js/
  config-default.js   centralized default portfolio data
  api.js              fetch layer, /api/* on both hosts (no secrets)
  theme.js            CSS-variable theme application
  render.js           data → DOM
  main.js             boot, discreet admin entry, login modal
  editor/             controls.js · editor-state.js (undo/redo) · panels.js · editor.js
lib/                  shared backend logic: auth.js · validate.js · default-data.js
                      vercel.js (req/res adapter) · store-vercel.js (Vercel Blob)
netlify/
  functions/          auth-login · auth-logout · auth-session · portfolio-get · portfolio-save
  lib/                store-blobs.js (Netlify Blobs)
api/                  same five endpoints in Vercel Serverless Function format
netlify.toml          build, /api/* redirects, security headers
vercel.json           security headers (functions are zero-config)
```

## Editor test checklist

1. Visitor opens site → portfolio renders, no editor button.
2. Visitor tries `?edit` / `#admin` → sees login form, not the editor.
3. Wrong password → generic "Incorrect password", no session cookie.
4. Correct password → HttpOnly cookie set, editor opens.
5. Edit hero title → preview updates instantly without reload.
6. Publish → reload shows the change publicly (Blobs persisted).
7. Log out → cookie cleared, editor closed, FAB hidden again.
