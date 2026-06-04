# Pomelo

An AI-powered stock discovery engine. It screens the full universe of US public
companies on fundamentals computed from **SEC EDGAR** filings, enriches the
survivors with **live pricing**, scores them quantitatively, and uses **Claude**
to score business quality from each company's 10-K risk factors.

## How it works

```
SEC EDGAR companyfacts          (offline ingest → data/universe.json)
        │  compute ROIC, earnings growth, debt/EBITDA for ~1,400 filers
        ▼
EDGAR pre-screen                (filter universe, no price needed)
        │  survivors
        ▼
FMP /profile  (live price + market cap, free tier)
        │  compute P/E, EV/EBITDA, PEG, FCF yield
        ▼
Quantitative score  (5 metrics × 2 pts = 10)
        │
        ▼
Claude reads 10-K risk factors  → qualitative score (3 dims × 2 pts = 6)
        ▼
Ranked dashboard  (out of 16)
```

### Why this architecture

FMP's free tier (post-Aug 2025) only exposes the company `profile` endpoint —
ratios, key-metrics, and the market screener are all paywalled. So every
fundamental metric is computed from SEC EDGAR's free XBRL `companyfacts` data,
and FMP is used purely for live price and market cap. Foreign filers (20-F /
IFRS, e.g. TSM, ASML) are excluded — US domestic 10-K filers only.

## Setup

```bash
# 1. Install dependencies (root + client)
npm install
cd client && npm install && cd ..

# 2. Build the company universe from SEC EDGAR (~25 min, one-time)
npm run ingest          # writes data/universe.json (~1,400 companies)
#   npm run ingest:resume   to continue an interrupted run

# 3. Run frontend + backend together
npm run dev             # client on :5173, API on :3001
```

The dashboard works with whatever is in `data/universe.json`, so you can start
the app before a full ingest finishes.

### API keys (BYOK)

Pomelo is **bring your own key**. There are no server-side API keys — open
the in-app **⚙ Keys** panel and paste your own:

- **Finnhub** (live pricing, free 60 req/min) — https://finnhub.io/register
- **Anthropic** (Claude deep-dives) — https://console.anthropic.com
- **FMP** (optional pricing fallback) — financialmodelingprep.com

Keys are stored only in your browser's `localStorage` and sent as request
headers (`x-finnhub-key`, `x-anthropic-key`, `x-fmp-key`). The server uses them
per-request to call the providers on your behalf and never logs or stores them.
EDGAR fundamentals (ROIC, growth, debt) work with no keys at all.

## Scoring

| Layer | Metric | Source |
|-------|--------|--------|
| Quant | P/E (ttm) | market cap ÷ EDGAR net income |
| Quant | EV/EBITDA | EDGAR operating income + D&A |
| Quant | PEG | P/E ÷ YoY earnings growth |
| Quant | ROIC | NOPAT ÷ invested capital (EDGAR) |
| Quant | FCF yield | (OCF − capex) ÷ market cap |
| Qual  | Business model | Claude on 10-K risk factors |
| Qual  | Management quality | Claude on 10-K risk factors |
| Qual  | Industry structure | Claude on 10-K risk factors |

Each scores 0/1/2 for a maximum of 16. ROIC is clamped at 150% to avoid
denominator artifacts from companies with negative book equity.

## Deploying to Vercel

```bash
vercel
```

No server env vars are needed (BYOK — visitors supply their own keys in the app).
`data/universe.json` is committed and ships with the deployment (the ingest job
is too long-running for a serverless function — refresh it locally and redeploy,
or run it on a schedule).

## Project structure

```
server.js              Express entry point
routes/
  screen.js            GET /api/screen      — universe screen + live enrich + score
  qualify.js           GET /api/qualify/:t  — full deep-dive incl. Claude
services/
  env.js               dotenv loader (override-safe; only PORT used)
  keys.js              per-request BYOK key extraction from headers
  universe.js          loads/screens data/universe.json
  edgarFacts.js        companyfacts → fundamentals → computed metrics
  edgar.js             latest 10-K lookup + risk-factor extraction
  pricing.js           live price/market cap (Finnhub or FMP, cached)
  claude.js            qualitative scoring via Claude
  scorer.js            0/1/2 metric scoring + totals
scripts/
  ingest.js            builds data/universe.json from SEC EDGAR
client/                React + Vite + Tailwind dashboard
```

Not financial advice — a research starting point.
```
