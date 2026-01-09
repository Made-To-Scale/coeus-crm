const { findContactsInText, generatePersonalization } = require('./llm');
const { findOwnerInGoogle } = require('./googleSearch');
const { isProviderDomain } = require('../utils/cleaner');
const { supabase } = require('./supabase');
const axios = require('axios');
require('dotenv').config();

/**
 * Simplified Enrichment Flow for Local Businesses
 * 1. Use contacts from Apify (already in lead_channels)
 * 2. Scrape website + AI extraction for additional contacts
 * 3. Verify all emails with Million Verifier
 * 4. Generate AI business intelligence
 */
async function enrichLead(leadId) {
    const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error || !lead) return;

    console.log(`[ENRICH] ========================================`);
    console.log(`[ENRICH] Starting enrichment for: ${lead.business_name}`);

    // Update status
    await supabase.from('leads').update({ status: 'enriching' }).eq('id', leadId);

    // 0. Website Health Check
    const isSocial = lead.website && (
        lead.website.includes('instagram.com') ||
        lead.website.includes('facebook.com') ||
        lead.website.includes('linkedin.com') ||
        lead.website.includes('twitter.com') ||
        lead.website.includes('tiktok.com') ||
        lead.website.includes('youtube.com')
    );

    if (!lead.website || isSocial) {
        console.log(`[ENRICH] [ALERT] Social/Missing website. Marking flags.`);
        await supabase.from('leads').update({
            meta: {
                ...lead.meta,
                missing_web: !lead.website,
                is_social_web: isSocial
            }
        }).eq('id', leadId);
    }

    // 1. Web Scraping & Deep AI intelligence
    console.log(`[ENRICH] [STEP 1/4] Starting Deep Scrape & AI Analysis...`);
    let enrichmentData = { summary: "", keywords: [], icebreaker: "", found_contacts: [], ecommerce_signals: [], source_pages: [] };

    try {
        let scrapedTexts = [];
        if (lead.website && !isSocial) {
            const { scrapeWebsite } = require('./scraper');
            scrapedTexts = await scrapeWebsite(lead.website);
            console.log(`[ENRICH] Scraped ${scrapedTexts.length} pages/chunks from website.`);
        } else {
            console.log(`[ENRICH] No website or social link. Using GMB data for AI context.`);
            // Fallback for leads without website: Use name, category and city as context
            scrapedTexts = [`Business Name: ${lead.business_name}\nCategory: ${lead.search_query || lead.business_type}\nLocation: ${lead.city}, ${lead.address}`];
        }

        if (scrapedTexts.length > 0) {
            enrichmentData = await generatePersonalization(lead.business_name, scrapedTexts);
            console.log(`[ENRICH] AI discovered ${enrichmentData.found_contacts?.length || 0} potential contacts`);
        }
    } catch (err) {
        console.error(`[ENRICH] [ERROR] Scrape/AI Phase:`, err.message);
    }

    // 2. Email Verification & Channel Deduplication
    let verifiedEmails = [];
    const { verifyEmail } = require('./millionVerifier');

    // Get all unique emails from lead_channels and AI-found contacts
    const { data: currentChannels } = await supabase
        .from('lead_channels')
        .select('value')
        .eq('lead_id', leadId)
        .eq('type', 'email');

    const emailsToVerify = new Set(currentChannels?.map(c => c.value) || []);
    if (lead.email) emailsToVerify.add(lead.email);

    enrichmentData.found_contacts?.forEach(c => {
        if (c.email && c.email.includes('@') && !c.email.includes('no-email.com')) {
            emailsToVerify.add(c.email.toLowerCase().trim());
        }
    });

    console.log(`[ENRICH] [STEP 2/4] Verifying ${emailsToVerify.size} emails...`);

    for (const email of emailsToVerify) {
        try {
            const verification = await verifyEmail(email);
            if (['deliverable', 'risky', 'ok'].includes(verification.result || verification.status)) {
                verifiedEmails.push(email);
            }
        } catch (err) {
            console.error(`[ENRICH] Error verifying ${email}:`, err.message);
        }
    }

    // 3. Save AI Discovered Contacts & Channels (Deduplicated)
    console.log(`[ENRICH] [STEP 3/4] Saving channels & contacts...`);

    // Save NEW contacts found by AI to lead_channels
    const newChannels = [];
    const aiContacts = [];

    enrichmentData.found_contacts?.forEach(c => {
        if (c.email && c.email.includes('@')) {
            const email = c.email.toLowerCase().trim();
            // Only add if not already in currentChannels
            if (!currentChannels?.find(cc => cc.value === email)) {
                newChannels.push({
                    lead_id: leadId,
                    type: 'email',
                    value: email,
                    is_primary: false,
                    status: 'new',
                    meta: { source: 'ai_extraction', role: c.role, name: c.name }
                });
            }

            aiContacts.push({
                lead_id: leadId,
                name: c.name || 'Staff',
                role: c.role || 'Personnel',
                email: email,
                verified: verifiedEmails.includes(email),
                status: 'new'
            });
        }
    });

    if (newChannels.length > 0) {
        await supabase.from('lead_channels').upsert(newChannels, { onConflict: 'lead_id,type,value' });
    }
    if (aiContacts.length > 0) {
        await supabase.from('contacts').upsert(aiContacts, { onConflict: 'lead_id,email' });
    }

    // 4. Dual-Scoring & Re-calculation of Tier
    console.log(`[ENRICH] [STEP 4/4] Re-scoring lead...`);

    const hasVerifiedEmail = verifiedEmails.length > 0;

    // Promote first verified email to primary if current is not verified
    let finalEmail = lead.email;
    if (hasVerifiedEmail && (!lead.email || !verifiedEmails.includes(lead.email))) {
        finalEmail = verifiedEmails[0];
        console.log(`[ENRICH] Promoting ${finalEmail} to primary email`);
    }

    const { scoreLead } = require('../utils/scorer');
    const leadForScoring = {
        ...lead,
        email_primary: finalEmail,
        email_verified: hasVerifiedEmail,
        whatsapp_likely: lead.meta?.whatsapp_likely || false,
        phone_type: lead.meta?.phone_type || 'unknown'
    };

    const newScore = scoreLead(leadForScoring);

    // Final Update
    const { error: updateError } = await supabase.from('leads').update({
        status: 'enriched',
        pipeline_stage: newScore.tier === 'TRASH' ? 'discarded' : 'ready',
        routing_status: newScore.tier === 'TRASH' ? 'DISCARDED' : 'OUTREACH_READY',
        personalization_summary: enrichmentData.summary || lead.personalization_summary,
        icebreaker: enrichmentData.icebreaker || lead.icebreaker,
        email: finalEmail,
        lead_score: newScore.score,
        lead_tier: newScore.tier,
        score_detail: newScore, // Contains { score, tier, reasons }
        meta: {
            ...lead.meta,
            contexto_personalizado: enrichmentData.contexto_1_linea,
            categoria: enrichmentData.categoria,
            observacion_followup: enrichmentData.observacion_1linea,
            verified_emails: verifiedEmails,
            ai_summary_deep: enrichmentData.summary,
            missing_web: !lead.website,
            is_social_web: isSocial
        },
        updated_at: new Date().toISOString()
    }).eq('id', leadId);

    if (updateError) {
        console.error(`[ENRICH] Update error:`, updateError);
        return;
    }

    console.log(`[ENRICH] COMPLETED: ${lead.business_name} -> Tier: ${newScore.tier}`);
}

module.exports = { enrichLead };
