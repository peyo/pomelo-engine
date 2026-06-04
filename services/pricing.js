import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Provider-agnostic live pricing (price + market cap). Pure BYOK: the keys are
// passed in per-request from the caller (never read from server env). Finnhub
// (60 req/min, no daily cap) is preferred over FMP (~250 req/day). A shared
// disk cache conserves everyone's quota and survives rate-limits (stale prices
// are still shown). Prices are identical regardless of whose key fetched them,
// so caching by ticker across users is safe and beneficial.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'data', 'quotes.json');
const FRESH_MS = 60 * 60 * 1000; // 1 hour — within this, never re-call the API

// Resolve which provider to use from the caller's keys.
export function resolveProvider(keys = {}) {
  if (keys.finnhub) return 'finnhub';
  if (keys.fmp) return 'fmp';
  return null;
}
export const hasLivePricing = (keys = {}) => Boolean(resolveProvider(keys));

// ---- cache ----------------------------------------------------------------
let cache = null;
function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); }
  catch { cache = {}; }
  return cache;
}
let saveTimer = null;
function saveCacheDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); } catch {}
  }, 250);
}

// Cache-only reads (no network) — used to apply market-cap pre-screens against
// prices populated by the batch price job.
export function getCachedQuote(ticker) {
  return loadCache()[ticker.toUpperCase()]?.quote ?? null;
}
export function loadCachedQuotes() {
  const store = loadCache();
  const out = {};
  for (const [t, entry] of Object.entries(store)) out[t] = entry.quote;
  return out;
}

// ---- sliding-window rate limiter (Finnhub allows 60 calls / rolling 60s) --
// Calls fire immediately until the window fills, so a typical 40-ticker screen
// completes in ~1-2s instead of being spaced out. Only once ~58 calls have
// happened in the last minute do we wait for the oldest to age out.
const WINDOW_MS = 60_000;
const WINDOW_MAX = 58; // safety margin under Finnhub's 60/min
const callTimes = [];
async function rateGate(provider) {
  if (provider !== 'finnhub') return;
  const now = Date.now();
  while (callTimes.length && now - callTimes[0] > WINDOW_MS) callTimes.shift();
  if (callTimes.length >= WINDOW_MAX) {
    const wait = WINDOW_MS - (now - callTimes[0]) + 10;
    await new Promise(r => setTimeout(r, wait));
  }
  callTimes.push(Date.now());
}

// ---- providers ------------------------------------------------------------
async function fetchFinnhub(ticker, token) {
  const { data } = await axios.get('https://finnhub.io/api/v1/stock/profile2', {
    params: { symbol: ticker, token },
    timeout: 8000,
  });
  if (!data || !data.marketCapitalization) return null;
  const shares = data.shareOutstanding;                 // millions
  const mktCap = data.marketCapitalization * 1_000_000; // reported in millions
  const price = shares ? data.marketCapitalization / shares : null;
  return {
    symbol: ticker,
    companyName: data.name ?? ticker,
    sector: data.finnhubIndustry ?? null,
    price,
    mktCap,
  };
}

async function fetchFmp(ticker, apikey) {
  const { data } = await axios.get('https://financialmodelingprep.com/stable/profile', {
    params: { symbol: ticker, apikey },
    timeout: 8000,
  });
  const p = data?.[0];
  if (!p) return null;
  return { symbol: p.symbol, companyName: p.companyName, sector: p.sector, price: p.price, mktCap: p.marketCap };
}

function fetchOne(ticker, provider, keys) {
  return provider === 'finnhub'
    ? fetchFinnhub(ticker, keys.finnhub)
    : fetchFmp(ticker, keys.fmp);
}

// ---- public API -----------------------------------------------------------
// Returns { quote, source: 'cache'|'live'|'stale'|null, rateLimited }.
export async function getQuote(ticker, keys = {}) {
  const t = ticker.toUpperCase();
  const provider = resolveProvider(keys);
  if (!provider) return { quote: null, source: null, rateLimited: false };

  const store = loadCache();
  const cached = store[t];
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    return { quote: cached.quote, source: 'cache', rateLimited: false };
  }

  try {
    await rateGate(provider);
    const quote = await fetchOne(t, provider, keys);
    if (!quote) {
      return cached
        ? { quote: cached.quote, source: 'stale', rateLimited: false }
        : { quote: null, source: null, rateLimited: false };
    }
    store[t] = { quote, fetchedAt: Date.now() };
    saveCacheDebounced();
    return { quote, source: 'live', rateLimited: false };
  } catch (e) {
    const rateLimited = e.response?.status === 429;
    if (cached) return { quote: cached.quote, source: 'stale', rateLimited };
    return { quote: null, source: null, rateLimited };
  }
}

// Fetch many tickers. Returns { quotes, rateLimited, stale }.
export async function getQuotes(tickers, keys = {}, concurrency = 4) {
  const quotes = {};
  let rateLimited = false;
  let stale = false;
  const queue = [...tickers];

  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      const { quote, source, rateLimited: rl } = await getQuote(t, keys);
      if (rl) rateLimited = true;
      if (source === 'stale') stale = true;
      if (quote) quotes[t] = quote;
      if (rl) {
        // Stop spending calls; serve cache for whatever remains.
        for (const rest of queue.splice(0)) {
          const c = loadCache()[rest.toUpperCase()];
          if (c) { quotes[rest] = c.quote; stale = true; }
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { quotes, rateLimited, stale };
}
