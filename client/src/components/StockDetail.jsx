import { useState, useEffect, useRef } from 'react';
import { qualifyStock } from '../lib/api';
import { METRICS, QUAL_CATEGORIES, scoreColor, isFinancialSector } from '../lib/scoring';
import ScoreBar from './ScoreBar';
import MetricTooltip from './MetricTooltip';

function scoreBarColor(score, max = 2) {
  if (max === 3) return ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-sky-400'][score] ?? 'bg-slate-600';
  return ['bg-red-500', 'bg-yellow-500', 'bg-green-500'][score] ?? 'bg-slate-600';
}

// Scale market cap to T / B / M so small-caps don't round to "$0B".
function fmtMktCap(v) {
  if (!v) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

export default function StockDetail({ stock, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Capture the original table stock once on mount so it's always available
  // as a fallback, even if the qualify response omits price-based fields.
  const baseStock = useRef(stock);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    baseStock.current = stock;
    qualifyStock(stock.symbol)
      .then(setData)
      .catch(e => setError(e.response?.data?.error ?? e.message))
      .finally(() => setLoading(false));
  }, [stock.symbol]);

  // Merge qualify stock with original: prefer qualify values, keep original
  // for any field that qualify returned null (e.g. price not yet cached).
  const s = data?.stock
    ? Object.fromEntries(
        Object.entries(data.stock).map(([k, v]) => [k, v ?? baseStock.current[k]])
      )
    : baseStock.current;
  const qs = data?.quantScores ?? baseStock.current.quantScores;
  const qual = data?.qualScores;
  const scores = data?.scores ?? baseStock.current.scores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{s.symbol}</h2>
            <p className="text-sm text-slate-400">{s.companyName} · {s.sector}</p>
          </div>
          <div className="flex items-center gap-4">
            {scores && (
              <div className="text-right">
                <p className={`text-3xl font-bold ${scoreColor(scores.normalizedScore ?? 0, 100)}`}>
                  {scores.normalizedScore ?? 0}%
                </p>
                <p className="text-xs text-slate-500">{scores.total}/{scores.max ?? 17} pts</p>
                <p className="text-xs text-slate-500">Total Score</p>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Price info */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Price', value: s.price ? `$${s.price.toFixed(2)}` : '—' },
              { label: 'Market Cap', value: fmtMktCap(s.mktCap) },
              { label: 'Rev Growth YoY', value: s.revenueGrowth != null ? `${s.revenueGrowth >= 0 ? '+' : ''}${(s.revenueGrowth * 100).toFixed(0)}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-slate-800/50 p-4 text-center">
                <p className="text-lg font-bold text-slate-100">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Quantitative scores */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Quantitative Metrics</h3>
            <div className="space-y-3 rounded-xl bg-slate-800/30 p-4">
              {METRICS.map(m => {
                const fin = isFinancialSector(s.sector);
                const notApplicable = fin && m.key === 'wholeBusiness';
                let raw, unit, slotMax;
                if (fin) {
                  switch (m.key) {
                    case 'cashQuality':   raw = s.pb;      unit = 'x'; slotMax = 3; break;
                    case 'efficiency':    raw = s.roe;     unit = '%'; slotMax = 2; break;
                    case 'wholeBusiness': raw = null;      unit = null; slotMax = 2; break;
                    case 'growthValue':   raw = s.pegRatio; unit = 'x'; slotMax = 2; break;
                    case 'earningsPrice': raw = s.forwardPE ?? s.peRatio; unit = 'x'; slotMax = 2; break;
                  }
                } else {
                  switch (m.key) {
                    case 'cashQuality':   raw = s.fcfYield;  unit = '%'; slotMax = 3; break;
                    case 'efficiency':    raw = s.roic;      unit = '%'; slotMax = 2; break;
                    case 'wholeBusiness': raw = s.evToEbitda; unit = 'x'; slotMax = 2; break;
                    case 'growthValue':   raw = s.pegRatio;  unit = 'x'; slotMax = 2; break;
                    case 'earningsPrice': raw = s.forwardPE ?? s.peRatio; unit = 'x'; slotMax = 2; break;
                  }
                }
                const sc = qs?.[m.key] ?? 0;
                // Sub-label shows which actual metric is being used
                const subLabel = fin
                  ? (m.financialKey ? m.financialKey.toUpperCase() : 'N/A')
                  : m.nonFinancialKey?.toUpperCase();
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-32 shrink-0 flex items-center">
                      <span>
                        {m.label}
                        <span className="block text-[10px] text-slate-600">{subLabel}</span>
                      </span>
                      <MetricTooltip tooltip={m.tooltip} />
                    </span>
                    <div className="flex-1">
                      {notApplicable
                        ? <div className="h-2 rounded-full bg-slate-800/50" />
                        : <ScoreBar score={sc} max={slotMax} color={scoreBarColor(sc, slotMax)} />
                      }
                    </div>
                    <span className="text-sm text-slate-400 w-16 text-right shrink-0">
                      {notApplicable
                        ? <span className="text-slate-700 text-xs">N/A</span>
                        : (raw != null ? `${raw.toFixed(1)}${unit}` : '—')
                      }
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-slate-700 pt-3">
                <ScoreBar score={scores?.quant ?? 0} max={scores?.maxQuant ?? 11} label="Quant total" color="bg-[var(--pomelo)]" />
              </div>
            </div>
          </div>

          {/* Qualitative scores */}
          {loading && (
            <div className="rounded-xl bg-slate-800/30 p-6 text-center">
              <div className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-2" style={{borderColor:'var(--pomelo)',borderTopColor:'transparent'}} />
              <p className="text-sm text-slate-400">Claude is analyzing SEC filings…</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              Request failed: {error}
            </div>
          )}
          {!loading && data?.qualError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-400">
              {data.qualError}
            </div>
          )}
          {qual && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Qualitative Analysis <span className="font-normal normal-case ml-1" style={{color:'var(--pomelo-rose)'}}>via Claude</span></h3>
              <div className="space-y-4">
                {QUAL_CATEGORIES.map(cat => {
                  const q = qual[cat.key];
                  if (!q) return null;
                  return (
                    <div key={cat.key} className="rounded-xl bg-slate-800/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200 flex items-center">
                          {cat.label}
                          <MetricTooltip tooltip={cat.tooltip} />
                        </span>
                        <ScoreBar score={q.score} max={2} color={scoreBarColor(q.score)} />
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-3">{q.summary}</p>
                      <div className="space-y-1">
                        {q.signals?.map(sig => (
                          <p key={sig} className="text-xs text-slate-500 flex gap-1.5"><span style={{color:'var(--pomelo)'}}>•</span>{sig}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl bg-slate-800/50 p-4">
                  <ScoreBar score={scores?.total ?? 0} max={scores?.max ?? 17} label={`Total score (${scores?.normalizedScore ?? 0}%)`} color={scoreColor(scores?.normalizedScore ?? 0, 100).replace('text-', 'bg-')} />
                </div>
              </div>
            </div>
          )}

          {data?.edgar?.filingUrl && (
            <a
              href={data.edgar.filingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span>📄</span> View SEC 10-K filing used for analysis
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
