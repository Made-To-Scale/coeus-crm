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

/**
 * Generate personalization blocks for outreach campaigns
 * @param {Object} context - Lead context from enrichment
 * @returns {Promise<Object>} - Personalization blocks
 */
async function generatePersonalizationBlocks(context) {
    if (!OPENROUTER_API_KEY) {
        return {
            first_line: `Hola, vi que ${context.business_name} está en ${context.city}`,
            why_you: `Trabajamos con negocios como el tuyo en el sector ${context.categoria || 'wellness'}`,
            micro_offer: `¿Te interesaría conocer cómo podemos ayudarte a crecer?`,
            cta_question: `¿Tienes 10 minutos esta semana?`
        };
    }

    const prompt = `
    Genera bloques de personalización para un email de prospección B2B.
    
    CONTEXTO DEL LEAD:
    - Negocio: ${context.business_name}
    - Tipo: ${context.business_type || 'Negocio local'}
    - Ciudad: ${context.city}
    - Categoría: ${context.categoria || 'wellness'}
    - Rating: ${context.rating || 'N/A'} (${context.reviews_count || 0} reseñas)
    - Resumen: ${context.website_summary || context.personalization_summary || 'No disponible'}
    - Contexto existente: ${context.contexto_personalizado || ''}
    
    PRODUCTO: Magnesio antiedad premium para reventa en centros wellness y salud.
    
    GENERA 4 BLOQUES (JSON):
    {
      "first_line": "1 frase que demuestre investigación real sobre el negocio (NO genérica, máximo 20 palabras)",
      "why_you": "1 frase de encaje específico explicando por qué este producto es relevante para ellos (máximo 20 palabras)",
      "micro_offer": "1 línea de propuesta de valor clara y directa (máximo 20 palabras)",
      "cta_question": "Pregunta corta y directa para generar respuesta (máximo 15 palabras)"
    }
    
    REGLAS CRÍTICAS:
    - Tono profesional pero cercano, en español
    - NO inventar datos que no estén en el contexto
    - Si falta info específica, usar contexto de categoría + ciudad de forma inteligente
    - Evitar frases genéricas como "me gustaría", "estoy interesado", "he visto que"
    - Mencionar algo específico del negocio si es posible (ubicación, tipo de servicio, etc)
    - Máximo 20 palabras por bloque
    `;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'Eres un experto en copywriting B2B. Tu salida debe ser ÚNICAMENTE JSON y todo el texto en ESPAÑOL.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://coeus-crm.com',
                'X-Title': 'Coeus CRM Outreach'
            }
        });

        const content = response.data.choices[0].message.content;
        let jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;

        return JSON.parse(jsonStr);
    } catch (err) {
        console.error('LLM Blocks Generation Error:', err.message);
        // Fallback to safe blocks
        return {
            first_line: `Vi que ${context.business_name} está en ${context.city} con ${context.reviews_count || 'varias'} reseñas`,
            why_you: `Trabajamos con centros ${context.categoria || 'wellness'} que buscan productos premium`,
            micro_offer: `Nuestro magnesio antiedad podría complementar perfectamente tus servicios`,
            cta_question: `¿Te interesaría conocer más detalles?`
        };
    }
}

module.exports = { generatePersonalization, findContactsInText, generatePersonalizationBlocks };
