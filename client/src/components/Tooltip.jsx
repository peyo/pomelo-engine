import { useState } from 'react';

export default function Tooltip({ content, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="cursor-help"
      >
        {children}
      </span>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl text-sm text-left">
          {content}
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r border-slate-700 bg-slate-900" />
        </div>
      )}
    </span>
  );
}
