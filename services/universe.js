import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNIVERSE_PATH = path.join(__dirname, '..', 'data', 'universe.json');

let cache = null;
let cacheMtime = 0;

// Load universe.json, reloading if the file changed on disk.
export function loadUniverse() {
  if (!fs.existsSync(UNIVERSE_PATH)) return {};
  const mtime = fs.statSync(UNIVERSE_PATH).mtimeMs;
  if (!cache || mtime !== cacheMtime) {
    cache = JSON.parse(fs.readFileSync(UNIVERSE_PATH, 'utf8'));
    cacheMtime = mtime;
  }
  return cache;
}

export function universeStats() {
  const u = loadUniverse();
  return { count: Object.keys(u).length, exists: fs.existsSync(UNIVERSE_PATH) };
}

const STATUS_PATH = path.join(__dirname, '..', 'data', 'ingest-status.json');

// Read the ingest heartbeat. "running" is only trusted if the heartbeat is
// recent — a crashed ingest leaves a stale running:true that we ignore.
export function ingestStatus() {
  try {
    const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
    const fresh = Date.now() - (s.updatedAt ?? 0) < 20_000;
    return { ...s, running: Boolean(s.running && fresh) };
  } catch {
    return { running: false };
  }
}

export function getCompany(ticker) {
  return loadUniverse()[ticker.toUpperCase()] ?? null;
}

// Pre-screen the universe on price-independent EDGAR metrics.
// Returns matching company records, capped to `limit` (highest ROIC first).
export function screenUniverse(filters = {}, limit = 40) {
  const u = loadUniverse();
  const { minROIC, maxDebtToEbitda, minGrowth } = filters;

  let matches = Object.values(u).filter(c => {
    const m = c.metrics;
    if (minROIC != null && (m.roic == null || m.roic < minROIC)) return false;
    if (maxDebtToEbitda != null && (m.debtToEbitda == null || m.debtToEbitda > maxDebtToEbitda)) return false;
    if (minGrowth != null && (m.revenueGrowth == null || m.revenueGrowth < minGrowth)) return false;
    return true;
  });

  // Rank by ROIC as a quality proxy before the price-based enrichment step
  matches.sort((a, b) => (b.metrics.roic ?? -Infinity) - (a.metrics.roic ?? -Infinity));
  return matches.slice(0, limit);
}
