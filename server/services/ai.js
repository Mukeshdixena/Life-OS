const axios = require('axios');

const SYSTEM_PROMPT = `You are a personal life scheduler. Generate a complete 24-hour time-blocked schedule with NO gaps from wake time to sleep. Every minute must be accounted for. Return ONLY valid JSON — no explanation, no markdown, no extra text. Format: { "blocks": [ { "title": string, "category": string, "start_time": ISO string, "end_time": ISO string, "color": hex string, "energy_level": "high"|"medium"|"low", "is_non_negotiable": boolean } ] } Categories: work, health, learning, relationships, admin, personal, sleep. Colors: work=#3B82F6, health=#22C55E, learning=#A855F7, relationships=#F97316, admin=#6B7280, personal=#EC4899, sleep=#1E293B. Be realistic with timing. Include meals, transitions, morning routine, evening wind-down.`;

async function generateDayPlan(prompt, userContext) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${prompt}\n\nContext: ${JSON.stringify(userContext)}`,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Life OS',
      },
    }
  );

  let content = response.data.choices[0].message.content.trim();

  // Strip markdown code fences if present
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.blocks)) {
    throw new Error('AI response missing blocks array');
  }

  return parsed.blocks;
}

module.exports = { generateDayPlan };
