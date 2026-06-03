import axios from 'axios';

const BASE = 'https://data.sec.gov';
const HEADERS = { 'User-Agent': 'StockScout research@stockscout.dev' };

// Resolve ticker → CIK using SEC company tickers JSON
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

// Pull the most recent 10-K filing URL
async function getLatest10K(cik) {
  const { data } = await axios.get(
    `${BASE}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K&dateb=&owner=include&count=5&search_text=&output=atom`,
    { headers: HEADERS }
  );
  // The atom feed has entries with filing-href
  const match = data.match(/href="(\/Archives\/edgar\/data\/[^"]+\.htm)"/);
  return match ? `https://www.sec.gov${match[1]}` : null;
}

// Fetch company facts for numeric signals (SBC, revenue concentration)
async function getCompanyFacts(cik) {
  try {
    const { data } = await axios.get(
      `${BASE}/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: HEADERS }
    );
    return data.facts;
  } catch {
    return null;
  }
}

// Extract risk factor text from a 10-K filing page
async function getRiskFactors(filingUrl) {
  try {
    const { data } = await axios.get(filingUrl, { headers: HEADERS, timeout: 10000 });
    // Strip HTML tags
    const text = data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    // Find risk factors section
    const riskStart = text.search(/item\s+1a[\s.]+risk\s+factor/i);
    if (riskStart === -1) return text.slice(0, 4000);
    return text.slice(riskStart, riskStart + 6000);
  } catch {
    return null;
  }
}

export async function fetchEdgarContext(ticker) {
  try {
    const cik = await getCIK(ticker);
    if (!cik) return { ticker, error: 'CIK not found' };

    const [filingUrl, facts] = await Promise.all([
      getLatest10K(cik),
      getCompanyFacts(cik),
    ]);

    const riskText = filingUrl ? await getRiskFactors(filingUrl) : null;

    // Extract SBC from XBRL facts
    let sbcAmount = null;
    try {
      const sbcFact = facts?.['us-gaap']?.ShareBasedCompensation?.units?.USD;
      if (sbcFact) {
        const annual = sbcFact.filter(f => f.form === '10-K').slice(-1)[0];
        sbcAmount = annual?.val || null;
      }
    } catch {}

    return { ticker, cik, riskText, sbcAmount, filingUrl };
  } catch (err) {
    return { ticker, error: err.message };
  }
}
