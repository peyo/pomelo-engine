import axios from 'axios';

// FMP free tier (post-Aug-2025) only exposes the /stable/profile endpoint.
// We use it purely for live price + market cap; all fundamentals come from EDGAR.
const BASE = 'https://financialmodelingprep.com/stable';
const RAW_KEY = process.env.FMP_API_KEY ?? '';
const KEY = RAW_KEY && !RAW_KEY.startsWith('your_') ? RAW_KEY : null;

export const hasLivePricing = () => Boolean(KEY);

// Live price + market cap for one ticker. Returns null if unavailable.
export async function getQuote(ticker) {
  if (!KEY) return null;
  try {
    const { data } = await axios.get(`${BASE}/profile`, {
      params: { symbol: ticker.toUpperCase(), apikey: KEY },
    });
    const p = data?.[0];
    if (!p) return null;
    return {
      symbol: p.symbol,
      companyName: p.companyName,
      sector: p.sector,
      industry: p.industry,
      price: p.price,
      mktCap: p.marketCap,
      cik: p.cik,
      beta: p.beta,
      image: p.image,
    };
  } catch {
    return null;
  }
}

// Fetch quotes for many tickers with limited concurrency (free-tier friendly).
export async function getQuotes(tickers, concurrency = 4) {
  const results = {};
  const queue = [...tickers];

  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      const q = await getQuote(t);
      if (q) results[t] = q;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
