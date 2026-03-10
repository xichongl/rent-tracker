# Cloudflare Pages + GitHub Actions Setup

This setup keeps your existing Render deployment intact and adds a parallel static deployment path:

- GitHub Action `scrape-data.yml` updates `data/*.json` on a schedule
- GitHub Action `deploy-cloudflare-pages.yml` builds and deploys frontend to Cloudflare Pages
- Frontend automatically falls back to static `/data/*.json` when API is unavailable

## 1) Create Cloudflare Pages project

1. In Cloudflare dashboard, open **Workers & Pages**.
2. Create a Pages project (or use existing).
3. Record the project name (for example: `rent-tracker`).

## 2) Add GitHub repository secrets

In GitHub repo → **Settings** → **Secrets and variables** → **Actions**, add:

- `CLOUDFLARE_API_TOKEN`
  - Token with Pages edit/deploy permissions
- `CLOUDFLARE_ACCOUNT_ID`
  - Cloudflare account ID
- `CLOUDFLARE_PAGES_PROJECT_NAME`
  - Your Pages project name

## 3) Enable workflows

Workflows added:

- `.github/workflows/scrape-data.yml`
  - Runs daily (`09:15 UTC`) and on manual dispatch
  - Executes `server/run-scrape-once.js`
  - Commits data changes to `data/*.json`

- `.github/workflows/deploy-cloudflare-pages.yml`
  - Runs on push to `main` for frontend/data changes and manual dispatch
  - Builds app and deploys `dist/` to Cloudflare Pages

## 4) Important behavior

- `npm run build` now runs `prebuild` script to copy data snapshots into `public/data`:
  - `apartments-db.json`
  - `archived-apartments.json`
  - `latest-prices.json`

This allows Cloudflare static hosting to serve trend data even without backend API.

## 5) Keep Render while testing

You can keep Render as primary while validating Cloudflare.
Once Cloudflare looks good, you can switch DNS.

## 6) Manual test sequence

1. Trigger **Scrape Apartment Data** workflow manually.
2. Confirm a commit was made with updated `data/*.json`.
3. Trigger **Deploy to Cloudflare Pages** workflow manually.
4. Open Cloudflare Pages URL and verify trend data loads.
