// Offline ingest: build data/universe.json with price-independent metrics
// for the full SEC domestic-filer universe.
//
// Usage:
//   node scripts/ingest.js              # full universe (~10k filers, ~20 min)
//   node scripts/ingest.js --limit 300  # first 300 filers (testing)
//   node scripts/ingest.js --resume     # skip tickers already in universe.json

import '../services/env.js';
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { getFundamentals } from '../services/edgarFacts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'data', 'universe.json');
const STATUS = path.join(__dirname, '..', 'data', 'ingest-status.json');
const H = { 'User-Agent': 'StockScout research@stockscout.dev' };

// Heartbeat file the server reads to report build progress to the UI.
function writeStatus(s) {
  try {
    fs.writeFileSync(STATUS, JSON.stringify({ ...s, updatedAt: Date.now() }));
  } catch {}
}

// SEC asks for <= 10 requests/sec. With a pool of CONCURRENCY workers each
// pausing PER_WORKER_DELAY between requests, aggregate stays under the ceiling.
const CONCURRENCY = 6;
const PER_WORKER_DELAY = 120;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const resume = args.includes('--resume');

// Price-independent metrics we can compute from EDGAR alone.
function edgarOnlyMetrics(f) {
  const m = { roic: null, revenueGrowth: null, debtToEbitda: null, ebitda: null };

  if (f.operatingIncome != null && f.dna != null) {
    m.ebitda = f.operatingIncome + f.dna;
  }
  // ROIC ≈ NOPAT / capital employed (debt + equity). Cash is NOT subtracted
  // (collapses the denominator for cash-rich firms); negative book equity makes
  // book ROIC undefined → left null.
  if (f.operatingIncome != null && f.equity > 0) {
    const nopat = f.operatingIncome * 0.79;
    const invested = f.totalDebt + f.equity;
    if (invested > 0) m.roic = round((nopat / invested) * 100, 1);
  }
  if (f.revenue && f.priorRevenue && f.priorRevenue > 0) {
    m.revenueGrowth = round((f.revenue - f.priorRevenue) / f.priorRevenue, 2);
  }
  if (m.ebitda && m.ebitda > 0) {
    m.debtToEbitda = round(f.totalDebt / m.ebitda, 1);
  }
  return m;
}

function round(n, dp = 1) {
  if (n == null || !isFinite(n)) return null;
  const p = 10 ** dp;
  return Math.round(n * p) / p;
}

async function main() {
  const { data: tickerMap } = await axios.get(
    'https://www.sec.gov/files/company_tickers.json', { headers: H }
  );
  let filers = Object.values(tickerMap);

  // Existing data for resume
  let universe = {};
  if (resume && fs.existsSync(OUT)) {
    universe = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    console.log(`Resuming — ${Object.keys(universe).length} already ingested`);
  }

  filers = filers.slice(0, limit === Infinity ? filers.length : limit);
  console.log(`Ingesting ${filers.length} filers (concurrency ${CONCURRENCY})…`);

  let done = 0, ok = 0, skipped = 0, failed = 0;
  const t0 = Date.now();
  const queue = [...filers];

  writeStatus({ running: true, done: 0, total: filers.length, ok: 0, failed: 0, startedAt: t0 });

  async function worker() {
    while (queue.length) {
      const filer = queue.shift();
      const ticker = filer.ticker.toUpperCase();
      done++;

      if (resume && universe[ticker]) { skipped++; continue; }

      try {
        const f = await getFundamentals(filer.cik_str);
        // Require core domestic-filer signals; foreign/empty filers fall out here
        if (f.netIncome == null || f.operatingIncome == null) {
          failed++;
        } else {
          universe[ticker] = {
            ticker,
            name: filer.title,
            cik: String(filer.cik_str).padStart(10, '0'),
            fiscalYear: f.fiscalYear,
            fundamentals: {
              revenue: f.revenue, priorRevenue: f.priorRevenue,
              netIncome: f.netIncome, priorNetIncome: f.priorNetIncome,
              operatingIncome: f.operatingIncome, dna: f.dna, ocf: f.ocf, capex: f.capex,
              cash: f.cash, totalDebt: f.totalDebt, equity: f.equity,
            },
            metrics: edgarOnlyMetrics(f),
          };
          ok++;
        }
      } catch {
        failed++;
      }

      if (done % 200 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        const eta = Math.round((filers.length - done) / rate);
        console.log(`  ${done}/${filers.length}  ok=${ok} skip=${skipped} fail=${failed}  ~${rate.toFixed(1)}/s  ETA ${eta}s`);
        fs.writeFileSync(OUT, JSON.stringify(universe)); // checkpoint
        writeStatus({ running: true, done, total: filers.length, ok, failed, startedAt: t0, etaSec: eta });
      }

      await sleep(PER_WORKER_DELAY);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(OUT, JSON.stringify(universe));
  writeStatus({ running: false, done: filers.length, total: filers.length, ok, failed, startedAt: t0, finishedAt: Date.now() });
  console.log(`\nDone. ${ok} companies with metrics → ${OUT}`);
  console.log(`(${failed} excluded as foreign/incomplete, ${skipped} skipped)`);
}

main().catch(e => { console.error(e); process.exit(1); });
