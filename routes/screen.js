import { Router } from 'express';
import { screenUniverse, universeStats, isOTC } from '../services/universe.js';
import { getQuotes, hasLivePricing, loadCachedQuotes } from '../services/pricing.js';
import { keysFromReq } from '../services/keys.js';
import { computeMetrics } from '../services/edgarFacts.js';
import { scoreQuantitative, totalScore, sanitizeRoic } from '../services/scorer.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const keys = keysFromReq(req);
    const num = k => (req.query[k] != null && req.query[k] !== '' ? Number(req.query[k]) : undefined);

    const edgarFilters = {
      minROIC: num('minROIC'),
      maxDebtToEbitda: num('maxDebtToEbitda'),
      minGrowth: num('minGrowth'),
      minMktCap: num('minMktCap'),
      maxMktCap: num('maxMktCap'),
      sector: req.query.sector || undefined,
    };
    const maxPE = num('maxPE');
    const maxPEG = num('maxPEG');
    const limit = num('limit') ?? 40;

    const stats = universeStats();
    if (!stats.exists || stats.count === 0) {
      return res.json({ stocks: [], universeReady: false, count: 0 });
    }

    // 1. Pre-screen on EDGAR metrics — no candidate cap here. We score
    //    everyone and let total score determine the final top-N. The old
    //    ROIC-ranked cap caused high-scoring companies to be excluded when
    //    a higher-ROIC but lower-total-score company took their slot.
    const candidates = screenUniverse(edgarFilters);

    // 2. Enrich ALL survivors from the shared price cache (free — just a
    //    dict lookup). Only fall back to a live BYOK call for cache misses.
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

    // 3. Score all candidates on all 5 metrics
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
        peRatio: metrics.peRatio ?? null,
        forwardPE: null,
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

    // 4. Post-enrichment filters then rank by total score, return top-N
    stocks = stocks.filter(s => !isOTC(quotes[s.symbol]?.exchange));
    if (maxPE != null) stocks = stocks.filter(s => s.peRatio != null && s.peRatio <= maxPE);
    if (maxPEG != null) stocks = stocks.filter(s => s.pegRatio != null && s.pegRatio <= maxPEG);

    stocks.sort((a, b) => b.scores.total - a.scores.total);
    stocks = stocks.slice(0, limit); // cap after scoring, not before

    const pricesAvailable = Object.keys(quotes).length > 0;
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
