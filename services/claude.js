import Anthropic from '@anthropic-ai/sdk';

// Pure BYOK: the Anthropic key is provided per-request by the caller.
const SYSTEM = `You are a hyper-conservative value investing analyst in the tradition of Benjamin Graham and Warren Buffett.
Your job is to protect capital, not find reasons to invest. When in doubt, score 0.
The default score for every dimension is 0. Points are only awarded when there is clear, specific, named evidence of genuine quality.
Most companies score 0 on most dimensions. A score of 2 is extremely rare — fewer than 5% of public companies deserve it.
You are looking for reasons NOT to invest. Flag every risk. Do not rationalize weaknesses as acceptable.
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

DEFAULT: Every dimension starts at 0. You must find specific, named, positive evidence to award any points. If you are unsure, score 0.

MOAT (0–2 pts) — Can this business raise prices every year without losing customers?
  0 = DEFAULT. Any competition, pricing pressure, substitutes, or low switching costs = 0. This includes virtually all technology, services, retail, industrials, and consumer companies. If the 10-K mentions "competitive" or "pricing pressure" anywhere = 0.
  1 = Demonstrated pricing power with specific evidence: has actually raised prices repeatedly, customers cannot easily switch, or regulatory/network protection. Must cite specific named evidence from filings.
  2 = EXTREMELY RARE (<5% of companies). Monopoly or near-monopoly with irreplaceable position. Network effects so strong competitors cannot enter. Examples: Visa/Mastercard duopoly, Moody's/S&P regulatory duopoly, Coca-Cola 100-year brand. If you are debating between 1 and 2, score 1.

DURABILITY (0–2 pts) — Is this business model safe from disruption for the next 10 years?
  0 = DEFAULT. Any technology disruption risk, platform/OS competition, AI automation threat, or structural industry change = 0. Consumer tech, IT services, media, traditional retail = 0. If a large platform (Google, Apple, Microsoft, Amazon) offers a competing product for free = 0.
  1 = Business provides something essential that technology cannot easily replace. Long-term contracts, regulatory requirements, or physical infrastructure. Must cite specific evidence.
  2 = EXTREMELY RARE. Business is essentially immune to disruption — people will need this in 20 years regardless of technology. Examples: water utilities, essential insurance, funeral services, government-mandated services.

MANAGEMENT (0–1 pt) — Has management made demonstrably great capital allocation decisions?
  0 = DEFAULT. Standard dividends, routine buybacks, normal acquisitions at market prices = 0. Competent is not exceptional. Governance boilerplate = 0. If you cannot name a specific decision that was clearly better than average = 0.
  1 = Must cite a specific, named example: an acquisition that was purchased at a clear discount and created documented value, or buybacks specifically timed at multi-year price lows with evidence. Founder with >10% ownership and long track record of value creation.

SIMPLICITY (0–1 pt) — Can a non-specialist fully understand AND predict this business?
  0 = DEFAULT. Multiple business segments, international operations, technology-dependent revenue, or any specialized knowledge required = 0. If revenue depends on R&D cycles, platform algorithms, regulatory approvals, or macro cycles = 0.
  1 = Single, simple, easily understood business model. Revenue is highly predictable without domain expertise. Examples: a toll road, a water utility, a single-product consumer staple. Most businesses with more than one revenue stream = 0.

ZERO TOLERANCE RULES — these automatically result in 0 for the relevant dimension:
- Filing mentions "competition," "competitive," or "pricing pressure" → moat = 0
- Any platform (Google/Apple/Microsoft/Amazon) offers competing product → durability = 0
- AI or technology explicitly threatens the core business model → durability = 0
- Standard dividends + buybacks = management 0 (no exceptions)
- Going-concern language → durability = 0
- More than 2 business segments → simplicity = 0
- International operations across more than 3 countries → simplicity = 0

Your signals should lead with what is WRONG with the business, not what is right.

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
