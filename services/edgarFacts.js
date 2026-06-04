import axios from 'axios';

const H = { 'User-Agent': 'StockScout research@stockscout.dev' };

// XBRL tag fallbacks — companies tag the same concept differently
const TAGS = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  netIncome: ['NetIncomeLoss', 'ProfitLoss'],
  operatingIncome: ['OperatingIncomeLoss'],
  dna: ['DepreciationDepletionAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'DepreciationAndAmortization'],
  ocf: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebt'],
  shortTermDebt: ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings'],
  equity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  shares: ['WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfSharesOutstandingBasic'],
};

// Get the list of unit entries for the first matching tag
function getUnits(facts, tagList) {
  for (const tag of tagList) {
    const node = facts['us-gaap']?.[tag] ?? facts['dei']?.[tag];
    if (node?.units) {
      const unitKey = Object.keys(node.units)[0];
      return node.units[unitKey];
    }
  }
  return null;
}

// Annual reports: 10-K only (US domestic filers — foreign 20-F issuers excluded)
const ANNUAL_FORMS = ['10-K'];

// Latest annual value for a flow metric. Returns { val, fy } or null.
function latestAnnual(units) {
  if (!units) return null;
  const annual = units
    .filter(u => ANNUAL_FORMS.includes(u.form) && u.fp === 'FY' && u.val != null)
    // duration of roughly a year (start→end ~365d) guards against partial periods
    .filter(u => u.start && u.end && daysBetween(u.start, u.end) > 300)
    .sort((a, b) => (a.fy - b.fy) || a.end.localeCompare(b.end));
  const last = annual[annual.length - 1];
  return last ? { val: last.val, fy: last.fy, end: last.end } : null;
}

// Prior fiscal year value (for growth) given the latest fy
function priorAnnual(units, latestFy) {
  if (!units) return null;
  const prior = units
    .filter(u => ANNUAL_FORMS.includes(u.form) && u.fp === 'FY' && u.fy === latestFy - 1 && u.val != null)
    .filter(u => u.start && u.end && daysBetween(u.start, u.end) > 300)
    .sort((a, b) => a.end.localeCompare(b.end));
  const last = prior[prior.length - 1];
  return last ? last.val : null;
}

// Most recent point-in-time value for a balance-sheet metric
function latestInstant(units) {
  if (!units) return null;
  const sorted = units
    .filter(u => u.val != null && u.end)
    .sort((a, b) => a.end.localeCompare(b.end));
  const last = sorted[sorted.length - 1];
  return last ? last.val : null;
}

function daysBetween(a, b) {
  return (new Date(b) - new Date(a)) / 86_400_000;
}

export async function getFundamentals(cik) {
  const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
  const { data } = await axios.get(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`,
    { headers: H }
  );
  const facts = data.facts;

  const revenueU = getUnits(facts, TAGS.revenue);
  const netIncomeU = getUnits(facts, TAGS.netIncome);
  const opIncomeU = getUnits(facts, TAGS.operatingIncome);
  const dnaU = getUnits(facts, TAGS.dna);
  const ocfU = getUnits(facts, TAGS.ocf);
  const capexU = getUnits(facts, TAGS.capex);

  const revenue = latestAnnual(revenueU);
  const netIncome = latestAnnual(netIncomeU);
  const opIncome = latestAnnual(opIncomeU);
  const dna = latestAnnual(dnaU);
  const ocf = latestAnnual(ocfU);
  const capex = latestAnnual(capexU);

  const cash = latestInstant(getUnits(facts, TAGS.cash)) ?? 0;
  const longTermDebt = latestInstant(getUnits(facts, TAGS.longTermDebt)) ?? 0;
  const shortTermDebt = latestInstant(getUnits(facts, TAGS.shortTermDebt)) ?? 0;
  const equity = latestInstant(getUnits(facts, TAGS.equity)) ?? 0;

  const fy = netIncome?.fy;
  const priorNetIncome = fy ? priorAnnual(netIncomeU, fy) : null;
  const priorRevenue = revenue?.fy ? priorAnnual(revenueU, revenue.fy) : null;

  return {
    fiscalYear: fy,
    revenue: revenue?.val ?? null,
    priorRevenue,
    netIncome: netIncome?.val ?? null,
    priorNetIncome,
    operatingIncome: opIncome?.val ?? null,
    dna: dna?.val ?? null,
    ocf: ocf?.val ?? null,
    capex: capex?.val ?? null, // positive number (cash outflow)
    cash,
    totalDebt: longTermDebt + shortTermDebt,
    equity,
  };
}

// Compute valuation metrics from EDGAR fundamentals + live market data
export function computeMetrics(f, { price, marketCap }) {
  const out = {
    peRatio: null, evToEbitda: null, pegRatio: null,
    roic: null, fcfYield: null, revenueGrowth: null,
    ebitda: null, fcf: null, ev: null,
  };
  if (!marketCap) return out;

  // P/E (trailing annual)
  if (f.netIncome && f.netIncome > 0) {
    out.peRatio = round(marketCap / f.netIncome);
  }

  // EBITDA = operating income + D&A
  if (f.operatingIncome != null && f.dna != null) {
    out.ebitda = f.operatingIncome + f.dna;
  }

  // Enterprise value = market cap + total debt - cash
  out.ev = marketCap + f.totalDebt - f.cash;

  if (out.ebitda && out.ebitda > 0) {
    out.evToEbitda = round(out.ev / out.ebitda);
  }

  // Free cash flow = operating cash flow - capex
  if (f.ocf != null && f.capex != null) {
    out.fcf = f.ocf - f.capex;
    out.fcfYield = round((out.fcf / marketCap) * 100, 1);
  }

  // ROIC ≈ NOPAT / capital employed (debt + equity). NOPAT ≈ operating income
  // × (1 − 21% tax). We do NOT subtract cash: for cash-rich firms that collapses
  // the denominator and inflates ROIC into the hundreds of percent. Negative
  // book equity (heavy buybacks) makes book ROIC undefined → leave it null.
  if (f.operatingIncome != null && f.equity > 0) {
    const nopat = f.operatingIncome * 0.79;
    const invested = f.totalDebt + f.equity;
    if (invested > 0) out.roic = round((nopat / invested) * 100, 1);
  }

  // Revenue growth (YoY) — more stable than earnings growth and harder to
  // distort by one-offs, so it also drives PEG (avoids base-effect spikes).
  if (f.revenue && f.priorRevenue && f.priorRevenue > 0) {
    const growth = (f.revenue - f.priorRevenue) / f.priorRevenue;
    out.revenueGrowth = round(growth, 2);
    if (out.peRatio && growth > 0) {
      out.pegRatio = round(out.peRatio / (growth * 100), 2);
    }
  }

  // Financial-company metrics (replaces FCF yield + ROIC which break for banks)
  // P/B = market cap / book equity — buying below book value is a classic signal
  if (f.equity > 0 && marketCap) {
    out.pb = round(marketCap / f.equity, 2);
  }
  // ROE = net income / equity — the standard bank efficiency metric
  if (f.netIncome != null && f.equity > 0) {
    out.roe = round((f.netIncome / f.equity) * 100, 1);
  }

  return out;
}

function round(n, dp = 1) {
  if (n == null || !isFinite(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
