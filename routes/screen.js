import { Router } from 'express';
import { screenStocks } from '../services/fmp.js';
import { scoreQuantitative, totalScore } from '../services/scorer.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filters = {
      maxPE: req.query.maxPE ? Number(req.query.maxPE) : undefined,
      maxPEG: req.query.maxPEG ? Number(req.query.maxPEG) : undefined,
      minROIC: req.query.minROIC ? Number(req.query.minROIC) : undefined,
      sector: req.query.sector || undefined,
    };

    const stocks = await screenStocks(filters);
    const results = stocks.map(stock => {
      const quantScores = scoreQuantitative(stock);
      const scores = totalScore(quantScores, null);
      return { ...stock, quantScores, scores };
    });

    results.sort((a, b) => b.scores.total - a.scores.total);
    const rawKey = process.env.FMP_API_KEY ?? '';
    const hasRealKey = rawKey && !rawKey.startsWith('your_');
    res.json({ stocks: results, usingMockData: !hasRealKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
