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

// Lead Ingestion Endpoint (Triggered from Front-end or Apify)
app.post('/api/ingest', async (req, res) => {
    const { business_type, city, limit, timestamp } = req.body;

    if (!business_type || !city) {
        return res.status(400).json({ error: 'Missing business_type or city' });
    }

    try {
        // 1. Register Scrape Run
        const { data: run, error: runError } = await supabase
            .from('scrape_runs')
            .insert({
                query: business_type,
                geo: city,
                batch_id: timestamp,
                config: { limit }
            })
            .select()
            .single();

        if (runError) throw runError;

        // 2. Trigger Apify (Async)
        // In a real robust backend, we would wait for the webhook from Apify
        // For now, let's assume this is the endpoint Apify calls back to with results
        // or we trigger it here if it's the initial call.

        // IF results are included (Apify Webhook Mode)
        if (req.body.results) {
            await processResults(req.body.results, run.id);
        } else {
            // Initial trigger from Front-end
            // Start Apify Actor
            startApifyActor(business_type, city, limit, run.id);
        }

        res.json({ message: 'Ingestion started', run_id: run.id });
    } catch (error) {
        console.error('Ingestion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Apify Webhook Callback
app.post('/api/webhooks/apify', async (req, res) => {
    // Apify usually sends datasetId. We need to fetch it.
    const { resource } = req.body;
    const runId = req.query.run_id; // Passed in webhook URL

    if (resource && resource.defaultDatasetId) {
        const datasetId = resource.defaultDatasetId;
        const results = await fetchApifyResults(datasetId);
        await processResults(results, runId);
    }

    res.json({ status: 'ok' });
});

async function startApifyActor(business_type, city, limit, runId) {
    const actorId = 'WnMxbsRLNbPeYL6ge'; // Google Maps Email Extractor
    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/apify?run_id=${runId}`;

    try {
        await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${process.env.APIFY_API_KEY}`, {
            language: 'es',
            locationQuery: `${city}, Spain`,
            maxCrawledPlacesPerSearch: limit,
            searchStringsArray: [business_type],
            skipClosedPlaces: false
        }, {
            params: {
                webhooks: btoa(JSON.stringify([{
                    eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                    requestUrl: webhookUrl
                }]))
            }
        });
    } catch (err) {
        console.error('Error triggering Apify:', err.message);
    }
}

async function fetchApifyResults(datasetId) {
    const response = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_KEY}`);
    return response.data;
}

async function processResults(results, runId) {
    for (const item of results) {
        const { lead_clean, enrichment_needed } = cleanLead(item);
        const scoring = scoreLead(lead_clean);
        const { route, channel } = routeLead(scoring, lead_clean);

        // Idempotent Upsert Lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .upsert({
                business_name: lead_clean.name,
                address: lead_clean.address,
                city: lead_clean.city,
                country: lead_clean.countryCode,
                website: lead_clean.website,
                phone_number: lead_clean.phone_primary,
                email: lead_clean.email_primary,
                rating: lead_clean.totalScore,
                reviews_count: lead_clean.reviewsCount,
                place_id: lead_clean.placeId,
                domain: lead_clean.domain,
                phone_type: channel.phone_type,
                whatsapp_likely: channel.whatsapp,
                lead_score: scoring.score,
                lead_tier: scoring.tier,
                routing_status: route,
                lead_clean: lead_clean,
                score_detail: scoring,
                enrichment_needed: enrichment_needed
            }, { onConflict: 'place_id' })
            .select()
            .single();

        if (leadError) {
            console.error('Error upserting lead:', leadError);
            continue;
        }

        // Link to Scrape Run
        await supabase.from('scrape_run_leads').upsert({
            run_id: runId,
            lead_id: lead.id
        });

        // Upsert Contacts (lead_channels)
        await processChannels(lead.id, lead_clean, channel);
    }
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

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
