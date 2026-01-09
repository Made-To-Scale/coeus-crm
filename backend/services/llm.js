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
    Analiza el siguiente contenido del sitio web de la empresa "${businessName}".
    
    Tareas:
    1. **BUSINESS INTELLIGENCE**: Extrae un resumen detallado y profesional de lo que hacen, su propuesta de valor y posicionamiento (3-5 frases).
    2. Identifica 3-5 servicios principales o palabras clave.
    3. Clasifica la **CATEGORIA** EXACTA del negocio en una de estas 3 opciones: "deporte", "bienestar", "salud". 
    4. Detecta si tienen tienda online o señales de ecommerce.
    5. **IDENTIFICA PERSONAS CLAVE**: Busca nombres de dueños, gerentes, directores o equipo técnico/especializado (ej. "Director médico", "Farmacéutico titular").
    6. **VARIABLES DE PERSONALIZACIÓN**:
        - "contexto_1_linea": Una frase que demuestre investigación profunda. No genérica.
        - "observacion_1linea": Una observación específica para un follow-up (ej: "vi que usáis la tecnología X...").
        - "icebreaker": Una frase de apertura amigable, directa y natural en español.

    Contenido:
    ${combinedText}

    Formato de salida JSON (SOLO JSON):
    {
        "summary": "Resumen detallado de Business Intelligence...",
        "business_type": "Clasificación (ej: Centro de Estética)",
        "categoria": "deporte|bienestar|salud",
        "keywords": ["..."],
        "ecommerce_signals": ["..."],
        "icebreaker": "...",
        "contexto_1_linea": "...",
        "observacion_1linea": "...",
        "found_contacts": [
            { "name": "...", "role": "...", "email": "..." }
        ]
    }
    
    IMPORTANTE: 
    - No inventes datos. Si no encuentras algo, déjalo vacío.
    - El tono debe ser profesional y persuasivo.
    - "categoria" DEBE ser una de las 3 indicadas.
    `;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'Eres un analista de negocios profesional. Tu salida debe ser ÚNICAMENTE JSON y todo el texto en ESPAÑOL.' },
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

        // Resilience: Try to find JSON block if LLM adds chatter
        let jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;

        return JSON.parse(jsonStr);
    } catch (err) {
        console.error('LLM Personalization Error:', err.message);
        return {
            summary: "Error al procesar con IA",
            keywords: [],
            icebreaker: "Hola!",
            found_contacts: [],
            ecommerce_signals: [],
            source_pages: []
        };
    }
}

/**
 * Specialized extraction for contacts from search snippets or unstructured text
 */
async function findContactsInText(businessName, rawText) {
    if (!OPENROUTER_API_KEY) return [];

    const prompt = `
    Analiza el siguiente texto sobre la empresa "${businessName}".
    Identifica nombres de personas (DUEÑOS, GERENTES, DIRECTORES) y sus puestos.
    
    IMPORTANTE: Responde ÚNICAMENTE con el array JSON. No incluyas explicaciones ni texto adicional.

    Texto:
    ${rawText.substring(0, 8000)}

    Formato de salida JSON:
    [
        { "name": "...", "role": "...", "email": "..." }
    ]
    `;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'Eres un experto en inteligencia de ventas. Tu salida debe ser ÚNICAMENTE un array JSON.' },
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

        // Resilience: Try to find JSON block
        let jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;

        return JSON.parse(jsonStr);
    } catch (err) {
        console.error('LLM Contact Extraction Error:', err.message);
        return [];
    }
}

module.exports = { generatePersonalization, findContactsInText };
