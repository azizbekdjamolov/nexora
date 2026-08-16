# NEXORA — Deploy to GitHub + Render

## 1. Push to GitHub

1. Sign in to GitHub CLI (opens a browser):
   ```
   gh auth login
   ```
2. Create the repo and push (run from the project root):
   ```
   git add -A
   git commit -m "NEXORA: full platform with diagnostics, support & admin panel"
   git branch -M main
   gh repo create nexora --public --source . --push
   ```
   (or `--private` if you don't want it public)

   > `.gitignore` already excludes `.env`, `.env.local`, `*.db`, `node_modules`, `.next`, `dist` — no secrets are pushed.

## 2. Deploy to Render (blueprint)

1. Open https://render.com → **New +** → **Blueprint** → select the `nexora` repo.
2. Render creates 3 services automatically from `render.yaml`:
   - `nexora-api` — backend (port 4000, SQLite on a 1 GB disk)
   - `nexora-web` — website + Mini App (port 3000)
   - `nexora-bot` — Telegram bot worker (long polling)
3. In each service → **Environment**, fill the `sync: false` (empty) variables:

   | Service | Variable | Value |
   |---|---|---|
   | api | `AUTH_SECRET` | long random string (see below) |
   | api | `CORS_ORIGINS` | `https://<your-web-service>.onrender.com` |
   | api | `WEB_URL` | `https://<your-web-service>.onrender.com` |
   | api | `BOT_SERVICE_TOKEN` | long random string (must be SAME on all 3) |
   | api | `TELEGRAM_BOT_TOKEN` | token from @BotFather |
   | api | `ADMIN_TELEGRAM_IDS` | `6872035033` (Aziz) — add more, comma-separated |
   | api | `GEMINI_API_KEY` | your Google AI Studio key |
   | web | `API_URL` | `https://<your-api-service>.onrender.com` |
   | web | `WEB_URL` | `https://<your-web-service>.onrender.com` |
   | bot | `API_URL` | `https://<your-api-service>.onrender.com` |
   | bot | `BOT_SERVICE_TOKEN` | same as api |
   | bot | `TELEGRAM_BOT_TOKEN` | same as api |
   | bot | `TELEGRAM_MINI_APP_URL` | `https://<your-web-service>.onrender.com/mini` |
   | bot | `ADMIN_TELEGRAM_IDS` | same as api |

   > Generate secrets with: `openssl rand -hex 32`
   > Do NOT set `NEXT_PUBLIC_API_URL` on the web service — the browser uses the same-origin `/api/*` path and Next.js rewrites it to `API_URL` (single domain = no CORS, cookies work).

4. **Manual Deploy** → **Deploy latest commit** (all 3 services).
5. `nexora-api` automatically runs `prisma db push` on start, so the database is created on the first boot.

## 3. Telegram Mini App URL

- Mini App: `https://<your-web-service>.onrender.com/mini`
- In @BotFather: `/setmenubutton` → select your bot → "Menu" → web app → paste the Mini App URL.
- Optionally `/setdomain` for the web app URL, and set a short bot description.

## 4. Verify

- Website: `https://<your-web-service>.onrender.com`
- API health: `https://<your-api-service>.onrender.com/api/health`
- Open the bot in Telegram → press the Menu button → Mini App opens.
- Send the bot "Adminga murojaat" → your message appears in `https://<your-web-service>.onrender.com/admin` → reply there → answer is delivered back to Telegram.

## Notes

- SQLite file lives on the api service disk; keep the disk mounted to avoid losing data on redeploys.
- The bot uses long polling (no webhook) — only one bot worker instance should run.
- `npm run dev` locally still works unchanged after the push.
