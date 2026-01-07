const { verifyEmail, findContacts } = require('./hunter');
const { supabase } = require('./supabase');
const axios = require('axios');
require('dotenv').config();

/**
 * Full Enrichment Flow for a Lead
 */
async function enrichLead(leadId) {
    const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error || !lead) return;

    console.log(`Enriching Lead: ${lead.business_name}`);

    // Update status
    await supabase.from('leads').update({ status: 'enriching' }).eq('id', leadId);

    // 1. Domain Search (Contacts)
    if (lead.domain) {
        const decisors = await findContacts(lead.domain, lead.business_name);
        if (decisors.length > 0) {
            // Save to coeus.contacts
            const contacts = decisors.map(d => ({
                lead_id: leadId,
                name: d.name,
                role: d.role,
                email: d.email,
                status: 'new'
            }));
            await supabase.from('contacts').upsert(contacts, { onConflict: 'lead_id,email' });
        }
    }

    // 2. Email Verification
    if (lead.email) {
        const verification = await verifyEmail(lead.email);
        // If invalid, mark lead
        if (verification.status === 'undeliverable') {
            await supabase.from('leads').update({ routing_status: 'DISQUALIFIED_BOUNCE' }).eq('id', leadId);
        }
    }

    // 3. Web Scraping & Personalization (LLM)
    let enrichmentData = {};
    if (lead.website) {
        const { scrapeWebsite } = require('./scraper');
        const { generatePersonalization } = require('./llm');

        console.log(`Scraping website: ${lead.website}`);
        const scrapedTexts = await scrapeWebsite(lead.website);

        if (scrapedTexts.length > 0) {
            console.log(`Generating personalization for: ${lead.business_name}`);
            enrichmentData = await generatePersonalization(lead.business_name, scrapedTexts);
        }
    }

    // Final Update
    await supabase.from('leads').update({
        status: 'enriched',
        routing_status: lead.email ? 'OUTREACH_READY' : 'ENRICH_MANUAL',
        personalization_summary: enrichmentData.summary || null,
        icebreaker: enrichmentData.icebreaker || null,
        meta: {
            ...lead.meta,
            keywords: enrichmentData.keywords || [],
            ecommerce_signals: enrichmentData.ecommerce_signals || []
        },
        updated_at: new Date().toISOString()
    }).eq('id', leadId);

    console.log(`Finished Enriching: ${lead.business_name}`);
}

module.exports = { enrichLead };
