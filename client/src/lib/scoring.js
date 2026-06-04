// Financial sectors use different metrics — P/B and ROE replace FCF and ROIC.
const FINANCIAL_SECTORS = new Set([
  'Financial Services', 'Banks', 'Insurance', 'Diversified Financials',
  'Capital Markets', 'Mortgage Finance', 'Consumer Finance',
]);

export const isFinancialSector = sector => FINANCIAL_SECTORS.has(sector);

// Each metric slot has a concept-level label and separate tooltips explaining
// what it measures for non-financials vs financial companies.
export const METRICS = [
  {
    key: 'cashQuality',
    label: 'Cash Flow',
    nonFinancialKey: 'fcfYield',
    financialKey: 'pb',
    nonFinancialUnit: '%',
    financialUnit: 'x',
    tooltip: {
      what: 'How cheaply you\'re buying the business\'s cash generation or assets.',
      nonFinancial: {
        metric: 'FCF Yield',
        formula: 'Free Cash Flow / Market Cap × 100',
        what: 'How much actual cash the business generates per dollar you invest. The hardest metric to manipulate — cash is real, earnings aren\'t always.',
        ranges: [
          { label: '≥ 8%', color: 'sky', meaning: 'Exceptional' },
          { label: '5–8%', color: 'green', meaning: 'Strong' },
          { label: '2–5%', color: 'yellow', meaning: 'Fair' },
          { label: '< 2%', color: 'red', meaning: 'Weak' },
        ],
      },
      financial: {
        metric: 'Price / Book (P/B)',
        formula: 'Market Cap / Book Equity',
        what: 'For banks and lenders, book value (equity on the balance sheet) represents real assets after liabilities. Buying below book means paying less than liquidation value — Graham\'s classic bank signal.',
        ranges: [
          { label: '≤ 1x', color: 'sky', meaning: 'Below book — exceptional' },
          { label: '1–1.5x', color: 'green', meaning: 'Slight premium — strong' },
          { label: '1.5–2.5x', color: 'yellow', meaning: 'Fair' },
          { label: '> 2.5x', color: 'red', meaning: 'Expensive' },
        ],
      },
      trap: 'FCF yield breaks for financial companies (banks count loan activity as operating cash flow). P/B breaks for asset-light companies (their value is in brands/IP, not balance sheet assets).',
    },
  },
  {
    key: 'efficiency',
    label: 'Efficiency',
    nonFinancialKey: 'roic',
    financialKey: 'roe',
    nonFinancialUnit: '%',
    financialUnit: '%',
    tooltip: {
      what: 'How efficiently the business turns capital into profit.',
      nonFinancial: {
        metric: 'ROIC',
        formula: 'NOPAT / (Debt + Equity)',
        what: 'Return on all capital employed — equity plus debt. Tells you how efficiently the whole business uses money, regardless of how it\'s financed. The best moat signal.',
        ranges: [
          { label: '≥ 15%', color: 'green', meaning: 'Strong moat' },
          { label: '5–15%', color: 'yellow', meaning: 'Adequate' },
          { label: '< 5%', color: 'red', meaning: 'Destroys value' },
        ],
      },
      financial: {
        metric: 'ROE',
        formula: 'Net Income / Equity × 100',
        what: 'For banks, debt (deposits) is raw material, not a financing choice — so including it in the denominator (as ROIC does) is meaningless. ROE asks: for every dollar shareholders put in, how much profit came back? Buffett specifically sought banks earning 15%+ ROE.',
        ranges: [
          { label: '≥ 15%', color: 'green', meaning: 'Buffett-grade efficiency' },
          { label: '8–15%', color: 'yellow', meaning: 'Adequate' },
          { label: '< 8%', color: 'red', meaning: 'Weak' },
        ],
      },
      trap: 'ROIC is undefined for companies with negative book equity (heavy buybacks). ROE can be inflated by leverage — always check the debt level alongside it.',
    },
  },
  {
    key: 'wholeBusiness',
    label: 'Full Price',
    nonFinancialKey: 'evToEbitda',
    financialKey: null,
    nonFinancialUnit: 'x',
    financialUnit: null,
    tooltip: {
      what: 'What you\'re paying for the whole business including debt.',
      nonFinancial: {
        metric: 'EV/EBITDA',
        formula: '(Market Cap + Debt − Cash) / EBITDA',
        what: 'Compares the total cost to buy the company (including taking on its debt) to its operating earnings before accounting choices. Best apples-to-apples comparison across companies with different capital structures.',
        ranges: [
          { label: '< 10x', color: 'green', meaning: 'Cheap' },
          { label: '10–20x', color: 'yellow', meaning: 'Reasonable' },
          { label: '> 20x', color: 'red', meaning: 'Expensive' },
        ],
      },
      financial: {
        metric: 'Not applicable',
        formula: '—',
        what: 'EV/EBITDA doesn\'t work for banks and financial companies. Their debt (deposits, borrowings) is operational raw material, not financial leverage — adding it to enterprise value produces a meaningless number. Financial companies are scored on 4 metrics instead of 5.',
        ranges: [],
      },
      trap: 'For financial companies this slot is always blank — it\'s not a data gap, it\'s intentional.',
    },
  },
  {
    key: 'growthValue',
    label: 'Growth Value',  // already two words
    nonFinancialKey: 'pegRatio',
    financialKey: 'pegRatio',
    nonFinancialUnit: 'x',
    financialUnit: 'x',
    tooltip: {
      header: 'Growth Value: PEG Ratio',
      what: 'P/E divided by revenue growth rate — adjusts valuation for how fast the company is growing. A company at 40x P/E growing 50% is cheaper than one at 15x P/E growing 5%.',
      formula: 'P/E ÷ YoY Revenue Growth %',
      ranges: [
        { label: '< 1x', color: 'green', meaning: 'Undervalued relative to growth' },
        { label: '1–2x', color: 'yellow', meaning: 'Fair' },
        { label: '> 2x', color: 'red', meaning: 'Expensive for its growth rate' },
      ],
      source: 'Computed from SEC EDGAR filings',
      trap: 'We use revenue growth (not earnings) so one-off profit swings don\'t create a misleadingly cheap PEG. Blank when revenue is flat or declining — undefined, not zero.',
    },
  },
  {
    key: 'earningsPrice',
    label: 'Earnings Price',
    nonFinancialKey: 'peRatio',
    financialKey: 'peRatio',
    nonFinancialUnit: 'x',
    financialUnit: 'x',
    tooltip: {
      header: 'Earnings Price: P/E (ttm)',
      what: 'What you\'re paying for each dollar of last year\'s earnings. Trailing — based on actual filed numbers, not analyst estimates.',
      formula: 'Market Cap / Last FY Net Income',
      ranges: [
        { label: '< 15x', color: 'green', meaning: 'Historically cheap' },
        { label: '15–25x', color: 'yellow', meaning: 'Fair' },
        { label: '> 25x', color: 'red', meaning: 'Growth premium required' },
      ],
      source: 'Computed: live market cap (Finnhub) ÷ net income (SEC EDGAR)',
      trap: 'Looks expensive for fast growers whose earnings are compounding — check PEG alongside it. Works the same for financial companies since earnings are well defined.',
    },
  },
];

export const QUAL_CATEGORIES = [
  {
    key: 'moat',
    label: 'Moat',
    max: 2,
    tooltip: {
      what: 'Does this business have durable pricing power? Buffett\'s core question — can they raise prices without losing customers?',
      signals: ['Network effects, switching costs, or regulatory moat', 'Pricing power: can raise prices annually without losing share', 'A well-funded competitor could not take 20% share in 5 years'],
      source: 'SEC 10-K → Risk Factors, competitive landscape disclosures',
    },
  },
  {
    key: 'durability',
    label: 'Durability',
    max: 2,
    tooltip: {
      what: 'Will this business look the same in 10 years? Resistant to technological disruption and competitive obsolescence.',
      signals: ['Business model is essential or habitual', 'Not dependent on a specific technology cycle', 'No going-concern language or structural decline signals'],
      source: 'SEC 10-K → Risk Factors, business description',
    },
  },
  {
    key: 'management',
    label: 'Management',
    max: 1,
    tooltip: {
      what: 'Has management demonstrated exceptional capital allocation? Standard governance is not enough — Buffett looks for proven judgment.',
      signals: ['Smart acquisitions at great prices that created real value', 'Buybacks demonstrably below intrinsic value', 'Founder-led with significant insider ownership'],
      source: 'SEC Form 4 (insider ownership), 10-K acquisition history',
    },
  },
  {
    key: 'simplicity',
    label: 'Simplicity',
    max: 1,
    tooltip: {
      what: 'Can a generalist understand and predict this business? Buffett only buys within his circle of competence.',
      signals: ['Business model explainable in one sentence', 'Revenue predictable without domain expertise', 'No black-box complexity: biotech pipelines, semiconductor cycles, complex financials'],
      source: 'Business description, revenue concentration, segment complexity',
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

export function totalColor(normalizedScore) {
  if (normalizedScore >= 70) return 'text-green-400';
  if (normalizedScore >= 45) return 'text-yellow-400';
  return 'text-red-400';
}

export function verdict(normalizedScore) {
  if (normalizedScore >= 70) return { label: 'Attractive', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (normalizedScore >= 45) return { label: 'Mixed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'Weak', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
}
