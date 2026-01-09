const axios = require('axios');
require('dotenv').config();

const APIFY_API_KEY = process.env.APIFY_API_KEY;

/**
 * Searches Google for the owner/contacts of a business
 */
async function findOwnerInGoogle(businessName, city) {
    if (!APIFY_API_KEY) return [];

    const query = `dueños de "${businessName}" en ${city}`;
    console.log(`[SEARCH] Fallback search for: ${query}`);

    try {
        const actorId = 'apify~google-search-scraper';
        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
            queries: query,
            maxPagesPerQuery: 1,
            resultsPerPage: 3,
            mobileResults: false,
            proxyConfiguration: { useApifyProxy: true }
        }, { timeout: 120000 });

        const results = response.data || [];
        // Flatten organic results
        const organicResults = results.flatMap(page => page.organicResults || []);

        console.log(`[SEARCH] Found ${organicResults.length} search results`);

        // Extract snippets and titles for the LLM to process
        return organicResults.map(r => ({
            title: r.title,
            snippet: r.description || r.snippet,
            url: r.url
        }));
    } catch (err) {
        console.error('Google Search Error:', err.message);
        return [];
    }
}

module.exports = { findOwnerInGoogle };
