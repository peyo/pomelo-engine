import { Router } from 'express';
import { getCompany } from '../services/universe.js';
import { getQuote } from '../services/pricing.js';
import { keysFromReq } from '../services/keys.js';
import { computeMetrics, getFundamentals } from '../services/edgarFacts.js';
import { fetchEdgarContext } from '../services/edgar.js';
import { scoreQualitative } from '../services/claude.js';
import { scoreQuantitative, totalScore, sanitizeRoic } from '../services/scorer.js';

const router = Router();

router.get('/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    const keys = keysFromReq(req);
    // Prefer cached universe; fall back to a live EDGAR fetch for off-list tickers
    let company = getCompany(ticker);
    let fundamentals = company?.fundamentals;

    const { quote } = await getQuote(ticker, keys);

    if (!fundamentals && quote?.cik) {
      const f = await getFundamentals(quote.cik);
      fundamentals = f;
    }
    if (!fundamentals) return res.status(404).json({ error: 'No EDGAR fundamentals found for ' + ticker });

    const metrics = quote
      ? computeMetrics(fundamentals, { price: quote.price, marketCap: quote.mktCap })
      : {};

    const stock = {
      symbol: ticker,
      companyName: quote?.companyName ?? company?.name ?? ticker,
      sector: quote?.sector ?? null,
      price: quote?.price ?? null,
      mktCap: quote?.mktCap ?? null,
      peRatio: metrics.peRatio ?? null,
      forwardPE: null,
      evToEbitda: metrics.evToEbitda ?? null,
      pegRatio: metrics.pegRatio ?? null,
      roic: sanitizeRoic(company?.metrics?.roic ?? metrics.roic),
      fcfYield: metrics.fcfYield ?? null,
      revenueGrowth: company?.metrics?.revenueGrowth ?? metrics.revenueGrowth ?? null,
      debtToEbitda: company?.metrics?.debtToEbitda ?? null,
    };

    const quantScores = scoreQuantitative(stock);

    // SEC 10-K risk factors → Claude qualitative scoring (optional)
    const edgar = await fetchEdgarContext(ticker);
    let qualScores = null;
    let qualError = null;
    try {
      qualScores = await scoreQualitative(ticker, stock.companyName, edgar.riskText, keys.anthropic);
    } catch (e) {
      qualError = e.code === 'NO_CLAUDE_KEY'
        ? 'Add your Anthropic key in Settings (⚙ Keys) to enable Claude qualitative analysis.'
        : `Qualitative scoring failed: ${e.message}`;
    }

    const scores = totalScore(quantScores, qualScores);
    res.json({ stock, qualScores, qualError, quantScores, scores, edgar: { filingUrl: edgar.filingUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
