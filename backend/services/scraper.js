const axios = require('axios');
require('dotenv').config();

const APIFY_API_KEY = process.env.APIFY_API_KEY;

/**
 * Scrapes up to 4 pages of a website to extract text for personalization
 */
async function scrapeWebsite(url) {
    if (!url || !APIFY_API_KEY) return [];

    try {
        // Using Apify "Website Content Crawler" or a similar simple scraper
        const actorId = 'apify/website-content-crawler';
        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
            startUrls: [{ url }],
            maxPagesPerCrawl: 4,
            proxyConfiguration: { useApifyProxy: true }
        });

        // Map to extracted text
        return response.data.map(item => item.text || item.description || '').filter(Boolean);
    } catch (err) {
        console.error('Scraper Error:', err.message);
        return [];
    }
}

module.exports = { scrapeWebsite };
