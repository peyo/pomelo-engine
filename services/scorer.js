// ROIC above this is almost always a denominator artifact (negative/tiny
// invested capital from heavy buybacks). Treat as "very high" rather than
// reporting a misleading 500%+ figure.
const ROIC_CAP = 150;

export function sanitizeRoic(roic) {
  if (roic == null) return null;
  if (roic > ROIC_CAP) return ROIC_CAP;
  if (roic < -ROIC_CAP) return null; // deeply negative is not interpretable here
  return roic;
}

// Quantitative scoring — returns 0/1/2 per metric, max 10 points
export function scoreQuantitative(stock) {
  return {
    fcfYield: scoreFCF(stock.fcfYield),
    evToEbitda: scoreEV(stock.evToEbitda),
    peg: scorePEG(stock.pegRatio),
    pe: scorePE(stock.forwardPE ?? stock.peRatio),
    roic: scoreROIC(stock.roic),
  };
}

export function totalScore(quantScores, qualScores) {
  const quant = Object.values(quantScores).reduce((a, b) => a + b, 0);
  const qual = qualScores
    ? qualScores.businessModel.score + qualScores.management.score + qualScores.industryStructure.score
    : 0;
  return { quant, qual, total: quant + qual, maxQuant: 10, maxQual: 6, max: 16 };
}

function scoreFCF(v) {
  if (v == null) return 0;
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

function scorePEG(v) {
  if (v == null) return 1; // neutral when unavailable
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

function scoreROIC(v) {
  if (v == null) return 0;
  if (v >= 15) return 2;
  if (v >= 5) return 1;
  return 0;
}
