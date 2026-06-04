import Anthropic from '@anthropic-ai/sdk';

const RAW_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const KEY = RAW_KEY && !RAW_KEY.startsWith('your_') ? RAW_KEY : null;

export const hasClaude = () => Boolean(KEY);

const client = KEY ? new Anthropic({ apiKey: KEY }) : null;

const SYSTEM = `You are a financial analyst specializing in equity research.
You score companies on qualitative factors based on SEC filings and public information.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

export async function scoreQualitative(ticker, companyName, riskText) {
  if (!client) {
    const e = new Error('Claude qualitative scoring unavailable — set ANTHROPIC_API_KEY');
    e.code = 'NO_CLAUDE_KEY';
    throw e;
  }
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

  const raw = message.content[0].text.trim();
  // Strip ```json … ``` fences if the model added them, then isolate the object
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  const json = start !== -1 && end !== -1 ? unfenced.slice(start, end + 1) : unfenced;
  return JSON.parse(json);
}
