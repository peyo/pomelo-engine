import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);

  // Position the tooltip relative to the trigger once it's rendered.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const gap = 8;

    // Prefer above; flip below if it would clip the top of the viewport.
    let placement = 'top';
    let top = t.top - tip.height - gap;
    if (top < 8) {
      placement = 'bottom';
      top = t.bottom + gap;
    }

    // Center horizontally, clamped to the viewport.
    let left = t.left + t.width / 2 - tip.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));

    setPos({ top, left, placement });
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="cursor-help"
      >
        {children}
      </span>
      {open && createPortal(
        <div
          ref={tipRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="w-72 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl text-sm text-left text-slate-300 pointer-events-none"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
