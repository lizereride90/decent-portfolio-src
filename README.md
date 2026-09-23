# Portfolio + Visual Editor

A personal portfolio site with a secure, Framer-style visual editor. The owner edits content directly from the live site — no code changes. Deployable to **Vercel** as-is.

## How it works

- **Public site** (`index.html`): static HTML/CSS/JS. Renders portfolio data, no secrets anywhere.
- **Editor** (`js/editor/`): opens only after a server-side session check. Live preview, undo/redo, mobile/desktop preview, publish.
- **Backend** (`api/`): login/logout/session/portfolio-get/portfolio-save as Vercel Serverless Functions. Auth enforced server-side on every write.

## Security model

- The admin password lives **only** in the `ADMIN_PASSWORD` environment variable. It never appears in frontend code or API responses.
- Login sets an `HttpOnly`, `SameSite=Lax`, `Secure`-in-production session cookie holding an HMAC-signed token (signed with `SESSION_SECRET`, 12h expiry).
- `portfolio-save` and `auth-logout` require the session cookie **and** pass a CSRF check (same-origin `Origin`/`Referer` + `X-Requested-With` custom header).
- Login is rate-limited (8 attempts / 10 min per IP) with a small delay on failure.
- All saved content is validated and sanitized server-side (`lib/validate.js`): field whitelist, length caps, URL allowlist (`http/https`, `mailto/tel`, `#`/`/` relative, `data:image`), 1.5MB payload cap.
- The editor button (`#adminFab`) is `hidden` unless `/api/auth-session` confirms a session. Entry points (footer dot ×5, `Ctrl+Shift+E`, `?edit`, `#admin`) open a login form — never the editor itself.
- `vercel.json` adds `nosniff`, `DENY` framing, and `no-store` on API responses.

## Setup

1. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `ADMIN_PASSWORD` — a long random password only you know
   - `SESSION_SECRET` — a different random string. Generate: `openssl rand -hex 32`
2. **Storage** (Project → Storage → Create Database → **Blob** → connect to the project). This auto-injects `BLOB_READ_WRITE_TOKEN`, which the save endpoint needs to persist content. Without it, the editor warns that saves aren't persisted.

## Deploy — Vercel

1. Push this folder to a repo.
2. Vercel → Add New → Project → Import the repo. Framework preset: **Other** (static). Defaults work — `api/` functions are picked up automatically.
3. Add the env vars above, connect a Blob store, deploy.
4. Open the live URL → sign in via the footer © ×5 → start editing.

## Local development

```bash
python3 dev-server.py          # serves the site + API at http://127.0.0.1:8123/
```

No dependencies needed (stdlib only). The dev server mirrors the `/api` endpoints (same session-cookie format, same auth/CSRF/validation rules) and persists published content to `.dev-portfolio.json`. Dev admin password is `admin123` (override with `ADMIN_PASSWORD` / `SESSION_SECRET` env vars).

To reuse for your own portfolio: open the live site, sign in, and edit everything in the visual editor — or change `js/config-default.js` (and keep `lib/default-data.js` in sync) before first deploy.

## Project structure

```
index.html            public portfolio + hidden login + editor shell
css/                  base.css (tokens/login/fab) · portfolio.css · editor.css
js/
  config-default.js   centralized default portfolio data
  api.js              fetch layer, /api/* (no secrets)
  theme.js            CSS-variable theme application
  render.js           data → DOM
  main.js             boot, discreet admin entry, login modal
  editor/             controls.js · editor-state.js (undo/redo) · panels.js · editor.js
  icons.js            shared Lucide icon set (see assets/icons/)
lib/                  shared backend logic: auth.js (sessions/cookies/CSRF)
                      validate.js · default-data.js · vercel.js (req/res adapter)
                      store-vercel.js (Vercel Blob persistence)
api/                  auth-login · auth-logout · auth-session · portfolio-get · portfolio-save
vercel.json           security headers (functions are zero-config)
dev-server.py         local dev server (stdlib only, mirrors /api)
```

## Editor test checklist

1. Visitor opens site → portfolio renders, no editor button.
2. Visitor tries `?edit` / `#admin` → sees login form, not the editor.
3. Wrong password → generic "Incorrect password", no session cookie.
4. Correct password → HttpOnly cookie set, editor opens.
5. Edit hero title → preview updates instantly without reload.
6. Publish → toast says "Published · stored (vercel-blob)"; reload shows the change publicly.
7. Log out → cookie cleared, editor closed, FAB hidden again.
