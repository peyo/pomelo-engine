// Centralized env loader. Must be imported before any module that reads
// process.env at load time (e.g. the Anthropic/FMP clients).
//
// override: true is required because the surrounding shell may export an
// empty ANTHROPIC_API_KEY, and plain dotenv won't replace a var that is
// already defined. On Vercel there is no .env file, so this is a no-op and
// the platform-injected vars are used as-is.
import dotenv from 'dotenv';

dotenv.config({ override: true });
