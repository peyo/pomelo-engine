const SECTORS = ['Technology', 'Industrials', 'Healthcare', 'Financials', 'Energy', 'Consumer Discretionary'];

export default function FilterBar({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value || undefined });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-slate-500 uppercase tracking-wider">Filter</span>

      <select
        value={filters.sector ?? ''}
        onChange={e => set('sector', e.target.value)}
        className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
      >
        <option value="">All sectors</option>
        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Max P/E</label>
        <input
          type="number"
          placeholder="e.g. 30"
          value={filters.maxPE ?? ''}
          onChange={e => set('maxPE', e.target.value)}
          className="w-20 text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Max PEG</label>
        <input
          type="number"
          placeholder="e.g. 1"
          step="0.1"
          value={filters.maxPEG ?? ''}
          onChange={e => set('maxPEG', e.target.value)}
          className="w-20 text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Min ROIC %</label>
        <input
          type="number"
          placeholder="e.g. 15"
          value={filters.minROIC ?? ''}
          onChange={e => set('minROIC', e.target.value)}
          className="w-20 text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {Object.keys(filters).some(k => filters[k]) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
