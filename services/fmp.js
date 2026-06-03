import axios from 'axios';

const BASE = 'https://financialmodelingprep.com/api/v3';
const RAW_KEY = process.env.FMP_API_KEY ?? '';
const KEY = RAW_KEY && !RAW_KEY.startsWith('your_') ? RAW_KEY : null;

// Mock data used when no API key is present
const MOCK_STOCKS = [
  {
    symbol: 'MU', companyName: 'Micron Technology', sector: 'Technology',
    price: 142.50, mktCap: 157_000_000_000,
    peRatio: 44, forwardPE: 11, evToEbitda: 28, pegRatio: 0.08,
    roic: 37, fcfYield: 2.7, revenueGrowth: 1.96, grossMargin: 0.42,
    debtToEbitda: 1.1, sbcToRevenue: 0.03,
  },
  {
    symbol: 'NVDA', companyName: 'Nvidia', sector: 'Technology',
    price: 131.00, mktCap: 3_200_000_000_000,
    peRatio: 40, forwardPE: 21, evToEbitda: 32, pegRatio: 0.48,
    roic: 105, fcfYield: 3.2, revenueGrowth: 1.22, grossMargin: 0.75,
    debtToEbitda: 0.3, sbcToRevenue: 0.02,
  },
  {
    symbol: 'TSM', companyName: 'TSMC', sector: 'Technology',
    price: 185.00, mktCap: 960_000_000_000,
    peRatio: 25, forwardPE: 22, evToEbitda: 20, pegRatio: null,
    roic: 52, fcfYield: 4.1, revenueGrowth: 0.38, grossMargin: 0.56,
    debtToEbitda: 0.8, sbcToRevenue: 0.01,
  },
  {
    symbol: 'AVGO', companyName: 'Broadcom', sector: 'Technology',
    price: 248.00, mktCap: 1_160_000_000_000,
    peRatio: 38, forwardPE: 31, evToEbitda: 54, pegRatio: 0.75,
    roic: 21, fcfYield: 2.9, revenueGrowth: 0.51, grossMargin: 0.64,
    debtToEbitda: 3.2, sbcToRevenue: 0.04,
  },
  {
    symbol: 'VRT', companyName: 'Vertiv', sector: 'Industrials',
    price: 122.00, mktCap: 46_000_000_000,
    peRatio: 58, forwardPE: 47, evToEbitda: 52, pegRatio: 1.47,
    roic: 32, fcfYield: 1.8, revenueGrowth: 0.30, grossMargin: 0.35,
    debtToEbitda: 2.1, sbcToRevenue: 0.02,
  },
  {
    symbol: 'GEV', companyName: 'GE Vernova', sector: 'Industrials',
    price: 388.00, mktCap: 106_000_000_000,
    peRatio: 72, forwardPE: 52, evToEbitda: 75, pegRatio: 1.66,
    roic: 36, fcfYield: 1.2, revenueGrowth: 0.16, grossMargin: 0.17,
    debtToEbitda: 1.4, sbcToRevenue: 0.01,
  },
  {
    symbol: 'MRVL', companyName: 'Marvell Technology', sector: 'Technology',
    price: 98.00, mktCap: 86_000_000_000,
    peRatio: 85, forwardPE: 48, evToEbitda: 71, pegRatio: 1.11,
    roic: 7, fcfYield: 1.4, revenueGrowth: 0.61, grossMargin: 0.50,
    debtToEbitda: 3.8, sbcToRevenue: 0.09,
  },
  {
    symbol: 'AMD', companyName: 'Advanced Micro Devices', sector: 'Technology',
    price: 168.00, mktCap: 273_000_000_000,
    peRatio: 92, forwardPE: 59, evToEbitda: 112, pegRatio: 1.05,
    roic: 8, fcfYield: 1.6, revenueGrowth: 0.36, grossMargin: 0.51,
    debtToEbitda: 0.9, sbcToRevenue: 0.06,
  },
  {
    symbol: 'ASML', companyName: 'ASML Holding', sector: 'Technology',
    price: 942.00, mktCap: 372_000_000_000,
    peRatio: 50, forwardPE: 44, evToEbitda: 34, pegRatio: null,
    roic: 45, fcfYield: 2.3, revenueGrowth: 0.14, grossMargin: 0.51,
    debtToEbitda: 0.5, sbcToRevenue: 0.02,
  },
  {
    symbol: 'CRDO', companyName: 'Credo Technology', sector: 'Technology',
    price: 72.00, mktCap: 11_000_000_000,
    peRatio: null, forwardPE: 85, evToEbitda: 120, pegRatio: 0.62,
    roic: 12, fcfYield: 0.4, revenueGrowth: 1.68, grossMargin: 0.63,
    debtToEbitda: 0.1, sbcToRevenue: 0.14,
  },
];

export async function screenStocks(filters = {}) {
  if (!KEY) return applyFilters(MOCK_STOCKS, filters);

  const params = {
    apikey: KEY,
    limit: 100,
    isEtf: false,
    isActivelyTrading: true,
    ...buildFmpParams(filters),
  };

  const { data } = await axios.get(`${BASE}/stock-screener`, { params });
  const enriched = await Promise.all(
    data.slice(0, 30).map(s => enrichStock(s.symbol))
  );
  return applyFilters(enriched.filter(Boolean), filters);
}

export async function enrichStock(ticker) {
  if (!KEY) {
    return MOCK_STOCKS.find(s => s.symbol === ticker.toUpperCase()) || null;
  }

  const [ratios, profile] = await Promise.all([
    axios.get(`${BASE}/ratios/${ticker}?limit=1&apikey=${KEY}`),
    axios.get(`${BASE}/profile/${ticker}?apikey=${KEY}`),
  ]);

  const r = ratios.data?.[0];
  const p = profile.data?.[0];
  if (!r || !p) return null;

  return {
    symbol: ticker.toUpperCase(),
    companyName: p.companyName,
    sector: p.sector,
    price: p.price,
    mktCap: p.mktCap,
    peRatio: r.priceEarningsRatio,
    forwardPE: r.priceEarningsToGrowthRatio ? r.priceEarningsRatio / r.priceEarningsToGrowthRatio : null,
    evToEbitda: r.enterpriseValueMultiple,
    pegRatio: r.priceEarningsToGrowthRatio,
    roic: r.returnOnCapitalEmployed ? r.returnOnCapitalEmployed * 100 : null,
    fcfYield: r.freeCashFlowYield ? r.freeCashFlowYield * 100 : null,
    revenueGrowth: r.revenueGrowth,
    grossMargin: r.grossProfitMargin,
    debtToEbitda: r.debtToEquity,
    sbcToRevenue: null,
  };
}

function buildFmpParams(filters) {
  const p = {};
  if (filters.maxPE) p.peRatioLowerThan = filters.maxPE;
  if (filters.maxPEG) p.pegRatioLowerThan = filters.maxPEG;
  if (filters.minROIC) p.roicMoreThan = filters.minROIC;
  if (filters.sector) p.sector = filters.sector;
  return p;
}

function applyFilters(stocks, filters) {
  return stocks.filter(s => {
    if (filters.maxPE && s.peRatio && s.peRatio > filters.maxPE) return false;
    if (filters.maxPEG && s.pegRatio && s.pegRatio > filters.maxPEG) return false;
    if (filters.minROIC && s.roic && s.roic < filters.minROIC) return false;
    if (filters.sector && s.sector !== filters.sector) return false;
    return true;
  });
}
