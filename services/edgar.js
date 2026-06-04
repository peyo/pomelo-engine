import axios from 'axios';

const HEADERS = { 'User-Agent': 'StockScout research@stockscout.dev' };

// Resolve ticker → CIK using SEC company tickers JSON (cached)
let tickerMap = null;
async function getCIK(ticker) {
  if (!tickerMap) {
    const { data } = await axios.get(
      'https://www.sec.gov/files/company_tickers.json',
      { headers: HEADERS }
    );
    tickerMap = {};
    Object.values(data).forEach(c => {
      tickerMap[c.ticker.toUpperCase()] = String(c.cik_str).padStart(10, '0');
    });
  }
  return tickerMap[ticker.toUpperCase()] || null;
}

// Find the most recent 10-K document URL via the modern submissions API.
async function getLatest10K(cik) {
  const { data } = await axios.get(
    `https://data.sec.gov/submissions/CIK${cik}.json`,
    { headers: HEADERS }
  );
  const recent = data.filings?.recent;
  if (!recent) return null;

  const { form, accessionNumber, primaryDocument } = recent;
  for (let i = 0; i < form.length; i++) {
    if (form[i] === '10-K') {
      const accNoDashes = accessionNumber[i].replace(/-/g, '');
      const cikNum = String(Number(cik)); // unpadded for the Archives path
      return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDashes}/${primaryDocument[i]}`;
    }
  }
  return null;
}

// Extract the Risk Factors (Item 1A) section text from a 10-K filing.
async function getRiskFactors(filingUrl) {
  try {
    const { data } = await axios.get(filingUrl, { headers: HEADERS, timeout: 15000 });
    const text = String(data).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ');
    // Locate "Item 1A. Risk Factors" (skip the table-of-contents occurrence)
    const matches = [...text.matchAll(/item\s+1a[\s.\-—]*risk\s+factors/gi)];
    const start = matches.length > 1 ? matches[1].index : matches[0]?.index;
    if (start == null) return text.slice(0, 5000);
    return text.slice(start, start + 8000);
  } catch {
    return null;
  }
}

export async function fetchEdgarContext(ticker) {
  try {
    const cik = await getCIK(ticker);
    if (!cik) return { ticker, error: 'CIK not found' };

    const filingUrl = await getLatest10K(cik);
    const riskText = filingUrl ? await getRiskFactors(filingUrl) : null;

    return { ticker, cik, riskText, filingUrl };
  } catch (err) {
    return { ticker, error: err.message };
  }
}
