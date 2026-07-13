const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');
const TODAY_PATH = path.join(__dirname, '..', 'data', 'today.json');
const PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID || '37i9dQZEVXbMDoHDwVN2tF';

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

async function fetchPlaylistTracks(token) {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=50`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify playlist request failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  return data.items.map((item) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      image: track.album.images[0]?.url || '',
      url: track.external_urls.spotify,
      preview_url: track.preview_url,
    };
  });
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

  console.log('Fetching playlist tracks...');
  const tracks = await fetchPlaylistTracks(token);
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
