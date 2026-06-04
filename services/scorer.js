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

// Quantitative scoring. FCF yield scores out of 3 (most manipulation-resistant
// signal); all others out of 2. Max quant = 11, total max = 17.
export function scoreQuantitative(stock) {
  return {
    fcfYield: scoreFCF(stock.fcfYield),   // 0-3
    evToEbitda: scoreEV(stock.evToEbitda), // 0-2
    peg: scorePEG(stock.pegRatio),         // 0-2
    pe: scorePE(stock.forwardPE ?? stock.peRatio), // 0-2
    roic: scoreROIC(stock.roic),           // 0-2
  };
}

export function totalScore(quantScores, qualScores) {
  const quant = Object.values(quantScores).reduce((a, b) => a + b, 0);
  const qual = qualScores
    ? qualScores.businessModel.score + qualScores.management.score + qualScores.industryStructure.score
    : 0;
  return { quant, qual, total: quant + qual, maxQuant: 11, maxQual: 6, max: 17 };
}

// FCF yield: 0-3 pts (weighted higher — hardest signal to manipulate)
function scoreFCF(v) {
  if (v == null) return 0;
  if (v >= 8) return 3;  // exceptional
  if (v >= 5) return 2;  // strong
  if (v >= 2) return 1;  // fair
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
