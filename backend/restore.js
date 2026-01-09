const fs = require('fs');
const { supabase } = require('./services/supabase');
const { cleanLead } = require('./utils/cleaner');
const { scoreLead, routeLead } = require('./utils/scorer');
const { enrichLead } = require('./services/enrichment');
require('dotenv').config();

async function restoreLeads() {
    try {
        const rawData = fs.readFileSync('recovered_leads_20.json', 'utf8');
        const results = JSON.parse(rawData);
        console.log(`Processing ${results.length} recovered leads...`);

        const runId = 'f3f672f6-11d3-40f7-a02d-aa11a6d9da67'; // Original Run ID
        const searchQuery = 'farmacia'; // Hardcoded for this restore

        for (const item of results) {
            console.log(`Processing: ${item.title || item.name || 'Unknown'}`);

            // 1. Clean
            const { lead_clean, enrichment_needed } = cleanLead(item);

            // 2. Score & Route
            const scoring = scoreLead(lead_clean);
            const { route, channel } = routeLead(scoring, lead_clean);

            // 3. Upsert to DB
            const { data: lead, error: leadError } = await supabase
                .from('leads')
                .upsert({
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
                    search_query: searchQuery,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'place_id' })
                .select().single();

            if (leadError) {
                console.error(`Error saving lead ${lead_clean.name}:`, leadError.message);
                continue;
            }

            // 4. Trigger Enrichment (if needed)
            if (enrichment_needed && lead) {
                console.log(`Triggering enrichment for: ${lead.business_name}`);
                try {
                    await enrichLead(lead.id);
                } catch (err) {
                    console.error(`Enrichment failed for ${lead.business_name}:`, err.message);
                }
            }
        }

        console.log('Restoration completed. Enrichment may still be running in background.');

    } catch (err) {
        console.error('Restoration failed:', err);
    }
}

restoreLeads();
