const axios = require('axios');

const SYSTEM_PROMPT = `You are a personal life scheduler. Generate a schedule based on the user's intent. The user might want a full day schedule or just a plan for the next few hours.
Return ONLY valid JSON — no explanation, no markdown, no extra text. 

Format: 
{ 
  "blocks": [ 
    { 
      "title": string, 
      "category": string, 
      "start_time": ISO datetime string, 
      "end_time": ISO datetime string, 
      "color": hex string, 
      "energy_level": "high"|"medium"|"low", 
      "is_non_negotiable": boolean 
    } 
  ] 
} 

Categories: work, health, learning, relationships, admin, personal, sleep. 
Colors: work=#3B82F6, health=#22C55E, learning=#A855F7, relationships=#F97316, admin=#6B7280, personal=#EC4899, sleep=#1E293B. 

Be realistic with timing.`;

async function generateDayPlan(prompt, userContext, attempt = 1) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${prompt}\n\nContext: ${JSON.stringify(userContext)}` },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Life OS',
        },
        timeout: 45000, // 45 seconds timeout
      }
    );

    const data = response.data;

    if (!data.choices || data.choices.length === 0) {
      if (attempt < 3) {
        console.log(`OpenRouter returned no choices, retrying (attempt ${attempt})...`);
        await new Promise(r => setTimeout(r, 2000));
        return generateDayPlan(prompt, userContext, attempt + 1);
      }
      throw new Error(data.error?.message || 'Model returned no choices (overloaded — try again)');
    }

    let content = data.choices[0].message.content.trim();
    
    // Robust extraction: find the first { and last } to extract JSON
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      console.error('No JSON object found in AI response:', content);
      throw new Error('AI returned invalid format (no JSON object found). Please try again.');
    }
    
    const jsonString = content.substring(firstBrace, lastBrace + 1);

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.blocks)) {
        throw new Error('AI response missing blocks array');
      }
      return parsed.blocks;
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', jsonString);
      throw new Error('AI returned invalid format. Please try again.');
    }
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      throw new Error('AI generation timed out. The model might be busy, please try again.');
    }
    throw err;
  }
}

module.exports = { generateDayPlan };

