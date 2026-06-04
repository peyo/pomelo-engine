export const METRICS = [
  {
    key: 'fcfYield',
    label: 'FCF Yield',
    unit: '%',
    tooltip: {
      what: 'Free Cash Flow divided by market cap — how much cash the business generates relative to its price.',
      formula: 'FCF / Market Cap × 100',
      ranges: [
        { label: '≥ 8%', color: 'sky', meaning: 'Exceptional cash return' },
        { label: '5–8%', color: 'green', meaning: 'Strong' },
        { label: '2–5%', color: 'yellow', meaning: 'Fair' },
        { label: '< 2%', color: 'red', meaning: 'Weak or capex-heavy' },
      ],
      source: 'stockanalysis.com → Key Stats',
      trap: 'Heavy capex companies (like chip fabs) look weak here even when earnings are strong. FCF yield is weighted more heavily than other metrics — it\'s the hardest signal to manipulate.',
    },
  },
  {
    key: 'evToEbitda',
    label: 'EV/EBITDA',
    unit: 'x',
    tooltip: {
      what: 'Enterprise Value divided by EBITDA — the best apples-to-apples comparison across companies with different debt levels.',
      formula: '(Market Cap + Debt − Cash) / EBITDA',
      ranges: [
        { label: '< 10x', color: 'green', meaning: 'Cheap' },
        { label: '10–20x', color: 'yellow', meaning: 'Reasonable' },
        { label: '> 20x', color: 'red', meaning: 'Expensive' },
      ],
      source: 'stockanalysis.com → Valuation',
      trap: 'Ignores capex — capital-intensive businesses can look cheaper than they are.',
    },
  },
  {
    key: 'peg',
    label: 'PEG Ratio',
    unit: 'x',
    tooltip: {
      what: 'P/E divided by the revenue growth rate. Adjusts valuation for growth — the key metric for separating cheap growth from value traps.',
      formula: 'P/E ÷ YoY Revenue Growth %',
      ranges: [
        { label: '< 1x', color: 'green', meaning: 'Undervalued relative to growth' },
        { label: '1–2x', color: 'yellow', meaning: 'Fair' },
        { label: '> 2x', color: 'red', meaning: 'Expensive for its growth rate' },
      ],
      source: 'Computed: trailing P/E ÷ YoY revenue growth (SEC EDGAR)',
      trap: 'We use revenue growth (not earnings) so one-off profit swings don\'t create a misleadingly cheap PEG.',
    },
  },
  {
    key: 'pe',
    label: 'P/E (ttm)',
    unit: 'x',
    tooltip: {
      what: 'Trailing Price-to-Earnings — market cap divided by the last fiscal year\'s net income (from SEC 10-K). What you pay for each $1 of actual earnings.',
      formula: 'Market Cap / Latest FY Net Income',
      ranges: [
        { label: '< 15x', color: 'green', meaning: 'Historically cheap' },
        { label: '15–25x', color: 'yellow', meaning: 'Fair for stable business' },
        { label: '> 25x', color: 'red', meaning: 'Growth premium required' },
      ],
      source: 'Computed: live market cap (FMP) ÷ net income (SEC EDGAR)',
      trap: 'This is trailing, not forward. Fast-growing companies look expensive here because earnings already grew past the price — check the PEG ratio alongside it.',
    },
  },
  {
    key: 'roic',
    label: 'ROIC',
    unit: '%',
    tooltip: {
      what: 'Return on Invested Capital — how efficiently the company turns capital into profit. The best signal of a real moat.',
      formula: 'NOPAT / Capital Employed (Debt + Equity)',
      ranges: [
        { label: '≥ 15%', color: 'green', meaning: 'Strong moat — earns well above cost of capital' },
        { label: '5–15%', color: 'yellow', meaning: 'Adequate' },
        { label: '< 5%', color: 'red', meaning: 'Destroys value — earns less than cost of capital' },
      ],
      source: 'Computed: NOPAT ÷ (total debt + book equity), from SEC EDGAR',
      trap: 'Shown blank for companies with negative book equity (e.g. heavy buybacks) — book ROIC is undefined there, not zero.',
    },
  },
];

export const QUAL_CATEGORIES = [
  {
    key: 'businessModel',
    label: 'Business Model',
    tooltip: {
      what: 'How durable and defensible is the business? Assesses revenue concentration, pricing power, and switching costs.',
      signals: ['Revenue concentration (>20% single customer = fragile)', 'Gross margin stability', 'Customer churn / Net Revenue Retention'],
      source: 'SEC 10-K → Risk Factors, Customer Concentration disclosures',
    },
  },
  {
    key: 'management',
    label: 'Management Quality',
    tooltip: {
      what: 'Track record of capital allocation, insider alignment, and investment in future growth.',
      signals: ['Stock-based comp as % of revenue (<10% = good)', 'Insider buying vs. selling (SEC Form 4)', 'Acquisition history — did deals create or destroy value?'],
      source: 'SEC Form 4 filings at openinsider.com, 10-K Notes',
    },
  },
  {
    key: 'industryStructure',
    label: 'Industry Structure',
    tooltip: {
      what: 'Is the industry growing or declining? Does the company have structural advantages or is it in a commoditizing market?',
      signals: ['5-year revenue growth trend', 'ASP (average selling price) trend — rising = pricing power', 'Morningstar Moat Rating'],
      source: 'Morningstar, earnings transcripts, industry reports',
    },
  },
];

export const MAX_SCORE = 17;
export const MAX_QUANT = 11;
export const MAX_QUAL = 6;

export function scoreColor(score, max = 2) {
  const pct = score / max;
  if (pct >= 0.75) return 'text-green-400';
  if (pct >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

export function totalColor(score, max = MAX_SCORE) {
  const pct = score / max;
  if (pct >= 0.7) return 'text-green-400';
  if (pct >= 0.45) return 'text-yellow-400';
  return 'text-red-400';
}

export function verdict(score, max = MAX_SCORE) {
  const pct = score / max;
  if (pct >= 0.7) return { label: 'Attractive', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (pct >= 0.45) return { label: 'Mixed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'Weak', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
}
