const SECTORS = ['Technology', 'Industrials', 'Healthcare', 'Financial Services', 'Energy', 'Consumer Cyclical', 'Consumer Defensive', 'Communication Services', 'Basic Materials', 'Real Estate', 'Utilities'];

const NumField = ({ label, k, filters, set, placeholder, step }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-slate-500 whitespace-nowrap">{label}</label>
    <input
      type="number"
      step={step}
      placeholder={placeholder}
      value={filters[k] ?? ''}
      onChange={e => set(k, e.target.value)}
      className="w-20 text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
    />
  </div>
);

export default function FilterBar({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value === '' ? undefined : value });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs text-indigo-400 uppercase tracking-wider font-medium">EDGAR pre-screen</span>
        <NumField label="Min ROIC %" k="minROIC" filters={filters} set={set} placeholder="15" />
        <NumField label="Min growth" k="minGrowth" filters={filters} set={set} placeholder="0.1" step="0.05" />
        <NumField label="Max debt/EBITDA" k="maxDebtToEbitda" filters={filters} set={set} placeholder="3" step="0.5" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs text-emerald-400 uppercase tracking-wider font-medium">Live valuation</span>
        <NumField label="Max P/E" k="maxPE" filters={filters} set={set} placeholder="25" />
        <NumField label="Max PEG" k="maxPEG" filters={filters} set={set} placeholder="1" step="0.1" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Sector</label>
          <select
            value={filters.sector ?? ''}
            onChange={e => set('sector', e.target.value)}
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
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
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
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
