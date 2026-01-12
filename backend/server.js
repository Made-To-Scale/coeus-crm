const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { supabase } = require('./services/supabase');
const { cleanLead } = require('./utils/cleaner');
const { scoreLead, routeLead } = require('./utils/scorer');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

const { enrichLead } = require('./services/enrichment');

// Lead Ingestion Endpoint
app.post('/api/ingest', async (req, res) => {
    const { business_type, city, limit, timestamp } = req.body;
    console.log(`[INGEST] Received request: ${business_type} in ${city} (limit: ${limit})`);

    if (!business_type || !city) {
        console.error('[INGEST] Missing business_type or city');
        return res.status(400).json({ error: 'Missing business_type or city' });
    }

    try {
        // 1. Register Scrape Run
        console.log('[INGEST] Registering scrape run in Supabase...');
        const { data: run, error: runError } = await supabase
            .from('scrape_runs')
            .insert([{
                query: business_type,
                geo: city,
                batch_id: timestamp,
                config: { limit, status: 'SCRAPING' }
            }])
            .select()
            .single();

        if (runError) {
            console.error('[INGEST] Supabase Error registering run:');
            console.error('Full Error:', runError);
            console.error('Message:', runError.message);
            console.error('Code:', runError.code);
            console.error('Details:', runError.details);
            console.error('Hint:', runError.hint);
            throw new Error(`Database error: ${runError.message || 'Unknown error'}`);
        }
        console.log(`[INGEST] Run registered with ID: ${run.id}`);

        // Initial trigger from Front-end
        console.log('[INGEST] Triggering Apify actor...');
        const apifyRunId = await startApifyActor(business_type, city, limit, run.id);

        // LOCAL ROBUSTNESS: If no BACKEND_URL, start polling for results
        if (!process.env.BACKEND_URL) {
            console.log('[INGEST] Local mode detected. Polling Apify for results every 15s...');
            pollApifyResults(apifyRunId, run.id);
        }

        res.json({ message: 'Ingestion started successfully', run_id: run.id });
    } catch (error) {
        console.error('[INGEST] Critical error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Polls Apify for completion when webhooks aren't possible (local dev)
 */
async function pollApifyResults(apifyRunId, runId) {
    let finished = false;
    while (!finished) {
        await new Promise(r => setTimeout(r, 15000));
        console.log(`[POLLING] Checking Apify run status: ${apifyRunId}...`);
        try {
            const response = await axios.get(`https://api.apify.com/v2/actor-runs/${apifyRunId}?token=${process.env.APIFY_API_KEY}`);
            const status = response.data.data.status;
            console.log(`[POLLING] Current status: ${status}`);

            if (status === 'SUCCEEDED') {
                finished = true;
                const datasetId = response.data.data.defaultDatasetId;
                const results = await fetchApifyResults(datasetId);
                console.log(`[POLLING] Run succeeded. Processing ${results.length} items...`);
                await processResults(results, runId);
            } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
                finished = true;
                console.error(`[POLLING] Apify run ended with status: ${status}`);
            }
        } catch (err) {
            console.error('[POLLING] Error during poll:', err.message);
        }
    }
}

// Apify Webhook Callback
app.post('/api/webhooks/apify', async (req, res) => {
    // Apify usually sends datasetId. We need to fetch it.
    const { resource } = req.body;
    const runId = req.query.run_id; // Passed in webhook URL
    console.log(`[WEBHOOK] Received Apify callback for run: ${runId}`);

    if (resource && resource.defaultDatasetId) {
        try {
            const datasetId = resource.defaultDatasetId;
            console.log(`[WEBHOOK] Fetching results from dataset: ${datasetId}`);
            const results = await fetchApifyResults(datasetId);
            console.log(`[WEBHOOK] Processings ${results.length} items...`);
            await processResults(results, runId);
        } catch (err) {
            console.error('[WEBHOOK] Error processing Apify results:', err);
        }
    }

    res.json({ status: 'ok' });
});

async function startApifyActor(business_type, city, limit, runId) {
    const actorId = 'lukaskrivka~google-maps-with-contact-details';
    const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/apify?run_id=${runId}`;
    const isLocal = !process.env.BACKEND_URL || process.env.BACKEND_URL.includes('localhost');

    console.log(`[APIFY] Starting actor ${actorId}. Local mode: ${isLocal}`);

    try {
        // EXACT n8n format
        const payload = {
            language: 'es',
            locationQuery: `${city}, Spain`,
            maxCrawledPlacesPerSearch: limit,
            searchStringsArray: [business_type],
            skipClosedPlaces: false
        };

        const config = {};
        if (!isLocal) {
            config.params = {
                webhooks: btoa(JSON.stringify([{
                    eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                    requestUrl: webhookUrl
                }]))
            };
        }

        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${process.env.APIFY_API_KEY}`, payload, config);
        console.log(`[APIFY] Actor started. Run ID: ${response.data.data.id}`);
        return response.data.data.id;
    } catch (err) {
        console.error('[APIFY] Failed to trigger actor:', err.response?.data || err.message);
        throw err;
    }
}

async function fetchApifyResults(datasetId) {
    const response = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_KEY}`);
    return response.data;
}

async function processResults(results, runId) {
    console.log(`[PROCESS] Processing ${results.length} items for run ${runId}`);

    // Fetch the query for this run to tag leads
    // Get run data with config
    const { data: runData } = await supabase.from('scrape_runs').select('query, config').eq('id', runId).single();
    const searchQuery = runData?.query || 'Unknown';
    const originalLimit = runData?.config?.limit || results.length;

    // 1. Update status to ENRICHING
    await supabase.from('scrape_runs').update({
        config: { status: 'ENRICHING', limit: originalLimit, total_leads: results.length }
    }).eq('id', runId);

    for (const item of results) {
        const { lead_clean, enrichment_needed } = cleanLead(item);
        const scoring = scoreLead(lead_clean);
        const { route, channel } = routeLead(scoring, lead_clean);

        // 2. Idempotent Upsert Lead
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
                rating: item.totalScore || 0,
                reviews_count: item.reviewsCount || 0,
                lead_tier: scoring.tier,
                lead_score: scoring.score,
                score_detail: scoring,
                enrichment_needed: enrichment_needed,
                status: 'new',
                pipeline_stage: 'new',
                routing_status: route,
                meta: { ...channel, whatsapp_likely: lead_clean.whatsapp_likely, phone_type: lead_clean.phone_type },
                search_query: searchQuery,
                updated_at: new Date().toISOString()
            }, { onConflict: 'place_id' })
            .select().single();

        if (leadError) {
            console.error(`[PROCESS] Lead Error for ${lead_clean.name}: ${leadError.message}`);
            continue;
        }

        console.log(`[PROCESS] Lead processed: ${lead.business_name} (${lead.id})`);

        // 3. Link to Scrape Run
        await supabase.from('scrape_run_leads').upsert({
            run_id: runId,
            lead_id: lead.id
        }, { onConflict: 'run_id,lead_id' });

        // 4. Upsert Contacts/Channels
        await processChannels(lead.id, lead_clean, channel);

        // 5. Trigger enrichment for all viable leads (ENRICH or OUTREACH_READY)
        if (route !== 'DROP_CLOSED') {
            // Update run status to AI_ANALYSIS
            const { data: latestRun } = await supabase.from('scrape_runs').select('config').eq('id', runId).single();
            await supabase.from('scrape_runs').update({
                config: { ...latestRun.config, status: 'AI_ANALYSIS' }
            }).eq('id', runId);

            console.log(`[ENRICH] Triggering for: ${lead.business_name}`);
            enrichLead(lead.id).catch(err => console.error(`[ENRICH] Error enriching ${lead.id}:`, err));
        }
    }

    // 6. Mark run as COMPLETED
    const { data: finalRun } = await supabase.from('scrape_runs').select('config').eq('id', runId).single();
    await supabase.from('scrape_runs').update({
        config: { ...finalRun.config, status: 'COMPLETED', completed_at: new Date().toISOString() }
    }).eq('id', runId);
    console.log(`[PROCESS] Completed run ${runId}`);
}

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
        // Upsert based on lead_id + type + value
        // Note: We need a unique constraint or use upsert carefully
        await supabase.from('lead_channels').upsert(channels, { onConflict: 'lead_id,type,value' });
    }
}

const { trackEvent } = require('./services/tracking');

// Instantly Webhook Callback
app.post('/api/webhooks/instantly', async (req, res) => {
    const event = req.body;
    const { event_type, lead_email, campaign_id, timestamp, id: external_id } = event;

    // Find lead by email
    const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', lead_email)
        .single();

    if (lead) {
        await trackEvent(lead.id, {
            eventType: event_type, // open, click, reply, bounce, etc.
            provider: 'instantly',
            externalId: external_id || `${event_type}_${lead_email}_${timestamp}`,
            meta: event,
            occurredAt: timestamp
        });

        // Special handling for Stop/Bounce/Reply
        if (['reply', 'bounce', 'unsubscribe'].includes(event_type)) {
            await supabase.from('leads').update({ status: 'closed', routing_status: `CLOSED_${event_type.toUpperCase()}` }).eq('id', lead.id);
        }
    }

    res.json({ status: 'ok' });
});

// Manual Handoff Task Trigger (Simulated for MVP)
app.post('/api/tasks/handoff', async (req, res) => {
    const { lead_id } = req.body;
    await trackEvent(lead_id, {
        eventType: 'manual_task',
        provider: 'manual',
        externalId: `handoff_${lead_id}_${Date.now()}`,
        meta: { task_type: 'WhatsApp/Call' },
        occurredAt: new Date().toISOString()
    });
    res.json({ status: 'task_created' });
});

// Dashboard Stats Endpoint
app.get('/api/stats', async (req, res) => {
    try {
        // 1. Total Leads
        const { count: totalLeads, error: errTotal } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true });

        // 2. Tier Counts
        const { count: tierA, error: errA } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('lead_tier', 'A');

        const { count: tierB, error: errB } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('lead_tier', 'B');

        // 3. Active Runs
        const { count: activeRuns, error: errRuns } = await supabase
            .from('scrape_runs')
            .select('*', { count: 'exact', head: true })
            .neq('config->>status', 'COMPLETED'); // JSONB query syntax might vary, using simple neq if possible or client logic

        // Note: For JSONB filtering via Supabase JS, .neq('config->status', 'COMPLETED') works if config is jsonb column

        if (errTotal || errA || errB) throw new Error('DB Error fetching stats');

        res.json({
            total_leads: totalLeads || 0,
            tier_a: tierA || 0,
            tier_b: tierB || 0,
            active_runs: activeRuns || 0
        });
    } catch (err) {
        console.error('[STATS] Error:', err.message);
        // Return zeros on error to avoid breaking frontend
        res.json({ total_leads: 0, tier_a: 0, tier_b: 0, active_runs: 0 });
    }
});

app.post('/api/reenrich', async (req, res) => {
    const { run_id } = req.body;
    if (!run_id) return res.status(400).json({ error: 'run_id is required' });

    console.log(`[REENRICH] Re-triggering enrichment for run: ${run_id}`);

    try {
        const { data: runLeads, error } = await supabase
            .from('scrape_run_leads')
            .select('lead_id')
            .eq('run_id', run_id);

        if (error) throw error;

        // Reset run status
        const { data: currentRun } = await supabase.from('scrape_runs').select('config').eq('id', run_id).single();
        if (currentRun) {
            await supabase.from('scrape_runs').update({ config: { ...currentRun.config, status: 'ENRICHING' } }).eq('id', run_id);
        }

        const leadIds = runLeads.map(l => l.lead_id);
        console.log(`[REENRICH] Found ${leadIds.length} leads to re-enrich.`);

        // Trigger enrichment in background
        leadIds.forEach(id => {
            enrichLead(id).catch(err => console.error(`[ENRICH] Retry failed for ${id}:`, err));
        });

        res.json({ message: 'Re-enrichment started', leads_count: leadIds.length });
    } catch (err) {
        console.error('[REENRICH] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// INSTANTLY.AI INTEGRATION ENDPOINTS
// ============================================================================

const instantly = require('./services/instantly');

// Create Campaign
app.post('/api/campaigns/create', async (req, res) => {
    try {
        const { name, settings } = req.body;
        if (!name) return res.status(400).json({ error: 'Campaign name required' });

        const campaign = await instantly.createCampaign(name, settings || {});
        res.json(campaign);
    } catch (err) {
        console.error('[CAMPAIGNS] Create error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get All Campaigns
app.get('/api/campaigns', async (req, res) => {
    try {
        const campaigns = await instantly.getCampaigns();
        res.json(campaigns);
    } catch (err) {
        console.error('[CAMPAIGNS] List error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get Campaign Stats
app.get('/api/campaigns/:id/stats', async (req, res) => {
    try {
        const stats = await instantly.getCampaignStats(req.params.id);
        res.json(stats);
    } catch (err) {
        console.error('[CAMPAIGNS] Stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Enroll Lead in Campaign
app.post('/api/campaigns/:id/enroll', async (req, res) => {
    try {
        const { lead_id, variables } = req.body;
        if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

        const enrollment = await instantly.enrollLead(lead_id, req.params.id, variables || {});
        res.json(enrollment);
    } catch (err) {
        console.error('[CAMPAIGNS] Enroll error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get Lead Enrollment Status
app.get('/api/leads/:id/enrollment', async (req, res) => {
    try {
        const enrollments = await instantly.getLeadEnrollment(req.params.id);
        res.json(enrollments);
    } catch (err) {
        console.error('[ENROLLMENT] Get error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Pause Enrollment
app.post('/api/enrollments/:id/pause', async (req, res) => {
    try {
        const result = await instantly.pauseLead(req.params.id);
        res.json(result);
    } catch (err) {
        console.error('[ENROLLMENT] Pause error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Resume Enrollment
app.post('/api/enrollments/:id/resume', async (req, res) => {
    try {
        const result = await instantly.resumeLead(req.params.id);
        res.json(result);
    } catch (err) {
        console.error('[ENROLLMENT] Resume error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// OUTREACH CAMPAIGN ENDPOINTS
// ============================================================================

const campaignService = require('./services/campaign');
const batchService = require('./services/batch');
const personalizationService = require('./services/personalization');

// Create Campaign
app.post('/api/outreach/campaigns', async (req, res) => {
    try {
        const { hypothesis, template_config, sending_config } = req.body;
        const campaign = await campaignService.createCampaign(hypothesis, template_config, sending_config);
        res.json(campaign);
    } catch (err) {
        console.error('[API] Create campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Campaigns
app.get('/api/outreach/campaigns', async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns(req.query);
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Campaign
app.get('/api/outreach/campaigns/:id', async (req, res) => {
    try {
        const campaign = await campaignService.getCampaign(req.params.id);
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Campaign Stats
app.get('/api/outreach/campaigns/:id/stats', async (req, res) => {
    try {
        const stats = await campaignService.getCampaignStats(req.params.id);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Launch Campaign
app.post('/api/outreach/campaigns/:id/launch', async (req, res) => {
    try {
        const campaign = await campaignService.launchCampaign(req.params.id);
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pause Campaign
app.post('/api/outreach/campaigns/:id/pause', async (req, res) => {
    try {
        const campaign = await campaignService.pauseCampaign(req.params.id);
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Batch
app.post('/api/outreach/campaigns/:id/batches', async (req, res) => {
    try {
        const { filters } = req.body;
        const batch = await batchService.createBatchFromFilters(req.params.id, filters);
        res.json(batch);
    } catch (err) {
        console.error('[API] Create batch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Batch Leads
app.get('/api/outreach/batches/:id/leads', async (req, res) => {
    try {
        const leads = await batchService.getBatchLeads(req.params.id, req.query);
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Batch Stats
app.get('/api/outreach/batches/:id/stats', async (req, res) => {
    try {
        const stats = await batchService.getBatchStats(req.params.id);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Personalization for Batch
app.post('/api/outreach/batches/:id/personalize', async (req, res) => {
    try {
        const results = await personalizationService.generateBlocksForBatch(req.params.id);
        res.json(results);
    } catch (err) {
        console.error('[API] Personalization error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Enroll Batch in Instantly
app.post('/api/outreach/batches/:id/enroll', async (req, res) => {
    try {
        const { campaign_id } = req.body;
        const results = await instantly.enrollLeadsInCampaign(campaign_id, req.params.id);
        res.json(results);
    } catch (err) {
        console.error('[API] Enrollment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Lead Timeline
app.get('/api/outreach/leads/:id/timeline', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('outreach_events')
            .select('*')
            .eq('lead_id', req.params.id)
            .order('occurred_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEV ONLY: Simulate Event (for testing without live API)
app.post('/api/dev/simulate-event', async (req, res) => {
    try {
        const { type, lead_email, campaign_id, meta } = req.body;
        if (!type || !lead_email) {
            return res.status(400).json({ error: 'type and lead_email required' });
        }

        const result = await instantly.simulateEvent(type, lead_email, { campaign_id, ...meta });
        res.json(result);
    } catch (err) {
        console.error('[DEV] Simulate error:', err.message);
        res.status(500).json({ error: err.message });
    }

});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
