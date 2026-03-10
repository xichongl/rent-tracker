# Cloudflare Workers + GitHub Actions Setup

This setup keeps your existing Render deployment intact and adds a parallel static deployment path on Cloudflare Workers:

- GitHub Action `scrape-data.yml` updates `data/*.json` on a schedule
- GitHub Action `deploy-cloudflare-pages.yml` builds and deploys frontend to Cloudflare Worker static assets
- Frontend automatically falls back to static `/data/*.json` when API is unavailable

## 1) Confirm Cloudflare Worker target

1. In Cloudflare dashboard, open **Workers & Pages**.
2. Ensure your Worker exists (example worker URL: `rent-tracker.<subdomain>.workers.dev`).
3. Worker name should match `rent-tracker` (or set secret override below).

## 2) Add GitHub repository secrets

In GitHub repo → **Settings** → **Secrets and variables** → **Actions**, add:

- `CLOUDFLARE_API_TOKEN`
  - Token with Workers deploy permissions
- `CLOUDFLARE_ACCOUNT_ID`
  - Cloudflare account ID
- `CLOUDFLARE_WORKER_NAME` (optional)
  - Defaults to `rent-tracker` if omitted

## 3) Enable workflows

Workflows added:

- `.github/workflows/scrape-data.yml`
  - Runs daily (`09:15 UTC`) and on manual dispatch
  - Executes `server/run-scrape-once.js`
  - Commits data changes to `data/*.json`

- `.github/workflows/deploy-cloudflare-pages.yml`
  - Runs on push to `main` for frontend/data changes and manual dispatch
  - Builds app and deploys to Cloudflare Worker with `wrangler deploy`

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
3. Trigger **Deploy to Cloudflare Worker** workflow manually.
4. Open Worker URL and verify trend data loads.
