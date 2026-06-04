import { useState } from 'react';
import { KEY_FIELDS, getKeys, setKeys, clearKeys } from '../lib/keys';

export default function SettingsModal({ onClose, onSaved }) {
  const [values, setValues] = useState(() => getKeys());
  const [reveal, setReveal] = useState({});

  const save = () => {
    setKeys(values);
    onSaved?.();
    onClose();
  };

  const clear = () => {
    clearKeys();
    setValues({});
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">API Keys</h2>
            <p className="text-xs text-slate-500">Bring your own keys — stored only in this browser</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {KEY_FIELDS.map(f => (
            <div key={f.id}>
              <label className="flex items-center justify-between text-sm font-medium text-slate-200 mb-1">
                {f.label}
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs font-normal hover:opacity-80 transition-opacity" style={{color:'var(--pomelo)'}}>Get key →</a>
              </label>
              <div className="relative">
                <input
                  type={reveal[f.id] ? 'text' : 'password'}
                  value={values[f.id] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                  placeholder="Paste key…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 pr-16 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setReveal(r => ({ ...r, [f.id]: !r[f.id] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  {reveal[f.id] ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{f.help}</p>
            </div>
          ))}

          <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-xs text-slate-400 leading-relaxed mb-3">
            <strong className="text-slate-300">What's included vs. what you bring:</strong> company fundamentals
            and market pricing are provided by this app — screening works with no keys. You only need your own
            <strong className="text-slate-300"> Anthropic key</strong> to run Claude's AI deep-dives.
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300/90 leading-relaxed">
            <strong className="text-amber-300">How your keys are handled:</strong> they are saved only in this
            browser (localStorage) and sent with each request to this app's server, which uses them to call
            the provider on your behalf for that request only. The server does not log or store them.
            Anyone with access to this browser can read them — clear them when you're done on a shared device.
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <button onClick={clear} className="text-sm text-slate-500 hover:text-red-400 transition-colors">Clear all keys</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button onClick={save} className="text-sm px-4 py-2 rounded-lg font-medium pomelo-btn-solid">Save keys</button>
          </div>
        </div>
      </div>
    </div>
  );
}
