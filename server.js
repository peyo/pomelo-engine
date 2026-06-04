import './services/env.js';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import screenRouter from './routes/screen.js';
import qualifyRouter from './routes/qualify.js';
import { universeStats, ingestStatus, priceStatus } from './services/universe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUOTES_PATH = path.join(__dirname, 'data', 'quotes.json');
const UNIVERSE_PATH = path.join(__dirname, 'data', 'universe.json');
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

function fileAgeMs(filePath) {
  try { return Date.now() - fs.statSync(filePath).mtimeMs; }
  catch { return Infinity; }
}

function runJobInBackground(script, label) {
  console.log(`[auto] ${label} is stale — running in background...`);
  const child = spawn(process.execPath, [script], {
    detached: true, stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

// On startup: auto-refresh stale data in the background so prices stay current.
// Price job runs if quotes.json is older than 24 hours.
// Ingest runs if universe.json is older than 7 days.
function scheduleAutoRefresh() {
  const priceAge = fileAgeMs(QUOTES_PATH);
  const universeAge = fileAgeMs(UNIVERSE_PATH);

  if (priceAge > STALE_MS) {
    runJobInBackground(
      path.join(__dirname, 'scripts', 'price.js'),
      `Price cache (${Math.round(priceAge / 3600000)}h old)`
    );
  } else {
    console.log(`[auto] Prices are fresh (${Math.round(priceAge / 3600000)}h old) — skipping price job`);
  }

  if (universeAge > 7 * STALE_MS) {
    runJobInBackground(
      path.join(__dirname, 'scripts', 'ingest.js'),
      `Universe (${Math.round(universeAge / 86400000)}d old)`
    );
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/screen', screenRouter);
app.use('/api/qualify', qualifyRouter);

app.get('/api/status', (_req, res) => {
  res.json({ universe: universeStats(), ingest: ingestStatus(), price: priceStatus() });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  scheduleAutoRefresh();
});
