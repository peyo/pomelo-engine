import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a financial analyst specializing in equity research.
You score companies on qualitative factors based on SEC filings and public information.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

export async function scoreQualitative(ticker, companyName, riskText) {
  const context = riskText
    ? `SEC 10-K Risk Factors excerpt:\n${riskText}`
    : `Company: ${companyName} (${ticker}). Use your training knowledge to assess this company.`;

  const prompt = `Score ${companyName} (${ticker}) on three qualitative dimensions.
Return JSON with this exact structure:
{
  "businessModel": {
    "score": <0|1|2>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  },
  "management": {
    "score": <0|1|2>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  },
  "industryStructure": {
    "score": <0|1|2>,
    "summary": "<2-3 sentence assessment>",
    "signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
  }
}

Scoring: 2 = strong/favorable, 1 = mixed, 0 = weak/concerning.

${context}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  return JSON.parse(text);
}
