// Pure BYOK: every API key comes from the request headers the visitor's
// browser sends. The server never falls back to its own keys and never
// persists them — they are used only for the duration of the request.
export function keysFromReq(req) {
  const h = req.headers;
  const clean = v => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s && !s.startsWith('your_') ? s : null;
  };
  return {
    finnhub: clean(h['x-finnhub-key']),
    fmp: clean(h['x-fmp-key']),
    anthropic: clean(h['x-anthropic-key']),
  };
}
