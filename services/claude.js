import Anthropic from '@anthropic-ai/sdk';

// Pure BYOK: the Anthropic key is provided per-request by the caller.
const SYSTEM = `You are a strict financial analyst specializing in equity research from a value investing perspective.
You score companies on qualitative factors based on SEC filings and public information.
You are deliberately skeptical — most companies do NOT deserve top scores.
Use the full 0-1-2 range. A score of 2 should be rare and reserved for genuinely exceptional cases.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

export async function scoreQualitative(ticker, companyName, riskText, apiKey) {
  if (!apiKey) {
    const e = new Error('Claude qualitative scoring unavailable — add your Anthropic key');
    e.code = 'NO_CLAUDE_KEY';
    throw e;
  }
  const client = new Anthropic({ apiKey });
  const context = riskText
    ? `SEC 10-K Risk Factors excerpt:\n${riskText}`
    : `Company: ${companyName} (${ticker}). Use your training knowledge to assess this company.`;

  const prompt = `Score ${companyName} (${ticker}) on four qualitative dimensions from a strict Buffett-style value investing perspective.

Return JSON with this exact structure:
{
  "moat": {
    "score": <0|1|2>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  },
  "durability": {
    "score": <0|1|2>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  },
  "management": {
    "score": <0|1>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  },
  "simplicity": {
    "score": <0|1>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  }
}

CRITICAL: Most companies score 1 on moat and durability, and 0 on management and simplicity. A score of 2 is rare and requires specific named evidence — absence of problems is not excellence. Be strict.

MOAT (0–2 pts) — Does this business have durable pricing power?
  2 = RARE. Proven pricing power: raises prices without losing customers. Network effects, regulatory moats, or irreplaceable position. Examples: Visa, Moody's, Coca-Cola. The test: could a well-funded competitor take 20% share in 5 years? If yes → 1.
  1 = Some advantages but real competition limits pricing power. Most good businesses score here — software, industrials, retail, consulting, IT services.
  0 = Commoditized, easily disrupted, or customer-concentrated. No real pricing power.

DURABILITY (0–2 pts) — Will this business look the same in 10 years?
  2 = RARE. Resistant to disruption. Essential, habitual, or structurally protected. Examples: insurance, consumer staples with strong brands, toll infrastructure.
  1 = Will likely survive but requires adaptation. Technology shifts, new competitors, or evolving customer behavior are real. Most tech, services, and industrial companies.
  0 = Actively disrupted or in structural decline. Going-concern language, legacy model being replaced.

MANAGEMENT (0–1 pt) — Has management demonstrated exceptional capital allocation?
  1 = Specific evidence of above-average judgment: smart acquisitions at great prices that created real value, buybacks demonstrably below intrinsic value, founder-led with significant ownership. Standard dividends and buybacks alone are NOT enough for a 1.
  0 = Ordinary or worse. Standard governance, no evidence of exceptional timing. Most public company management teams score 0.

SIMPLICITY (0–1 pt) — Can a generalist understand and predict this business?
  1 = Non-specialist can understand the model, predict revenues, and assess threats without domain expertise. Examples: consumer brands, insurance, simple industrials.
  0 = Requires specialized knowledge: biotech, semiconductors, complex financials, conglomerates, or businesses where 3-year revenue is genuinely unpredictable.

ABSOLUTE RULES:
- Filing mentions "intense competition" or "pricing pressure" → moat ≤ 1
- Professional services / consulting / IT services / staffing → moat = 1 (people leave, no durable moat)
- Standard dividends + buybacks as primary capital activity → management = 0
- Any going-concern language → durability = 0
- A 2 needs a specific named reason. Absence of problems is not excellence.

${context}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  // Strip ```json … ``` fences if the model added them, then isolate the object
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  const json = start !== -1 && end !== -1 ? unfenced.slice(start, end + 1) : unfenced;
  return JSON.parse(json);
}
