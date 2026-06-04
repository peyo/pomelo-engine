import { useState, useEffect } from 'react';
import { qualifyStock } from '../lib/api';
import { METRICS, QUAL_CATEGORIES, scoreColor } from '../lib/scoring';
import ScoreBar from './ScoreBar';
import MetricTooltip from './MetricTooltip';

const scoreBarColor = score => ['bg-red-500', 'bg-yellow-500', 'bg-green-500'][score] ?? 'bg-slate-600';

export default function StockDetail({ stock, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    qualifyStock(stock.symbol)
      .then(setData)
      .catch(e => setError(e.response?.data?.error ?? e.message))
      .finally(() => setLoading(false));
  }, [stock.symbol]);

  const s = data?.stock ?? stock;
  const qs = data?.quantScores ?? stock.quantScores;
  const qual = data?.qualScores;
  const scores = data?.scores ?? stock.scores;

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
                <p className={`text-3xl font-bold ${scoreColor(scores.total, 16)}`}>{scores.total}<span className="text-lg text-slate-500">/16</span></p>
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
              { label: 'Market Cap', value: s.mktCap ? `$${(s.mktCap / 1e9).toFixed(0)}B` : '—' },
              { label: 'Rev Growth YoY', value: s.revenueGrowth != null ? `+${(s.revenueGrowth * 100).toFixed(0)}%` : '—' },
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
                const raw = m.key === 'pe'
                  ? (s.forwardPE ?? s.peRatio)
                  : m.key === 'peg' ? s.pegRatio
                  : s[m.key];
                const sc = qs?.[m.key] ?? 0;
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-24 shrink-0 flex items-center">
                      {m.label}
                      <MetricTooltip tooltip={m.tooltip} />
                    </span>
                    <div className="flex-1">
                      <ScoreBar score={sc} max={2} color={scoreBarColor(sc)} />
                    </div>
                    <span className="text-sm text-slate-400 w-16 text-right shrink-0">
                      {raw != null ? `${raw.toFixed(1)}${m.unit}` : '—'}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-slate-700 pt-3">
                <ScoreBar score={scores?.quant ?? 0} max={10} label="Quant total" color="bg-indigo-500" />
              </div>
            </div>
          </div>

          {/* Qualitative scores */}
          {loading && (
            <div className="rounded-xl bg-slate-800/30 p-6 text-center">
              <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
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
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Qualitative Analysis <span className="text-indigo-400 font-normal normal-case ml-1">via Claude</span></h3>
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
                          <p key={sig} className="text-xs text-slate-500 flex gap-1.5"><span className="text-indigo-400">•</span>{sig}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl bg-slate-800/50 p-4">
                  <ScoreBar score={scores?.total ?? 0} max={16} label="Total score" color={scoreColor(scores?.total ?? 0, 16).replace('text-', 'bg-')} />
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
