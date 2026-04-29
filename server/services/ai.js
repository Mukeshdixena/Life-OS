const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a personal life scheduler. Generate a complete day schedule from wake time to sleep. Return ONLY valid JSON — no explanation, no markdown, no extra text. Format: { "blocks": [ { "title": string, "category": string, "start_time": ISO datetime string, "end_time": ISO datetime string, "color": hex string, "energy_level": "high"|"medium"|"low", "is_non_negotiable": boolean } ] } Categories: work, health, learning, relationships, admin, personal, sleep. Colors: work=#3B82F6, health=#22C55E, learning=#A855F7, relationships=#F97316, admin=#6B7280, personal=#EC4899, sleep=#1E293B. Be realistic with timing. Include meals, transitions, morning routine, evening wind-down.`;

async function generateDayPlan(prompt, userContext) {
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\nContext: ${JSON.stringify(userContext)}`,
      },
    ],
  });

  let content = message.content[0].text.trim();

  // Strip markdown code fences if present
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.blocks)) {
    throw new Error('AI response missing blocks array');
  }

  return parsed.blocks;
}

module.exports = { generateDayPlan };
