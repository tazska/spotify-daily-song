const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');
const TODAY_PATH = path.join(__dirname, '..', 'data', 'today.json');
const SEARCH_QUERY = process.env.SPOTIFY_SEARCH_QUERY || 'year:2026';

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read history file, starting fresh:', e.message);
  }
  return [];
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function saveToday(song) {
  fs.writeFileSync(TODAY_PATH, JSON.stringify(song, null, 2));
}

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchTracks(token) {
  const year = new Date().getFullYear();
  const query = SEARCH_QUERY.replace('2026', String(year));

  const params = new URLSearchParams({
    q: query,
    type: 'track',
    market: 'US',
    limit: '20',
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify search request failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  return data.tracks.items.map((track) => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    image: track.album.images[0]?.url || '',
    url: track.external_urls.spotify,
    preview_url: track.preview_url,
  }));
}

function pickSong(tracks, history) {
  const usedIds = new Set(history.map((h) => h.id));
  let candidates = tracks.filter((t) => !usedIds.has(t.id));

  if (candidates.length === 0) {
    console.log('All tracks have been used. Resetting history.');
    candidates = tracks;
  }

  const dayOfYear = getDayOfYear();
  const index = dayOfYear % candidates.length;
  return candidates[index];
}

async function main() {
  console.log('Fetching access token...');
  const token = await getAccessToken();

  console.log('Searching for tracks...');
  const tracks = await searchTracks(token);
  console.log(`Got ${tracks.length} tracks.`);

  const history = loadHistory();
  const song = pickSong(tracks, history);

  console.log(`Today's song: ${song.name} by ${song.artists}`);

  const today = new Date().toISOString().split('T')[0];
  saveToday({ ...song, date: today });

  history.push({ id: song.id, date: today });
  saveHistory(history);

  console.log('Done. Data written to data/today.json and data/history.json');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
