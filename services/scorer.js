// Financial sectors use different metrics than operating companies.
// Banks, insurers, and lenders report OCF and debt differently — FCF and ROIC
// are meaningless for them. We substitute P/B and ROE, which are the standard
// quality/value metrics for financial businesses.
const FINANCIAL_SECTORS = new Set([
  'Financial Services', 'Banks', 'Insurance', 'Diversified Financials',
  'Capital Markets', 'Mortgage Finance', 'Consumer Finance',
]);

export const isFinancialSector = sector => FINANCIAL_SECTORS.has(sector);

const ROIC_CAP = 150;
export function sanitizeRoic(roic) {
  if (roic == null) return null;
  if (roic > ROIC_CAP) return ROIC_CAP;
  if (roic < -ROIC_CAP) return null;
  return roic;
}

// Score a stock across 5 concept slots. For financials, two slots use
// different metrics (P/B instead of FCF yield, ROE instead of ROIC).
// EV/EBITDA is not applicable for financials → always 0.
//
// Slot maxes: cashQuality=3, efficiency=2, wholeBusinesss=2, growthValue=2, earningsPrice=2
// Non-financial max: 11  Financial max: 9 (wholeBusinesss slot = 0)
export function scoreQuantitative(stock) {
  const fin = isFinancialSector(stock.sector);
  return {
    cashQuality: fin ? scorePB(stock.pb)       : scoreFCF(stock.fcfYield),   // 0-3
    efficiency:  fin ? scoreROE(stock.roe)      : scoreROIC(stock.roic),      // 0-2
    wholeBusiness: fin ? 0                      : scoreEV(stock.evToEbitda),  // 0-2
    growthValue: scorePEG(stock.pegRatio),                                    // 0-2
    earningsPrice: scorePE(stock.forwardPE ?? stock.peRatio),                 // 0-2
  };
}

export function totalScore(quantScores, qualScores, sector) {
  const fin = isFinancialSector(sector);
  const quant = Object.values(quantScores).reduce((a, b) => a + b, 0);
  const maxQuant = fin ? 9 : 11;
  const qual = qualScores
    ? qualScores.businessModel.score + qualScores.management.score + qualScores.industryStructure.score
    : 0;
  const maxQual = 6;
  const total = quant + qual;
  const max = maxQuant + maxQual;
  // Normalized score (0-100) for fair cross-sector ranking
  const normalizedScore = max > 0 ? Math.round((total / max) * 100) : 0;
  return { quant, qual, total, maxQuant, maxQual, max, normalizedScore };
}

// ---- non-financial scoring ------------------------------------------------

// FCF yield: 0-3 pts (weighted higher — hardest signal to manipulate)
function scoreFCF(v) {
  if (v == null) return 0;
  if (v >= 8) return 3;
  if (v >= 5) return 2;
  if (v >= 2) return 1;
  return 0;
}

function scoreEV(v) {
  if (v == null) return 0;
  if (v <= 10) return 2;
  if (v <= 20) return 1;
  return 0;
}

function scoreROIC(v) {
  if (v == null) return 0;
  if (v >= 15) return 2;
  if (v >= 5) return 1;
  return 0;
}

// ---- financial-sector scoring ---------------------------------------------

// P/B: buying below book value is a classic Graham signal for banks
function scorePB(v) {
  if (v == null) return 0;
  if (v <= 1) return 3;   // below book — exceptional
  if (v <= 1.5) return 2; // slight premium — strong
  if (v <= 2.5) return 1; // fair
  return 0;               // expensive
}

// ROE: Buffett looked for banks consistently earning 15%+ ROE
function scoreROE(v) {
  if (v == null) return 0;
  if (v >= 15) return 2;
  if (v >= 8) return 1;
  return 0;
}

// ---- shared scoring -------------------------------------------------------

function scorePEG(v) {
  if (v == null) return 0;
  if (v < 1) return 2;
  if (v <= 2) return 1;
  return 0;
}

function scorePE(v) {
  if (v == null) return 0;
  if (v <= 15) return 2;
  if (v <= 25) return 1;
  return 0;
}
