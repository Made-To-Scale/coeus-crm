const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
    console.log('--- Final Coeus Permission Check ---');
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = createClient(url, key, { db: { schema: 'coeus' } });

    console.log('Testing INSERT into "coeus.scrape_runs"...');
    const { data, error } = await client.from('scrape_runs').insert({
        query: 'final_verification',
        geo: 'barcelona',
        batch_id: 'verify_' + Date.now()
    }).select().single();

    if (error) {
        console.error('FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('SUCCESS! Permission granted. ID:', data.id);
    }
}
check();
