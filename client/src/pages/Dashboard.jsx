import { useState, useEffect, useCallback, useRef } from 'react';
import { screenStocks, getStatus } from '../lib/api';
import StockTable from '../components/StockTable';
import StockDetail from '../components/StockDetail';
import FilterBar from '../components/FilterBar';
import Tooltip from '../components/Tooltip';
import SettingsModal from '../components/SettingsModal';
import IngestBanner from '../components/IngestBanner';
import { hasPricingKey, hasAnthropicKey } from '../lib/keys';

function UniverseTooltip({ count }) {
  return (
    <Tooltip
      content={
        <div className="space-y-3 normal-case font-normal tracking-normal">
          <p className="text-slate-300 leading-relaxed">How we get to this universe:</p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-slate-500 shrink-0">~10,365</span>
              <span className="text-slate-400">all SEC filers with a ticker — the raw starting list.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500 shrink-0">4–6k</span>
              <span className="text-slate-400">US-listed operating companies (NYSE + Nasdaq), once you strip out funds, ETFs, SPACs, and foreign issuers.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 shrink-0 font-medium">{count.toLocaleString()}</span>
              <span className="text-slate-400">
                what we keep: US domestic filers that file a <strong className="text-slate-200">10-K</strong> and report
                both <strong className="text-slate-200">net income</strong> and <strong className="text-slate-200">operating income</strong> in
                their latest annual filing — i.e. real operating companies with usable financials.
              </span>
            </li>
          </ul>
          <p className="text-xs text-slate-500 border-t border-slate-700 pt-2">
            This long tail includes many small- and micro-caps, so it's larger than the "investable" set most people picture.
          </p>
        </div>
      }
    >
      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 hover:text-slate-200 transition-colors align-middle">?</span>
    </Tooltip>
  );
}

function FunnelTooltip({ count, shown, limit }) {
  return (
    <Tooltip
      content={
        <div className="space-y-3 normal-case font-normal tracking-normal">
          <p className="text-slate-300 leading-relaxed">
            How the list narrows from the full universe down to what you see:
          </p>
          <ol className="space-y-2">
            <li className="flex gap-2">
              <span className="text-indigo-400 font-semibold">1.</span>
              <span className="text-slate-400">
                <strong className="text-slate-200">{count.toLocaleString()} companies</strong> in the
                universe — every US domestic 10-K filer with usable fundamentals, pre-computed from SEC EDGAR.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-semibold">2.</span>
              <span className="text-slate-400">
                <strong className="text-slate-200">EDGAR pre-screen</strong> — filters on price-independent
                metrics (ROIC, earnings growth, debt/EBITDA). No API cost, runs across the whole universe.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-semibold">3.</span>
              <span className="text-slate-400">
                Survivors are ranked by ROIC and the <strong className="text-slate-200">top {limit}</strong> are
                kept (adjustable via <strong className="text-slate-200">Candidates</strong>) — this cap keeps us
                within the free pricing-API rate limit.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-semibold">4.</span>
              <span className="text-slate-400">
                <strong className="text-slate-200">Live enrichment</strong> — only those 40 get a live
                price/market-cap lookup, used to compute P/E, EV/EBITDA, PEG and FCF yield.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-semibold">5.</span>
              <span className="text-slate-400">
                Your <strong className="text-slate-200">live-valuation filters</strong> (Max P/E, Max PEG,
                Sector) then trim further, leaving the <strong className="text-slate-200">{shown}</strong> shown.
              </span>
            </li>
          </ol>
          <p className="text-xs text-slate-500 border-t border-slate-700 pt-2">
            Tighten the EDGAR pre-screen to change which companies reach the top-40 enrichment step.
          </p>
        </div>
      }
    >
      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 hover:text-slate-200 transition-colors align-middle">?</span>
    </Tooltip>
  );
}

export default function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ minROIC: 15, limit: 40 });
  const [meta, setMeta] = useState({ count: 0, livePricing: true, universeReady: true, rateLimited: false, stale: false });
  const [showSettings, setShowSettings] = useState(false);
  const [pricingKey, setPricingKey] = useState(hasPricingKey());
  const [anthropicKey, setAnthropicKey] = useState(hasAnthropicKey());

  const [ingest, setIngest] = useState({ running: false });
  const wasRunning = useRef(false);

  const refreshKeyState = () => {
    setPricingKey(hasPricingKey());
    setAnthropicKey(hasAnthropicKey());
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    screenStocks(filters)
      .then(data => {
        setStocks(data.stocks);
        setMeta({
          count: data.count ?? 0,
          livePricing: data.livePricing ?? false,
          universeReady: data.universeReady ?? false,
          rateLimited: data.rateLimited ?? false,
          stale: data.stale ?? false,
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Poll ingest status: fast while a build is running, slow otherwise.
  // When a build transitions from running → done, auto-refresh the screen.
  useEffect(() => {
    let timer;
    const poll = async () => {
      try {
        const { ingest: ing } = await getStatus();
        setIngest(ing);
        if (wasRunning.current && !ing.running) load(); // build just finished
        wasRunning.current = ing.running;
        timer = setTimeout(poll, ing.running ? 3000 : 20000);
      } catch {
        timer = setTimeout(poll, 20000);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [load]);

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
          <div className="flex items-center gap-3">
            {meta.count > 0 && (
              <span className="text-xs text-slate-500 flex items-center">
                {meta.count.toLocaleString()} companies in universe
                <UniverseTooltip count={meta.count} />
              </span>
            )}
            {!meta.universeReady && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
                <span>⚠</span> Universe empty — run <code className="text-amber-300">node scripts/ingest.js</code>
              </div>
            )}
            {meta.livePricing && meta.rateLimited && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
                <span>⚠</span> Pricing rate limit reached — showing cached prices where available
              </div>
            )}
            {meta.livePricing && !meta.rateLimited && meta.stale && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/30 border border-slate-700 px-3 py-1.5 rounded-lg">
                <span>◷</span> Some prices served from cache
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="relative flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>⚙</span> Keys
              {!pricingKey && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900" title="No pricing key set" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Stock Discovery Engine</h1>
          <p className="text-slate-500 mt-1">Screens the full SEC universe on fundamentals from EDGAR filings + live pricing, then lets Claude score business quality from 10-K risk factors.</p>
        </div>

        {/* Universe build progress */}
        <IngestBanner ingest={ingest} />

        {/* First-run key prompt */}
        {!pricingKey && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-200">Add your API keys to see live valuations</p>
              <p className="text-xs text-indigo-300/70 mt-0.5">
                EDGAR fundamentals (ROIC, growth) work without keys. Add a free Finnhub key for live pricing,
                and an Anthropic key for Claude deep-dives. Your keys stay in your browser.
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="shrink-0 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
            >
              Add keys
            </button>
          </div>
        )}

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
            <h2 className="font-semibold text-slate-200 flex items-center">
              {`${stocks.length} companies`}
              <FunnelTooltip count={meta.count} shown={stocks.length} limit={Number(filters.limit ?? 40)} />
            </h2>
            <p className="text-xs text-slate-600">Click "Deep dive" to run Claude qualitative analysis</p>
          </div>

          {error && (
            <div className="p-6 text-sm text-red-400 bg-red-500/5 border-b border-red-500/10">
              Error: {error}
            </div>
          )}

          {loading && stocks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">Screening market…</p>
            </div>
          ) : (
            <StockTable stocks={stocks} onSelect={setSelected} loading={loading} />
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

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => { refreshKeyState(); load(); }}
        />
      )}
    </div>
  );
}
