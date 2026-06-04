// Shown while a long-running build job is in progress, so users understand why
// data may be sparse and the dataset is still filling in.
export default function IngestBanner({ status, title, note, unit = 'filers' }) {
  if (!status?.running) return null;
  const { done = 0, total = 0, etaSec } = status;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const eta = etaSec != null ? `~${Math.ceil(etaSec / 60)} min left` : null;

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-indigo-200 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          {title}
        </p>
        <p className="text-xs text-indigo-300/70">
          {done.toLocaleString()} / {total.toLocaleString()} {unit}{eta ? ` · ${eta}` : ''}
        </p>
      </div>
      <div className="h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="text-xs text-indigo-300/60 mt-1.5">{note}</p>}
    </div>
  );
}
