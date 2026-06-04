// Batch price job: fetch market cap for every company in data/universe.json
// into the shared quote cache (data/quotes.json), so market cap can be used as
// a true universe-level pre-screen filter.
//
// Build-time task (like the EDGAR ingest) — uses a key from .env, NOT the
// request-time BYOK keys. Finnhub's free tier is 60/min, so the full ~3,000
// company universe takes ~50 min. Re-run periodically to refresh prices.
//
// Usage:
//   node scripts/price.js            # price the whole universe
//   node scripts/price.js --limit 200

import '../services/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUniverse } from '../services/universe.js';
import { getQuote, resolveProvider } from '../services/pricing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS = path.join(__dirname, '..', 'data', 'price-status.json');

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

const key = name => {
  const v = process.env[name] ?? '';
  return v && !v.startsWith('your_') ? v : null;
};
const keys = { finnhub: key('FINNHUB_API_KEY'), fmp: key('FMP_API_KEY') };

function writeStatus(s) {
  try { fs.writeFileSync(STATUS, JSON.stringify({ ...s, updatedAt: Date.now() })); } catch {}
}

async function main() {
  const provider = resolveProvider(keys);
  if (!provider) {
    console.error('No pricing key found. Add FINNHUB_API_KEY (or FMP_API_KEY) to .env');
    process.exit(1);
  }

  const universe = loadUniverse();
  let tickers = Object.keys(universe);
  if (limit !== Infinity) tickers = tickers.slice(0, limit);

  console.log(`Pricing ${tickers.length} companies via ${provider}…`);
  const t0 = Date.now();
  let done = 0, priced = 0, missed = 0;
  writeStatus({ running: true, done: 0, total: tickers.length, priced: 0, startedAt: t0 });

  // getQuote handles caching + the shared rate gate, so a simple sequential
  // loop already self-throttles to the provider's limit.
  const CONCURRENCY = provider === 'finnhub' ? 4 : 2;
  const queue = [...tickers];

  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      const { quote } = await getQuote(t, keys);
      done++;
      if (quote?.mktCap) priced++; else missed++;
      if (done % 100 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        const eta = Math.round((tickers.length - done) / rate);
        console.log(`  ${done}/${tickers.length}  priced=${priced} missed=${missed}  ~${rate.toFixed(1)}/s  ETA ${Math.ceil(eta / 60)}m`);
        writeStatus({ running: true, done, total: tickers.length, priced, startedAt: t0, etaSec: eta });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  writeStatus({ running: false, done: tickers.length, total: tickers.length, priced, finishedAt: Date.now() });
  console.log(`\nDone. ${priced} priced, ${missed} missing.`);
}

main().catch(e => { console.error(e); process.exit(1); });
