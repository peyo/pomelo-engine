export default function ScoreBar({ score, max, label, color = 'bg-indigo-500' }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-slate-500 w-16 text-right shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12 shrink-0">{score}/{max}</span>
    </div>
  );
}
