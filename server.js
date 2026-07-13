const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/song', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'today.json');
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'No song data available yet. Wait for the daily GitHub Action to run.' });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load song data: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
