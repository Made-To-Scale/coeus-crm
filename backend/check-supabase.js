const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function check() {
    console.log('--- Supabase Diagnostic ---');
    let url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    if (url.endsWith('/')) url = url.slice(0, -1);

    console.log('Cleaned URL:', url);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        console.log('Testing general connectivity (Google)...');
        const google = await axios.get('https://www.google.com');
        console.log('Google OK:', google.status);

        console.log('Checking "leads" table with cleaned URL...');
        const client = createClient(url, key, { db: { schema: 'coeus' } });

        const { data, error } = await client.from('leads').select('*', { count: 'exact', head: true });
        if (error) {
            console.error('FAILED "leads":', JSON.stringify(error, null, 2));
        } else {
            console.log('SUCCESS "leads" exists.');
        }

        console.log('Checking "scrape_runs" table...');
        const { data: data2, error: error2 } = await client.from('scrape_runs').select('*', { count: 'exact', head: true });
        if (error2) {
            console.error('FAILED "scrape_runs":', JSON.stringify(error2, null, 2));
        } else {
            console.log('SUCCESS "scrape_runs" exists.');
        }

        console.log('Testing INSERT into "scrape_runs"...');
        const { data: run, error: runError } = await client
            .from('scrape_runs')
            .insert({
                query: 'test_query_clean',
                geo: 'test_geo_clean',
                batch_id: 'test_batch_clean',
                config: { test: true }
            })
            .select()
            .single();

        if (runError) {
            console.error('FAILED INSERT:', JSON.stringify(runError, null, 2));
        } else {
            console.log('SUCCESS INSERT:', run.id);
        }

        console.log('Testing RAW AXIOS POST into "scrape_runs"...');
        try {
            const resp = await axios.post(`${url}/rest/v1/scrape_runs`, {
                query: 'axios_test_clean',
                geo: 'axios_geo_clean',
                batch_id: 'axios_batch_clean'
            }, {
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Content-Profile': 'coeus'
                }
            });
            console.log('AXIOS SUCCESS:', resp.status);
        } catch (err) {
            console.error('AXIOS FAILED:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
        }

        console.log('Testing "public" schema (Default)...');
        const clientPublic = createClient(url, key);
        const { data: lp, error: ep } = await clientPublic.from('leads').select('*', { count: 'exact', head: true });
        if (ep) {
            console.error('FAILED "public.leads":', JSON.stringify(ep, null, 2));
        } else {
            console.log('SUCCESS "public.leads" exists. (NO NEED FOR COEUS SCHEMA)');
            console.log('Testing INSERT into "public.scrape_runs"...');
            const { data: runP, error: errorP } = await clientPublic.from('scrape_runs').insert({
                query: 'test_public_schema',
                geo: 'test_geo_public',
                batch_id: 'test_batch_public'
            }).select().single();

            if (errorP) {
                console.error('FAILED "public" INSERT:', JSON.stringify(errorP, null, 2));
            } else {
                console.log('SUCCESS "public" INSERT:', runP.id);
            }
        }

    } catch (err) {
        console.error('CRITICAL DIAGNOSTIC ERROR:', err);
    }
}
check();
