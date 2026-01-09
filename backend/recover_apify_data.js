const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const APIFY_API_KEY = process.env.APIFY_API_KEY;
// Run ID from logs: Du6bTmaWUOUMIxks6
const ACTOR_RUN_ID = 'Du6bTmaWUOUMIxks6';

async function recoverData() {
    console.log(`Recovering data from run ${ACTOR_RUN_ID}...`);
    try {
        // 1. Get Dataset ID
        const runRes = await axios.get(`https://api.apify.com/v2/actor-runs/${ACTOR_RUN_ID}?token=${APIFY_API_KEY}`);
        const datasetId = runRes.data.data.defaultDatasetId;
        console.log(`Dataset ID: ${datasetId}`);

        // 2. Fetch Items
        const dataRes = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}`);
        const items = dataRes.data;
        console.log(`Retrieved ${items.length} items.`);

        // 3. Save to file
        fs.writeFileSync('recovered_leads_20.json', JSON.stringify(items, null, 2));
        console.log('Saved to recovered_leads_20.json');

    } catch (err) {
        console.error('Error recovering data:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

recoverData();
