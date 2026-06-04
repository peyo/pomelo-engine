import { Router } from 'express';
import { screenUniverse, universeStats } from '../services/universe.js';
import { getQuotes, hasLivePricing, loadCachedQuotes } from '../services/pricing.js';
import { keysFromReq } from '../services/keys.js';
import { computeMetrics } from '../services/edgarFacts.js';
import { scoreQuantitative, totalScore, sanitizeRoic } from '../services/scorer.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const keys = keysFromReq(req);
    const num = k => (req.query[k] != null && req.query[k] !== '' ? Number(req.query[k]) : undefined);

    // EDGAR-metric + market-cap filters (applied against the cached universe).
    // minMktCap uses prices populated by the batch price job, so it acts as a
    // true pre-screen before the top-N candidate cap.
    const edgarFilters = {
      minROIC: num('minROIC'),
      maxDebtToEbitda: num('maxDebtToEbitda'),
      minGrowth: num('minGrowth'),
      minMktCap: num('minMktCap'),
      maxMktCap: num('maxMktCap'),
    };
    // Price-based filters (applied after enrichment)
    const maxPE = num('maxPE');
    const maxPEG = num('maxPEG');
    const sector = req.query.sector || undefined;
    const limit = num('limit') ?? 40;

    const stats = universeStats();
    if (!stats.exists || stats.count === 0) {
      return res.json({ stocks: [], universeReady: false, count: 0 });
    }

    // 1. Pre-screen the universe on EDGAR metrics (+ size)
    const candidates = screenUniverse(edgarFilters, limit);

    // 2. Enrich with prices. Prefer the shared cache (populated by the price
    //    job); only spend a live BYOK call on tickers the cache is missing.
    const cached = loadCachedQuotes();
    const quotes = {};
    const missing = [];
    for (const c of candidates) {
      if (cached[c.ticker]) quotes[c.ticker] = cached[c.ticker];
      else missing.push(c.ticker);
    }
    let enrichment = { rateLimited: false, stale: false };
    if (missing.length && hasLivePricing(keys)) {
      enrichment = await getQuotes(missing, keys);
      Object.assign(quotes, enrichment.quotes);
    }
    const pricesAvailable = Object.keys(quotes).length > 0;

    // 3. Compute full metric set + score
    let stocks = candidates.map(c => {
      const quote = quotes[c.ticker];
      const metrics = quote
        ? computeMetrics(c.fundamentals, { price: quote.price, marketCap: quote.mktCap })
        : {};

      const stock = {
        symbol: c.ticker,
        companyName: quote?.companyName ?? c.name,
        sector: quote?.sector ?? null,
        price: quote?.price ?? null,
        mktCap: quote?.mktCap ?? null,
        fiscalYear: c.fiscalYear,
        // metric fields consumed by the scorer / UI
        peRatio: metrics.peRatio ?? null,
        forwardPE: null, // free tier has no forward estimates; trailing only
        evToEbitda: metrics.evToEbitda ?? null,
        pegRatio: metrics.pegRatio ?? null,
        roic: sanitizeRoic(c.metrics.roic),
        fcfYield: metrics.fcfYield ?? null,
        revenueGrowth: c.metrics.revenueGrowth ?? null,
        debtToEbitda: c.metrics.debtToEbitda ?? null,
        hasLiveData: Boolean(quote),
      };

      const quantScores = scoreQuantitative(stock);
      stock.quantScores = quantScores;
      stock.scores = totalScore(quantScores, null);
      return stock;
    });

    // 4. Apply price-based + sector filters post-enrichment
    if (sector) stocks = stocks.filter(s => s.sector === sector);
    if (maxPE != null) stocks = stocks.filter(s => s.peRatio != null && s.peRatio <= maxPE);
    if (maxPEG != null) stocks = stocks.filter(s => s.pegRatio != null && s.pegRatio <= maxPEG);

    stocks.sort((a, b) => b.scores.total - a.scores.total);

    res.json({
      stocks,
      universeReady: true,
      count: stats.count,
      livePricing: hasLivePricing(keys) || pricesAvailable,
      rateLimited: enrichment.rateLimited,
      stale: enrichment.stale,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
