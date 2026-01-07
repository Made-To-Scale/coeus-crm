const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'anthropic/claude-3-haiku';

/**
 * Summarizes scraped website content for personalization
 * @param {string} businessName 
 * @param {string[]} scrapedTexts 
 * @returns {Promise<Object>}
 */
async function generatePersonalization(businessName, scrapedTexts) {
    if (!OPENROUTER_API_KEY) return { summary: '', keywords: [] };

    const combinedText = scrapedTexts.join('\n\n').substring(0, 10000); // Limit context

    const prompt = `
    Analyze the following website content for the business "${businessName}".
    
    Tasks:
    1. Extract a brief summary of what they do (max 2 sentences).
    2. Identify 3-5 core services or keywords.
    3. Detect if they have an online shop or ecommerce signals.
    4. Write a "personalized icebreaker" for a cold email that mentions something specific from their site (e.g., a specific service, their mission, or a value proposition). Avoid generic compliments.

    Content:
    ${combinedText}

    Output JSON format:
    {
        "summary": "...",
        "keywords": ["...", "..."],
        "ecommerce_signals": ["...", "..."],
        "icebreaker": "..."
    }
    `;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'You are a professional business analyst. Output ONLY JSON.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://coeus-crm.com',
                'X-Title': 'Coeus CRM'
            }
        });

        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
    } catch (err) {
        console.error('LLM Personalization Error:', err.response?.data || err.message);
        return { summary: 'Error generating summary', keywords: [], icebreaker: '' };
    }
}

module.exports = { generatePersonalization };
