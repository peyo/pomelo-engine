import { useState } from 'react';
import MetricTooltip from './MetricTooltip';
import { METRICS, verdict, scoreColor } from '../lib/scoring';

// notPriced=true  → company not yet in the price cache  → ⋯
// notPriced=false → priced but metric is undefined       → —
function fmt(v, unit, notPriced = false) {
  if (v == null) {
    return notPriced
      ? <span className="text-slate-600" title="Not yet priced — price job still running">⋯</span>
      : <span className="text-slate-700">—</span>;
  }
  return `${typeof v === 'number' ? v.toFixed(1) : v}${unit}`;
}

const DOT_COLORS_3 = ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-sky-400'];
const DOT_COLORS_2 = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];

function ScoreDot({ score, max = 2 }) {
  const color = max === 3
    ? (DOT_COLORS_3[score] ?? 'bg-slate-600')
    : (score / max >= 0.75 ? DOT_COLORS_2[2] : score / max >= 0.4 ? DOT_COLORS_2[1] : DOT_COLORS_2[0]);
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// Maps a sortable column key to the stock object's actual field. Metric keys
// (peg, pe) differ from the data fields (pegRatio, peRatio).
function sortValue(stock, key) {
  if (key === 'total') return stock.scores?.total;
  if (key === 'peg') return stock.pegRatio;
  if (key === 'pe') return stock.forwardPE ?? stock.peRatio;
  return stock[key];
}

// Metrics that depend on live pricing — these shimmer while a screen is loading.
const PRICE_KEYS = new Set(['fcfYield', 'evToEbitda', 'peg', 'pe']);

export default function StockTable({ stocks, onSelect, loading = false }) {
  const [sort, setSort] = useState({ key: 'total', dir: -1 });

  const sorted = [...stocks].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * sort.dir;
  });

  const toggleSort = key => {
    setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: -1 });
  };

  const Th = ({ label, sortKey, tooltip, width }) => (
    <th
      style={width ? { width } : undefined}
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
      onClick={() => sortKey && toggleSort(sortKey)}
    >
      {label}
      {tooltip && <MetricTooltip tooltip={tooltip} />}
      {/* Arrow slot is always present (fixed width) so toggling sort never
          changes column widths. */}
      <span className="inline-block w-3 ml-1 text-indigo-400">
        {sortKey && sort.key === sortKey ? (sort.dir === -1 ? '↓' : '↑') : ''}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse table-fixed min-w-[860px]">
        <thead>
          <tr className="border-b border-slate-800">
            <Th label="Company" width="18%" />
            <Th label="Score" sortKey="total" width="12%" />
            {METRICS.map(m => (
              <Th key={m.key} label={m.label} sortKey={m.key} tooltip={m.tooltip} width="11%" />
            ))}
            <Th label="Action" width="11%" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(stock => {
            const v = verdict(stock.scores?.total ?? 0);
            return (
              <tr
                key={stock.symbol}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {stock.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">{stock.symbol}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[140px]">{stock.companyName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${scoreColor(stock.scores?.total ?? 0, 17)}`}>
                      {stock.scores?.total ?? '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${v.color}`}>
                      {v.label}
                    </span>
                  </div>
                </td>
                {METRICS.map(m => {
                  const raw = m.key === 'pe'
                    ? (stock.forwardPE ?? stock.peRatio)
                    : m.key === 'peg' ? stock.pegRatio
                    : stock[m.key === 'fcfYield' ? 'fcfYield' : m.key === 'evToEbitda' ? 'evToEbitda' : m.key === 'roic' ? 'roic' : m.key];
                  const s = stock.quantScores?.[m.key];
                  const notPriced = PRICE_KEYS.has(m.key) && !stock.hasLiveData;
                  // Shimmer price-dependent cells while a screen request is in flight.
                  if (loading && PRICE_KEYS.has(m.key)) {
                    return (
                      <td key={m.key} className="px-4 py-4">
                        <div className="h-3.5 w-12 rounded bg-slate-700/60 animate-pulse" />
                      </td>
                    );
                  }
                  return (
                    <td key={m.key} className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {s != null && <ScoreDot score={s} max={m.key === 'fcfYield' ? 3 : 2} />}
                        <span className="text-sm text-slate-300">{fmt(raw, m.unit, notPriced)}</span>
                      </div>
                    </td>
                  );
                })}
                <td className="px-4 py-4">
                  <button
                    onClick={() => onSelect(stock)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/30 transition-colors whitespace-nowrap"
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
