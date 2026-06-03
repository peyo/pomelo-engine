import { Router } from 'express';
import { enrichStock } from '../services/fmp.js';
import { fetchEdgarContext } from '../services/edgar.js';
import { scoreQualitative } from '../services/claude.js';
import { scoreQuantitative, totalScore } from '../services/scorer.js';

const router = Router();

router.get('/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    const [stock, edgar] = await Promise.all([
      enrichStock(ticker),
      fetchEdgarContext(ticker),
    ]);

    if (!stock) return res.status(404).json({ error: 'Ticker not found' });

    const qualScores = await scoreQualitative(ticker, stock.companyName, edgar.riskText);
    const quantScores = scoreQuantitative(stock);
    const scores = totalScore(quantScores, qualScores);

    res.json({ stock, qualScores, quantScores, scores, edgar: { filingUrl: edgar.filingUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
