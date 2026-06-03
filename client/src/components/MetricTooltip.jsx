import Tooltip from './Tooltip';

const colorDot = { green: 'bg-green-400', yellow: 'bg-yellow-400', red: 'bg-red-400' };

function MetricContent({ t }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-300 leading-relaxed">{t.what}</p>
      {t.formula && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Formula</p>
          <code className="text-xs text-indigo-300 bg-slate-800 px-2 py-1 rounded">{t.formula}</code>
        </div>
      )}
      {t.ranges && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ranges</p>
          <div className="space-y-1">
            {t.ranges.map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorDot[r.color]}`} />
                <span className="text-slate-400"><strong className="text-slate-200">{r.label}</strong> — {r.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {t.signals && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Key Signals</p>
          <ul className="space-y-1">
            {t.signals.map(s => (
              <li key={s} className="text-slate-400 flex gap-1"><span>•</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
      )}
      {t.trap && (
        <div className="border-t border-slate-700 pt-2">
          <p className="text-xs text-amber-400"><strong>Watch out:</strong> {t.trap}</p>
        </div>
      )}
      {t.source && (
        <p className="text-xs text-slate-600">Source: {t.source}</p>
      )}
    </div>
  );
}

export default function MetricTooltip({ tooltip }) {
  return (
    <Tooltip content={<MetricContent t={tooltip} />}>
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 hover:text-slate-200 transition-colors">?</span>
    </Tooltip>
  );
}
