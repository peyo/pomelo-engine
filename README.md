# Pomelo Engine

An AI-powered stock discovery engine for value investors. Screens the full universe of US public companies on fundamentals from **SEC EDGAR**, enriches survivors with **live pricing**, scores them quantitatively across 5 metrics, then uses **Claude** to score business quality using Buffett-style criteria from each company's 10-K risk factors.

## How it works

```
SEC EDGAR companyfacts          (offline ingest → data/universe.json)
        │  ~2,900 US domestic filers with usable fundamentals
        │  compute ROIC, revenue growth, debt/EBITDA
        ▼
EDGAR pre-screen                (filter by quality thresholds, no pricing needed)
        │  survivors enriched from shared price cache (Finnhub)
        ▼
Quantitative score  (5 slots × up to 3 pts = 11 max)
        │
        ▼
Claude reads 10-K risk factors  → Buffett qualitative score (4 dims = 6 max)
        ▼
Ranked dashboard  (total out of 17, normalized % for cross-sector fairness)
```

### Why this architecture

FMP's free tier (post-Aug 2025) only exposes the company `profile` endpoint —
ratios, key-metrics, and the market screener are all paywalled. All fundamental
metrics are computed from SEC EDGAR's free XBRL `companyfacts` data. Finnhub
(60 req/min, no daily cap) is used for live pricing. Foreign filers (20-F / IFRS)
are excluded — US domestic 10-K filers only.

## Setup

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Build the company universe from SEC EDGAR (~25 min, one-time)
npm run ingest          # writes data/universe.json (~2,900 companies)
npm run ingest:resume   # continue an interrupted run

# 3. Fetch market caps for the universe (enables Min size filter)
npm run price           # writes data/quotes.json (~50 min via Finnhub)
# requires FINNHUB_API_KEY in .env

# 4. Run frontend + backend together
npm run dev             # client on :5173, API on :3001
```

## API keys

Pomelo uses a **hybrid key model**:

- **Pricing** (Finnhub) — operator-provided. Add `FINNHUB_API_KEY` to `.env` and run `npm run price` to pre-populate the shared price cache. Users don't need their own pricing key.
- **Claude deep-dives** (Anthropic) — user-provided via the in-app **⚙ Keys** panel. Each user brings their own Anthropic key; it's stored in their browser's `localStorage` and sent per-request. The server never logs or stores it.

```
# .env (server only — never committed)
FINNHUB_API_KEY=your_finnhub_key
PORT=3001
```

## Scoring

### Quantitative (11 pts max)

| Slot | Metric | Source | Max |
|------|--------|--------|-----|
| Cash Flow | FCF Yield (non-fin) / P/B (financial) | (OCF − capex) ÷ market cap | 3 |
| Efficiency | ROIC (non-fin) / ROE (financial) | NOPAT ÷ (debt + equity) | 2 |
| Full Price | EV/EBITDA | (market cap + debt − cash) ÷ EBITDA | 2 |
| Growth Value | PEG Ratio | P/E ÷ YoY revenue growth | 2 |
| Earnings Price | P/E (ttm) | market cap ÷ last FY net income | 2 |

Financial companies (banks, insurers, lenders) use P/B and ROE instead of FCF yield and ROIC — those metrics are meaningless for financial firms. EV/EBITDA is not applicable for financials (slot scores 0). Financial companies max out at 9 quant pts; scores are normalized to % for fair cross-sector ranking.

### Qualitative — Buffett criteria (6 pts max)

| Dimension | Max | What it measures |
|-----------|-----|-----------------|
| Moat | 2 | Durable pricing power — can they raise prices without losing customers? |
| Durability | 2 | Same business in 10 years? Resistant to disruption? |
| Management | 1 | Exceptional capital allocation — standard governance = 0 |
| Simplicity | 1 | Understandable and predictable to a generalist |

Scoring is hyper-conservative by design. The default is 0 — points are only awarded for specific, named evidence of genuine quality. Most companies score 0/6 on qualitative. Run "Deep dive" on any company to trigger Claude's analysis from its 10-K risk factors.

### Total score

```
Total = quant (0–11) + qual (0–6) = max 17 pts
Normalized % = total / max × 100  (used for ranking and verdicts)

≥ 70% → Attractive
45–69% → Mixed
< 45% → Weak
```

## Deploying to Vercel

```bash
vercel
```

Set `FINNHUB_API_KEY` in Vercel environment variables so the price job can run.
`data/universe.json` and `data/quotes.json` are committed and ship with the
deployment — refresh locally and redeploy to update.

## Project structure

```
server.js              Express entry point
routes/
  screen.js            GET /api/screen      — universe screen + score + rank
  qualify.js           GET /api/qualify/:t  — deep-dive with Claude
  status.js            GET /api/status      — ingest/price job progress
services/
  env.js               dotenv loader (override-safe)
  keys.js              per-request BYOK key extraction from headers
  universe.js          loads/screens data/universe.json
  edgarFacts.js        companyfacts → fundamentals → computed metrics
  edgar.js             latest 10-K lookup + risk-factor extraction
  pricing.js           live price/market cap (Finnhub, disk-cached)
  claude.js            Buffett-style qualitative scoring via Claude
  scorer.js            metric scoring + normalized totals
scripts/
  ingest.js            builds data/universe.json from SEC EDGAR
  price.js             populates data/quotes.json from Finnhub
client/                React + Vite + Tailwind dashboard
```

---

Not financial advice — a research starting point.
