const axios = require('axios');
require('dotenv').config();

const APIFY_API_KEY = process.env.APIFY_API_KEY;

/**
 * Scrapes up to 4 pages of a website to extract text for personalization
 */
async function scrapeWebsite(url) {
    if (!url) return [];

    let directText = '';
    // 1. Direct Fetch Attempt (Fast)
    try {
        console.log(`[SCRAPER] Attempting direct fetch: ${url}`);
        const response = await axios.get(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (response.data && typeof response.data === 'string') {
            const text = response.data
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 12000);

            if (text.length > 300) {
                console.log(`[SCRAPER] Home page direct fetch successful (${text.length} chars)`);
                directText = text; // Store for fallback
            }
        }
    } catch (err) {
        console.log(`[SCRAPER] Direct fetch failed or blocked: ${err.message}`);
    }

    // 2. Apify Fallback (Reliable & Multi-page)
    if (!APIFY_API_KEY) {
        console.log(`[SCRAPER] No Apify API key, skipping deep crawl`);
        return directText ? [directText] : [];
    }

    try {
        console.log(`[SCRAPER] Using Apify for deep crawl: ${url}`);
        // Using cheerio-scraper to explore subpages
        const actorId = 'apify~cheerio-scraper';
        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
            startUrls: [{ url }],
            maxPagesPerCrawl: 3, // Reduced to save credits/time
            maxRequestsPerCrawl: 10,
            linkSelector: 'a[href]',
            proxyConfiguration: { useApifyProxy: true },
            // Required pageFunction for cheerio-scraper
            pageFunction: `async function pageFunction(context) {
                const { $ } = context;
                const title = $('title').text();
                const body = $('body').text();
                return {
                    url: context.request.url,
                    title,
                    text: body
                };
            }`,
            // Prioritize contact-rich pages
            pseudoUrls: [
                { purl: `${url.replace(/\/$/, '')}/[.*(contacto|contact|about|nosotros|equipo|team|quienes|somos|staff|personal).*]` }
            ]
        }, { timeout: 120000 });

        const results = response.data || [];
        console.log(`[SCRAPER] Scraped ${results.length} pages via Apify`);

        const apifyTexts = results.map(item => {
            const text = (item.text || item.description || '')
                .replace(/\s+/g, ' ')
                .trim();
            return `--- PAGE: ${item.url} ---\n${text}`;
        }).filter(t => t.length > 200);

        // Combine direct text if unique
        if (directText && !apifyTexts.some(t => t.includes(directText.substring(0, 100)))) {
            apifyTexts.unshift(`--- HOMEPAGE (Direct) ---\n${directText}`);
        }

        return apifyTexts.length > 0 ? apifyTexts : (directText ? [directText] : []);

    } catch (err) {
        console.error('[SCRAPER] Apify Scraper Error:', err.response?.data || err.message);
        // Fallback to direct text if available
        return directText ? [`--- HOMEPAGE (Direct Fallback) ---\n${directText}`] : [];
    }
}

module.exports = { scrapeWebsite }
