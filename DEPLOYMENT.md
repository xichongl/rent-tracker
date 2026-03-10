# Rent Tracker Deployment Guide (`rent-tracker.su.domains`)

This is the simplest reliable path:
- Deploy app to Render (one always-on Node service for frontend + API + scraper scheduler)
- Point `rent-tracker.su.domains` to Render with a CNAME in your domain control panel

---

## 1) One-time repo setup (already done in this repo)

This repo now includes:
- `render.yaml` for Render service blueprint
- `DATA_DIR` support in server code so data can live on persistent disk

Important files:
- `render.yaml`
- `server/index.js`
- `server/database.js`

---

## 2) Deploy on Render (click-by-click)

1. Push your latest code to GitHub.
2. Open Render dashboard → **New** → **Blueprint**.
3. Connect the repository and deploy.

Render will read `render.yaml` and set:
- Build command: `npm install --include=dev && npm --prefix server install && npm --prefix server exec puppeteer browsers install chrome && npm run build`
- Start command: `cd server && NODE_ENV=production npm run start`
- Health check: `/health`

### Render environment vars to confirm

In Render service settings, confirm these exist:
- `ENABLE_DAILY_SCRAPER=true`
- `DAILY_SCRAPE_TIME=09:00`
- `DAILY_SCRAPE_RUN_ON_STARTUP=true`
- `PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer`

`PORT` is injected by Render automatically.

Important: do not set `NODE_ENV=production` as a Render service environment variable for this setup, because Render applies env vars during build too, which can omit devDependencies and break Vite builds (`vite: not found`).

If you created a Render Web Service manually (not Blueprint), set the same Build Command above in the Render UI. This is required so Chrome is installed for Puppeteer.

### Persistent disk (important)

Because you track history in JSON files, add a Render persistent disk:
1. Service → **Disks** → **Add Disk**
2. Mount path: `/var/data`
3. Save + redeploy

With `DATA_DIR=/var/data/rent-tracker`, historical data survives restarts/redeploys.

Free account note:
- Free Render services do not support persistent disk.
- On free tier, leave `DATA_DIR` unset.
- The app will use local `data/` inside the service container (works, but data can reset on redeploy/restart).

---

## 3) Verify app before custom domain

From your Render URL (`https://<service>.onrender.com`), verify:
- `/`
- `/health`
- `/api/scheduler-status`

Expected:
- UI loads
- health returns JSON
- scheduler status is returned (enabled true unless disabled)

---

## 4) Add custom domain on Render first

1. Render service → **Settings** → **Custom Domains**
2. Add: `rent-tracker.su.domains`
3. Render shows the DNS target (usually something like `<service>.onrender.com`)

Keep this page open; you need the exact target value for DNS.

---

## 5) Configure DNS in su.domains control panel

In your `su.domains` DNS zone editor, create/update this record:

- **Type**: `CNAME`
- **Name/Host**: `rent-tracker`
- **Target/Value/Points to**: `<your-render-service>.onrender.com`
- **TTL**: `300` (or default)

Notes:
- Do **not** include `https://` in target value.
- If a conflicting `A`/`CNAME` record already exists for `rent-tracker`, remove it first.
- Some panels use `@` for apex. You are **not** editing apex; host should be `rent-tracker`.

---

## 6) Finalize certificate + propagation

Back in Render custom domains:
- Wait for DNS verification
- Wait for TLS cert to become active

Then test:
- `https://rent-tracker.su.domains`
- `https://rent-tracker.su.domains/health`
- `https://rent-tracker.su.domains/api/scheduler-status`

DNS can take a few minutes to a few hours.

---

## 7) Ongoing operations

- Trigger scrape manually from UI if needed
- Check scheduler status at `/api/scheduler-status`
- Watch Render logs for scrape errors or target-site selector changes

---

## Troubleshooting

- **Build fails with `vite: not found` (status 127)**
  - In Render service settings:
    - Build command must be `npm install --include=dev && npm --prefix server install && npm run build`
    - Remove `NODE_ENV` from service environment variables
  - Redeploy after saving

- **Scrape returns `Could not find Chrome`**
  - In Render service settings:
    - Build command must include browser install:
      `npm install --include=dev && npm --prefix server install && npm --prefix server exec puppeteer browsers install chrome && npm run build`
    - Set env var: `PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer`
  - Redeploy latest commit and re-run `/api/apartments/scrape`

- **Domain not verified in Render**
  - Recheck CNAME host/value in su.domains panel
  - Ensure no duplicate/conflicting records for `rent-tracker`

- **HTTP works on Render URL but not custom domain**
  - DNS not propagated yet, or CNAME points to wrong target

- **Data resets after redeploy**
  - Persistent disk not mounted, or `DATA_DIR` not set to `/var/data/rent-tracker`
  - On free tier this is expected behavior because local container storage is ephemeral

- **Frontend loads, API fails**
  - Confirm app started with server command and `/health` works
