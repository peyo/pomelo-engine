import { useState } from 'react';
import MetricTooltip from './MetricTooltip';
import { METRICS, verdict, scoreColor, isFinancialSector } from '../lib/scoring';

// notPriced=true  → company not yet in the price cache  → ⋯
// notPriced=false → priced but metric is undefined       → —
function fmt(v, unit, notPriced = false) {
  if (v == null) {
    return notPriced
      ? <span className="text-slate-600" title="Not yet priced — price job still running">⋯</span>
      : <span className="text-slate-700">—</span>;
  }
  return `${typeof v === 'number' ? v.toFixed(1) : v}${unit ?? ''}`;
}

const DOT_COLORS_3 = ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-sky-400'];
const DOT_COLORS_2 = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];

function ScoreDot({ score, max = 2 }) {
  const color = max === 3
    ? (DOT_COLORS_3[score] ?? 'bg-slate-600')
    : (score / max >= 0.75 ? DOT_COLORS_2[2] : score / max >= 0.4 ? DOT_COLORS_2[1] : DOT_COLORS_2[0]);
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// Maps a sortable column key to the stock object's actual field.
function sortValue(stock, key) {
  if (key === 'normalizedScore') return stock.scores?.normalizedScore;
  // Cash: mixed units (FCF% vs P/B) → sort by score for cross-sector fairness
  if (key === 'cashQuality') return stock.quantScores?.cashQuality;
  // All others: single unit → sort by raw value for granularity within tied scores
  if (key === 'efficiency') return isFinancialSector(stock.sector) ? stock.roe : stock.roic;
  if (key === 'wholeBusiness') return stock.evToEbitda;
  if (key === 'growthValue') return stock.pegRatio;
  if (key === 'earningsPrice') return stock.forwardPE ?? stock.peRatio;
  return stock[key];
}

// Get the raw value and unit for a metric slot based on company type
function slotValue(stock, m) {
  const fin = isFinancialSector(stock.sector);
  if (fin) {
    switch (m.key) {
      case 'cashQuality': return { val: stock.pb, unit: m.financialUnit };
      case 'efficiency': return { val: stock.roe, unit: m.financialUnit };
      case 'wholeBusiness': return { val: null, unit: null }; // n/a for financials
      case 'growthValue': return { val: stock.pegRatio, unit: m.financialUnit };
      case 'earningsPrice': return { val: stock.forwardPE ?? stock.peRatio, unit: m.financialUnit };
    }
  }
  switch (m.key) {
    case 'cashQuality': return { val: stock.fcfYield, unit: m.nonFinancialUnit };
    case 'efficiency': return { val: stock.roic, unit: m.nonFinancialUnit };
    case 'wholeBusiness': return { val: stock.evToEbitda, unit: m.nonFinancialUnit };
    case 'growthValue': return { val: stock.pegRatio, unit: m.nonFinancialUnit };
    case 'earningsPrice': return { val: stock.forwardPE ?? stock.peRatio, unit: m.nonFinancialUnit };
  }
  return { val: null, unit: null };
}

const PRICE_DEPENDENT = new Set(['cashQuality', 'wholeBusiness', 'growthValue', 'earningsPrice']);

export default function StockTable({ stocks, onSelect, loading = false }) {
  const [sort, setSort] = useState({ key: 'normalizedScore', dir: -1 });

  const sorted = [...stocks].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * sort.dir;
  });

  // "Lower is better" columns default to ascending on first click
  const ASCENDING_FIRST = new Set(['wholeBusiness', 'growthValue', 'earningsPrice']);
  const toggleSort = key => {
    setSort(s => s.key === key
      ? { key, dir: -s.dir }
      : { key, dir: ASCENDING_FIRST.has(key) ? 1 : -1 }
    );
  };

  const Th = ({ label, sortKey, tooltip, width }) => (
    <th
      style={width ? { width } : undefined}
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
      onClick={() => sortKey && toggleSort(sortKey)}
    >
      {label}
      {tooltip && <MetricTooltip tooltip={tooltip} />}
      <span className="inline-block w-3 ml-1 text-[var(--pomelo)]">
        {sortKey && sort.key === sortKey ? (sort.dir === -1 ? '↓' : '↑') : ''}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse table-fixed min-w-[1080px]">
        <thead>
          <tr className="border-b border-slate-800">
            <Th label="Company" width="15%" />
            <Th label="Sector" width="10%" />
            <Th label="Score" sortKey="normalizedScore" width="8%" tooltip={{
              what: 'Quantitative score only — based on the 5 financial metrics. The purple +6 shows how many additional points are available from the qualitative analysis (business model, management, industry structure).',
              ranges: [
                { label: '≥ 70%', color: 'green', meaning: 'Attractive' },
                { label: '45–69%', color: 'yellow', meaning: 'Mixed' },
                { label: '< 45%', color: 'red', meaning: 'Weak' },
              ],
              trap: 'Run "Deep dive" on any company to add the qualitative score and see the full picture.',
            }} />
            <Th key="cashQuality"   label="Cash Flow"      sortKey="cashQuality"   tooltip={METRICS[0].tooltip} width="10%" />
            <Th key="efficiency"    label="Efficiency"     sortKey="efficiency"    tooltip={METRICS[1].tooltip} width="10%" />
            <Th key="wholeBusiness" label="Full Price"      sortKey="wholeBusiness" tooltip={METRICS[2].tooltip} width="10%" />
            <Th key="growthValue"   label="Growth Value"   sortKey="growthValue"   tooltip={METRICS[3].tooltip} width="11%" />
            <Th key="earningsPrice" label="Earnings Price" sortKey="earningsPrice" tooltip={METRICS[4].tooltip} width="11%" />
            <Th label="Action" width="8%" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(stock => {
            const v = verdict(stock.scores?.normalizedScore ?? 0);
            return (
              <tr
                key={stock.symbol}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                {/* Company */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {stock.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">{stock.symbol}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">{stock.companyName}</p>
                    </div>
                  </div>
                </td>

                {/* Sector */}
                <td className="px-4 py-4">
                  <span className="text-xs text-slate-400 truncate block max-w-[100px]">
                    {stock.sector ?? '—'}
                  </span>
                </td>

                {/* Score — quant only; qual adds up to 6pts via Deep dive */}
                <td className="px-4 py-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-bold leading-none ${scoreColor(stock.scores?.normalizedScore ?? 0, 100)}`}>
                      {stock.scores?.normalizedScore ?? '—'}%
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {stock.scores?.quant ?? '—'}/{stock.scores?.maxQuant ?? 11}
                      <span className="text-[#7c6ff7]/60 ml-0.5">+6</span>
                    </span>
                  </div>
                </td>

                {/* Metric slots */}
                {METRICS.map(m => {
                  const { val, unit } = slotValue(stock, m);
                  const s = stock.quantScores?.[m.key];
                  const isFinancial = isFinancialSector(stock.sector);
                  const notApplicable = isFinancial && m.key === 'wholeBusiness';
                  const notPriced = PRICE_DEPENDENT.has(m.key) && !stock.hasLiveData && !notApplicable;
                  const isCashQuality = m.key === 'cashQuality';

                  if (loading && PRICE_DEPENDENT.has(m.key) && !notApplicable) {
                    return (
                      <td key={m.key} className="px-4 py-4">
                        <div className="h-3.5 w-12 rounded bg-slate-700/60 animate-pulse" />
                      </td>
                    );
                  }
                  return (
                    <td key={m.key} className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {s != null && !notApplicable && (
                          <ScoreDot score={s} max={isCashQuality ? 3 : 2} />
                        )}
                        <span className="text-sm text-slate-300">
                          {notApplicable
                            ? <span className="text-slate-700" title="Not applicable for financial companies">—</span>
                            : fmt(val, unit, notPriced)
                          }
                        </span>
                      </div>
                    </td>
                  );
                })}

                {/* Action */}
                <td className="px-4 py-4">
                  <button
                    onClick={() => onSelect(stock)}
                    className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pomelo-btn"
                  >
                    Deep dive →
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
