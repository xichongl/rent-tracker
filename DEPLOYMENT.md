# GitHub & Vercel Deployment Guide

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click the "+" icon in the top right and select "New repository"
3. Name it `rent-tracker`
4. Add a description: "Real-time apartment price tracker for Boston West End"
5. Choose "Public" or "Private"
6. **Do NOT** initialize with README (we already have one)
7. Click "Create repository"

## Step 2: Push to GitHub

After creating the repository, follow the instructions GitHub provides. In your terminal:

```bash
cd /Users/xichongliu/Downloads/rent-tracker

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/rent-tracker.git

# Rename branch to main (optional but recommended)
git branch -M main

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Deploy Frontend to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Deploy from project directory**:
```bash
cd /Users/xichongliu/Downloads/rent-tracker
vercel
```

3. **Follow the prompts**:
   - Link to GitHub account
   - Select your GitHub repository
   - Accept default settings
   - Wait for deployment to complete

### Option B: Using Vercel Web Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select "Import Git Repository"
4. Search for and select your `rent-tracker` repository
5. Click "Import"
6. In the Configure Project screen:
   - **Framework**: Vite (should auto-detect)
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
7. Click "Deploy"

## Step 4: Deploy Backend

### Important: Puppeteer Limitations

Puppeteer (used for web scraping) has significant resource requirements and may not work well on Vercel's free tier. You have several options:

### Option 1: Deploy Backend to Railway (Recommended for Free Tier)

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway with GitHub
5. Select your `rent-tracker` repository
6. Railway will auto-detect the Node.js backend
7. Configure environment:
   - Root Directory: `server`
   - Start Command: `node index.js`
8. Deploy!

Your backend will be available at a Railway-provided URL.

### Option 2: Deploy to Heroku

1. Create a [Heroku](https://www.heroku.com) account
2. Create a new app
3. Connect to GitHub repository
4. Set buildpack to Node.js
5. In Settings, add:
   - **Buildpacks**: Add `https://github.com/jontewks/puppeteer-heroku-buildpack`
6. Deploy!

### Option 3: Use Vercel Serverless (Advanced)

This requires additional configuration to work with Puppeteer. See Vercel's documentation on adding Puppeteer support.

## Step 5: Update Frontend API URL

After deploying your backend, update the API URL in your frontend:

In `src/App.jsx`, change:
```javascript
const API_BASE_URL = 'http://localhost:5174';
```

To:
```javascript
const API_BASE_URL = 'https://your-backend-url.railway.app'; // or your Heroku/Vercel URL
```

Then push the changes:
```bash
git add src/App.jsx
git commit -m "Update API URL for production"
git push
```

Vercel will automatically redeploy when you push to GitHub.

## Step 6: Configure Backend Environment

If deploying to Railway or Heroku:

1. Set environment variables in your deployment platform's dashboard
2. Add any required variables (none currently required, but good practice)

## Testing Deployed App

1. Visit your Vercel frontend URL: `https://your-project.vercel.app`
2. The app should load and scrape prices from the backend
3. Check browser console (F12) for any API errors
4. Verify prices are displaying correctly

## Troubleshooting

### Frontend shows "Could not connect to scraping server"
- Check that your backend is running
- Verify the API URL in `src/App.jsx` is correct
- Check browser console for CORS errors

### Backend not scraping prices
- Verify Puppeteer has permission to run on your platform
- Check server logs for errors
- Ensure all Node packages are installed: `cd server && npm install`

### Deploy to Vercel failing
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json` are listed
- Try building locally first: `npm run build`

## Continuous Deployment

Once configured, every push to your GitHub `main` branch will:
1. Automatically trigger a Vercel build for the frontend
2. If using GitHub integration on Railway/Heroku, also redeploy the backend

## Future: Database Integration

For persistent data storage, consider adding a database:
- **PostgreSQL** (Railway, Heroku)
- **MongoDB** (MongoDB Atlas)
- **Firebase** (Google)

This would replace the file-based `data/` storage for production use.
