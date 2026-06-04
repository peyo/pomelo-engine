import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Global tracker — only one tooltip open at a time.
let currentClose = null;

export default function Tooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = t.top - tip.height - gap;
    if (top < 8) top = t.bottom + gap;

    let left = t.left + t.width / 2 - tip.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));

    setPos({ top, left });
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        tipRef.current?.contains(e.target)
      ) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => {
    setOpen(false);
    if (currentClose === close) currentClose = null;
  };

  const toggle = (e) => {
    e.stopPropagation();
    if (open) {
      close();
    } else {
      // Close any other open tooltip first
      if (currentClose) currentClose();
      currentClose = close;
      setOpen(true);
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        onClick={toggle}
        className="cursor-help tooltip-trigger"
      >
        {children}
      </span>
      {open && createPortal(
        <div
          ref={tipRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="w-72 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl text-sm text-left text-slate-300"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
