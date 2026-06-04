// BYOK key store. Keys live only in this browser's localStorage and are sent
// as request headers to the backend, which uses them per-request and never
// stores them.
const STORAGE_KEY = 'stockscout.keys';

const FIELDS = [
  { id: 'finnhub', label: 'Finnhub API key', header: 'x-finnhub-key',
    help: 'Live pricing (recommended). Free at finnhub.io — 60 calls/min, no daily cap.',
    url: 'https://finnhub.io/register' },
  { id: 'anthropic', label: 'Anthropic API key', header: 'x-anthropic-key',
    help: 'Powers Claude qualitative deep-dives. Get one at console.anthropic.com.',
    url: 'https://console.anthropic.com/settings/keys' },
  { id: 'fmp', label: 'FMP API key (optional)', header: 'x-fmp-key',
    help: 'Fallback pricing if you don\'t use Finnhub. Free tier is ~250 calls/day.',
    url: 'https://site.financialmodelingprep.com/developer/docs' },
];

export const KEY_FIELDS = FIELDS;

export function getKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
}

export function setKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearKeys() {
  localStorage.removeItem(STORAGE_KEY);
}

// Map stored keys → request headers (omitting blanks).
export function keyHeaders() {
  const keys = getKeys();
  const headers = {};
  for (const f of FIELDS) {
    const v = (keys[f.id] ?? '').trim();
    if (v) headers[f.header] = v;
  }
  return headers;
}

export function hasPricingKey() {
  const k = getKeys();
  return Boolean((k.finnhub ?? '').trim() || (k.fmp ?? '').trim());
}

export function hasAnthropicKey() {
  return Boolean((getKeys().anthropic ?? '').trim());
}
