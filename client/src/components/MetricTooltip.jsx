import Tooltip from './Tooltip';

const colorDot = {
  sky: 'bg-sky-400',
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

function RangeList({ ranges }) {
  if (!ranges?.length) return null;
  return (
    <ul className="space-y-1 mt-1">
      {ranges.map(r => (
        <li key={r.label} className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot[r.color] ?? 'bg-slate-500'}`} />
          <span className="text-slate-400"><span className="text-slate-200 font-medium">{r.label}</span> — {r.meaning}</span>
        </li>
      ))}
    </ul>
  );
}

function SlotSection({ title, data }) {
  if (!data) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-[var(--pomelo)] uppercase tracking-wider">{title}: {data.metric}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{data.what}</p>
      {data.formula && data.formula !== '—' && (
        <p className="text-xs text-slate-500 font-mono">{data.formula}</p>
      )}
      <RangeList ranges={data.ranges} />
    </div>
  );
}

function MetricContent({ t }) {
  const isDual = Boolean(t.nonFinancial || t.financial);

  if (isDual) {
    return (
      <div className="space-y-3">
        <p className="text-slate-300 leading-relaxed text-xs">{t.what}</p>
        <SlotSection title="Operating companies" data={t.nonFinancial} />
        <SlotSection title="Financial companies" data={t.financial} />
        {t.trap && (
          <p className="text-xs text-amber-400/80 border-t border-slate-700 pt-2">
            ⚠ {t.trap}
          </p>
        )}
      </div>
    );
  }

  // Legacy single-metric tooltip format
  return (
    <div className="space-y-2">
      {t.header && <p className="text-xs font-semibold text-[var(--pomelo)] uppercase tracking-wider">{t.header}</p>}
      {t.what && <p className="text-slate-300 leading-relaxed text-xs">{t.what}</p>}
      {t.formula && <p className="text-xs text-slate-500 font-mono">{t.formula}</p>}
      {t.ranges && <RangeList ranges={t.ranges} />}
      {t.trap && (
        <p className="text-xs text-amber-400/80 border-t border-slate-700 pt-2">⚠ {t.trap}</p>
      )}
      {t.source && <p className="text-xs text-slate-600">Source: {t.source}</p>}
    </div>
  );
}

export default function MetricTooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <Tooltip content={<MetricContent t={tooltip} />}>
      <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[10px] hover:bg-slate-600 hover:text-slate-200 transition-colors cursor-help align-middle">?</span>
    </Tooltip>
  );
}
