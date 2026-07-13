# Spotify Daily Song

A small web app that shows a different song each day, pulled from Spotify's **Top 50 - Global** playlist. A GitHub Action runs daily at 13:00 UTC (8:00 AM Colombia time), picks the song, and commits the result to the repo. The repo is connected to Render with auto-deploy, so every commit redeploys the site automatically.

## Setup

### 1. Create a Spotify App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in any name/description (e.g. "Daily Song")
4. Once created, copy your **Client ID** and **Client Secret**

### 2. Add GitHub Secrets

1. Go to your repo on GitHub
2. Navigate to **Settings > Secrets and variables > Actions**
3. Add two repository secrets:
   - `SPOTIFY_CLIENT_ID` — your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET` — your Spotify Client Secret

### 3. Connect to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New > Web Service**
3. Connect your GitHub repo
4. Configure the service:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Auto Deploy:** Enabled
5. Click **Create Web Service**

### 4. Trigger the First Run

1. Go to your repo on GitHub
2. Navigate to **Actions > Daily Spotify Song**
3. Click **Run workflow** to manually trigger the first song fetch
4. Once the workflow completes and pushes, Render will auto-deploy

## How It Works

- The GitHub Action fetches the Top 50 - Global playlist tracks from Spotify
- It deterministically picks a song based on the day of the year
- Previously used songs are tracked in `data/history.json` to avoid repeats
- Once all 50 songs have been shown, history resets and the cycle starts over
- The chosen song is written to `data/today.json` and committed
- Render detects the new commit and redeploys the site

## Development

```bash
npm install
npm start        # starts Express on port 3000
npm run fetch-song  # manually fetch a song (requires env vars)
```
