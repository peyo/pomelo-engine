import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCachedQuotes } from './pricing.js';

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

// Read a job heartbeat. "running" is only trusted if the heartbeat is recent —
// a crashed job leaves a stale running:true that we ignore.
function readStatus(file) {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'));
    const fresh = Date.now() - (s.updatedAt ?? 0) < 20_000;
    return { ...s, running: Boolean(s.running && fresh) };
  } catch {
    return { running: false };
  }
}

export const ingestStatus = () => readStatus('ingest-status.json');
export const priceStatus = () => readStatus('price-status.json');

export function getCompany(ticker) {
  return loadUniverse()[ticker.toUpperCase()] ?? null;
}

// Pre-screen the universe on EDGAR metrics, plus an optional market-cap filter
// (using prices populated by the batch price job). Returns matching company
// records capped to `limit` (highest ROIC first).
export function screenUniverse(filters = {}, limit = 40) {
  const u = loadUniverse();
  const { minROIC, maxDebtToEbitda, minGrowth, minMktCap, maxMktCap } = filters;
  const useMktCap = minMktCap != null || maxMktCap != null;
  const quotes = useMktCap ? loadCachedQuotes() : null;

  let matches = Object.values(u).filter(c => {
    const m = c.metrics;
    if (minROIC != null && (m.roic == null || m.roic < minROIC)) return false;
    if (maxDebtToEbitda != null && (m.debtToEbitda == null || m.debtToEbitda > maxDebtToEbitda)) return false;
    if (minGrowth != null && (m.revenueGrowth == null || m.revenueGrowth < minGrowth)) return false;
    if (useMktCap) {
      const mc = quotes[c.ticker]?.mktCap;
      // A size filter excludes companies whose price isn't cached yet — we
      // can't verify their size, so they don't qualify.
      if (mc == null) return false;
      if (minMktCap != null && mc < minMktCap) return false;
      if (maxMktCap != null && mc > maxMktCap) return false;
    }
    return true;
  });

  // Rank by ROIC as a quality proxy before the price-based enrichment step
  matches.sort((a, b) => (b.metrics.roic ?? -Infinity) - (a.metrics.roic ?? -Infinity));
  return matches.slice(0, limit);
}
