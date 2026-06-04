import Tooltip from './Tooltip';

const SECTORS = ['Technology', 'Semiconductors', 'Health Care', 'Biotechnology', 'Energy', 'Financial Services', 'Retail', 'Aerospace & Defense', 'Electrical Equipment', 'Machinery', 'Media', 'Communications', 'Utilities', 'Real Estate', 'Chemicals', 'Beverages', 'Pharmaceuticals'];

const NumField = ({ label, k, filters, set, placeholder, step, hint }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-slate-500 whitespace-nowrap">{label}</label>
    <input
      type="number"
      step={step}
      placeholder={hint ?? placeholder}
      value={filters[k] ?? ''}
      onChange={e => set(k, e.target.value)}
      className="w-20 text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--pomelo)]"
    />
  </div>
);

const SectionTooltip = ({ content }) => (
  <Tooltip content={content}>
    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 hover:text-slate-200 transition-colors cursor-help">?</span>
  </Tooltip>
);

const EDGAR_TOOLTIP = (
  <div className="space-y-3 normal-case font-normal tracking-normal">
    <p className="text-slate-300 font-medium">EDGAR Pre-screen</p>
    <p className="text-slate-400 text-xs leading-relaxed">
      Filters the full 2,900+ company universe using SEC filing data — free, instant, no pricing needed.
      These are quality gates: only companies that pass get priced and scored.
    </p>
    <div className="space-y-2 text-xs">
      {[
        { field: 'Min ROIC %', start: '15%', loose: '5%', strict: '25%', why: 'Return on invested capital. 15% = earns above cost of capital. Loosen to 5% to see turnaround stories. Raise to 25%+ for elite compounders only.' },
        { field: 'Min growth', start: '0.10', loose: 'remove', strict: '0.20', why: 'YoY revenue growth. 0.1 = 10% minimum. Remove entirely in bear markets — many undervalued companies grow slowly. Great for finding stable, cheap businesses.' },
        { field: 'Max debt/EBITDA', start: '3.0', loose: '5.0', strict: '1.5', why: 'How many years of earnings to repay debt. Under 3x is safe for most businesses. Raise to 5x for capital-intensive industries. Drop to 1.5x for fortress balance sheets.' },
        { field: 'Min size', start: '$2B+', loose: 'Any', strict: '$10B+', why: 'Market cap floor. $2B+ removes micro-cap noise. "Any" surfaces hidden small-cap gems. $10B+ keeps only large institutional-grade companies.' },
      ].map(({ field, start, loose, strict, why }) => (
        <div key={field} className="border-t border-slate-700/50 pt-2">
          <p className="text-slate-200 font-medium">{field}</p>
          <p className="text-slate-400 mt-0.5">{why}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-slate-500">Start: <span className="text-slate-300">{start}</span></span>
            <span className="text-slate-500">Loose: <span className="text-emerald-400">{loose}</span></span>
            <span className="text-slate-500">Strict: <span className="text-[var(--pomelo)]">{strict}</span></span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LIVE_TOOLTIP = (
  <div className="space-y-3 normal-case font-normal tracking-normal">
    <p className="text-slate-300 font-medium">Live Valuation</p>
    <p className="text-slate-400 text-xs leading-relaxed">
      Applied after pricing. These trim the scored candidates — but in today's stretched market,
      strict valuation filters can eliminate every company. Consider removing them and letting the
      score ranking surface the best opportunities.
    </p>
    <div className="space-y-2 text-xs">
      {[
        { field: 'Max P/E', start: 'remove', loose: '40', strict: '20', why: 'Trailing price-to-earnings. Removing this in a bull market (Shiller P/E ~41) lets quality companies through. Try 40x as a loose cap. 20x is very strict — catches deep value only.' },
        { field: 'Max PEG', start: 'remove', loose: '2.0', strict: '1.0', why: 'P/E divided by growth rate. PEG < 1 is textbook cheap. But removing it entirely often surfaces the most interesting companies — let the full score do the ranking instead.' },
        { field: 'Sector', start: 'All', loose: 'All', strict: 'pick one', why: 'Filter to a specific sector when you\'re doing focused research. "All" gives the broadest view ranked by score.' },
        { field: 'Candidates', start: '40', loose: '160', strict: '40', why: 'How many top-scoring companies to show. All are scored first, then trimmed. 40 is fast and focused. 160 surfaces more opportunities but takes longer to browse.' },
      ].map(({ field, start, loose, strict, why }) => (
        <div key={field} className="border-t border-slate-700/50 pt-2">
          <p className="text-slate-200 font-medium">{field}</p>
          <p className="text-slate-400 mt-0.5">{why}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-slate-500">Start: <span className="text-slate-300">{start}</span></span>
            <span className="text-slate-500">Loose: <span className="text-emerald-400">{loose}</span></span>
            <span className="text-slate-500">Strict: <span className="text-[var(--pomelo)]">{strict}</span></span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function FilterBar({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value === '' ? undefined : value });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs text-[var(--pomelo)] uppercase tracking-wider font-medium flex items-center">
          EDGAR pre-screen
          <SectionTooltip content={EDGAR_TOOLTIP} />
        </span>
        <NumField label="Min ROIC %" k="minROIC" filters={filters} set={set} hint="e.g. 15" />
        <NumField label="Min growth" k="minGrowth" filters={filters} set={set} hint="e.g. 0.1" step="0.05" />
        <NumField label="Max debt/EBITDA" k="maxDebtToEbitda" filters={filters} set={set} hint="e.g. 3" step="0.5" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Min size</label>
          <select
            value={filters.minMktCap ?? ''}
            onChange={e => set('minMktCap', e.target.value)}
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--pomelo)]"
          >
            <option value="">Any</option>
            <option value="300000000">$300M+</option>
            <option value="2000000000">$2B+</option>
            <option value="10000000000">$10B+</option>
            <option value="50000000000">$50B+</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs text-emerald-400 uppercase tracking-wider font-medium flex items-center">
          Live valuation
          <SectionTooltip content={LIVE_TOOLTIP} />
        </span>
        <NumField label="Max P/E" k="maxPE" filters={filters} set={set} hint="e.g. 25" />
        <NumField label="Max PEG" k="maxPEG" filters={filters} set={set} hint="e.g. 1" step="0.1" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Sector</label>
          <select
            value={filters.sector ?? ''}
            onChange={e => set('sector', e.target.value)}
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--pomelo)]"
          >
            <option value="">All</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Candidates</label>
          <select
            value={filters.limit ?? '40'}
            onChange={e => set('limit', e.target.value)}
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--pomelo)]"
          >
            <option value="40">40</option>
            <option value="80">80</option>
            <option value="160">160</option>
          </select>
        </div>

        {Object.keys(filters).some(k => filters[k] != null) && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
