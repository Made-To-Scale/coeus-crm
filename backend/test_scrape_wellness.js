const { cleanLead } = require('./utils/cleaner');
const { scoreLead, routeLead } = require('./utils/scorer');
const { enrichLead } = require('./services/enrichment');
const { supabase } = require('./services/supabase');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const APIFY_API_KEY = process.env.APIFY_API_KEY;

// 1. DUPLICATED LOGIC FROM server.js to ensure channels are saved
async function processChannels(leadId, lc, channel) {
    const channels = [];

    // Emails
    const emails = [...new Set([lc.email_primary, ...(lc.emails_all || [])])].filter(Boolean);
    emails.forEach(email => {
        channels.push({
            lead_id: leadId,
            type: 'email',
            value: email,
            is_primary: email === lc.email_primary,
            status: 'new',
            meta: { source: 'google_maps_apify' }
        });
    });

    // Phones
    const phones = [...new Set([lc.phone_primary, ...(lc.phones_all || [])])].filter(Boolean);
    phones.forEach(phone => {
        channels.push({
            lead_id: leadId,
            type: 'phone',
            value: phone,
            is_primary: phone === lc.phone_primary,
            status: 'new',
            meta: {
                source: 'google_maps_apify',
                phone_type: lc.phone_type,
                whatsapp_likely: lc.whatsapp_likely
            }
        });
    });

    if (channels.length > 0) {
        console.log(`[TEST] Saving ${channels.length} channels for lead ${leadId}`);
        await supabase.from('lead_channels').upsert(channels, { onConflict: 'lead_id,type,value' });
    }
}

async function runTest() {
    console.log('[TEST] Starting Wellness Clinics Test (20 items)...');

    // 1. Scrape via Apify
    const actorId = 'lukaskrivka~google-maps-with-contact-details';
    console.log(`[TEST] Triggering Apify Actor: ${actorId}`);

    try {
        const payload = {
            language: 'es',
            locationQuery: 'Madrid, Spain',
            maxCrawledPlacesPerSearch: 20,
            searchStringsArray: ['clinica wellness', 'centro de estetica avanzado', 'medicina estetica'], // Wellness related
            skipClosedPlaces: true
        };

        const runRes = await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_KEY}`, payload);
        const runId = runRes.data.data.id;
        console.log(`[TEST] Apify Run ID: ${runId}`);

        // Poll for completion
        let finished = false;
        let datasetId = null;

        while (!finished) {
            await new Promise(r => setTimeout(r, 10000));
            const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
            const status = statusRes.data.data.status;
            console.log(`[TEST] Status: ${status}`);

            if (status === 'SUCCEEDED') {
                finished = true;
                datasetId = statusRes.data.data.defaultDatasetId;
            } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
                throw new Error(`Run failed with status: ${status}`);
            }
        }

        console.log(`[TEST] Fetching results from dataset: ${datasetId}`);
        const dataRes = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}`);
        const items = dataRes.data;

        // Register fake run in Supabase for tracking
        const { data: dbRun } = await supabase.from('scrape_runs').insert([{
            query: 'TEST: Wellness Madrid',
            geo: 'Madrid',
            batch_id: `test_${Date.now()}`,
            config: { limit: 20, status: 'PROCESSING' }
        }]).select().single();

        console.log(`[TEST] Processing ${items.length} items...`);

        for (const item of items) {
            // Clean
            const { lead_clean, enrichment_needed } = cleanLead(item);
            // Score
            const scoring = scoreLead(lead_clean);
            // Route
            const { route, channel } = routeLead(scoring, lead_clean);

            // Upsert Lead
            const { data: lead, error } = await supabase.from('leads').upsert({
                business_name: lead_clean.name,
                address: lead_clean.address,
                city: lead_clean.city,
                country: lead_clean.countryCode,
                website: lead_clean.website,
                place_id: lead_clean.placeId,
                email: lead_clean.email_primary,
                phone_number: lead_clean.phone_primary,
                lead_tier: scoring.tier,
                lead_score: scoring.score,
                score_detail: scoring,
                enrichment_needed: enrichment_needed,
                status: 'new',
                pipeline_stage: 'new',
                routing_status: route,
                meta: channel,
                search_query: 'TEST: Wellness Madrid',
                updated_at: new Date().toISOString()
            }, { onConflict: 'place_id' }).select().single();

            if (error) {
                console.error(`[TEST] Error saving lead: ${error.message}`);
                continue;
            }

            // JOIN
            await supabase.from('scrape_run_leads').insert({ run_id: dbRun.id, lead_id: lead.id });

            // SAVE CHANNELS (CRITICAL FIX)
            await processChannels(lead.id, lead_clean, channel);

            // ENRICH
            if (route !== 'DROP_CLOSED') {
                console.log(`[TEST] Enriching: ${lead.business_name}`);
                try {
                    await enrichLead(lead.id);
                } catch (e) {
                    console.error(`[TEST] Enrichment failed: ${e.message}`);
                }
            }
        }

        console.log('[TEST] COMPLETE.');

    } catch (err) {
        console.error('[TEST] Error:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

runTest();
