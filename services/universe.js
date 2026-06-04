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
    if (minGrowth != null && (m.earningsGrowth == null || m.earningsGrowth < minGrowth)) return false;
    return true;
  });

  // Rank by ROIC as a quality proxy before the price-based enrichment step
  matches.sort((a, b) => (b.metrics.roic ?? -Infinity) - (a.metrics.roic ?? -Infinity));
  return matches.slice(0, limit);
}
