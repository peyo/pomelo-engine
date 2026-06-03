import { useState, useEffect, useCallback } from 'react';
import { screenStocks } from '../lib/api';
import StockTable from '../components/StockTable';
import StockDetail from '../components/StockDetail';
import FilterBar from '../components/FilterBar';

export default function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({});
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    screenStocks(filters)
      .then(data => {
        setStocks(data.stocks);
        setUsingMock(data.usingMockData);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-semibold text-slate-100 text-lg">StockScout</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">AI-powered</span>
          </div>
          {usingMock && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
              <span>⚠</span> Demo mode — add FMP_API_KEY for live data
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Stock Discovery Engine</h1>
          <p className="text-slate-500 mt-1">Screen the market quantitatively, then let Claude score business quality from SEC filings.</p>
        </div>

        {/* Score legend */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Attractive', range: '12–16 pts', color: 'border-green-500/30 bg-green-500/10 text-green-400', desc: 'Strong across most dimensions' },
            { label: 'Mixed', range: '7–11 pts', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', desc: 'Strengths offset by real risks' },
            { label: 'Weak', range: '0–6 pts', color: 'border-red-500/30 bg-red-500/10 text-red-400', desc: 'Multiple red flags' },
          ].map(({ label, range, color, desc }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex justify-between items-baseline">
                <p className="font-semibold">{label}</p>
                <p className="text-xs opacity-70">{range}</p>
              </div>
              <p className="text-xs opacity-60 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-slate-800/30 border border-slate-800 p-4">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {/* Table */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">
              {loading ? 'Loading…' : `${stocks.length} companies`}
            </h2>
            <p className="text-xs text-slate-600">Click "Deep dive" to run Claude qualitative analysis</p>
          </div>

          {error && (
            <div className="p-6 text-sm text-red-400 bg-red-500/5 border-b border-red-500/10">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">Screening market…</p>
            </div>
          ) : (
            <StockTable stocks={stocks} onSelect={setSelected} />
          )}
        </div>

        <p className="text-xs text-slate-700 text-center">
          Quantitative scores are automated. Qualitative analysis is AI-generated from public SEC filings.
          This is not financial advice — do your own research before investing.
        </p>
      </main>

      {selected && (
        <StockDetail stock={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
