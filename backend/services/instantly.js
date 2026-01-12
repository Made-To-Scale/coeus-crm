const axios = require('axios');
const { supabase } = require('./supabase');

// Configuration
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || '';
const INSTANTLY_MODE = process.env.INSTANTLY_MODE || 'SIMULATION';
const INSTANTLY_WORKSPACE_ID = process.env.INSTANTLY_WORKSPACE_ID || '';
const INSTANTLY_BASE_URL = 'https://api.instantly.ai/api/v2';

console.log(`[INSTANTLY] Mode: ${INSTANTLY_MODE}`);

// ============================================================================
// CAMPAIGN MANAGEMENT
// ============================================================================

/**
 * Create a new campaign
 * @param {string} name - Campaign name
 * @param {object} settings - Campaign settings (steps, delays, etc.)
 * @returns {object} Campaign data
 */
async function createCampaign(name, settings = {}) {
    console.log(`[INSTANTLY] Creating campaign: ${name}`);

    if (INSTANTLY_MODE === 'SIMULATION') {
        // Simulation: Just save to local DB
        const simulatedId = `SIM_camp_${Date.now()}`;
        const { data, error } = await supabase
            .from('instantly_campaigns')
            .insert([{
                instantly_campaign_id: simulatedId,
                name,
                status: 'active',
                settings
            }])
            .select()
            .single();

        if (error) throw error;
        console.log(`[INSTANTLY SIM] Campaign created locally: ${data.id}`);
        return { ...data, simulated: true };
    } else {
        // Live: Call Instantly API
        const response = await axios.post(`${INSTANTLY_BASE_URL}/campaigns`, {
            name,
            workspace_id: INSTANTLY_WORKSPACE_ID,
            ...settings
        }, {
            headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` }
        });

        // Save to local DB for tracking
        const { data, error } = await supabase
            .from('instantly_campaigns')
            .insert([{
                instantly_campaign_id: response.data.id,
                name,
                status: 'active',
                settings
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

/**
 * Get all campaigns
 */
async function getCampaigns() {
    const { data, error } = await supabase
        .from('instantly_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get campaign by ID
 */
async function getCampaign(campaignId) {
    const { data, error } = await supabase
        .from('instantly_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update campaign settings
 */
async function updateCampaign(campaignId, updates) {
    const { data, error } = await supabase
        .from('instantly_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', campaignId)
        .select()
        .single();

    if (error) throw error;
    return data;
}
/**
 * Sync campaigns from Instantly API to local DB
 */
async function syncCampaigns() {
    console.log('[INSTANTLY] Syncing campaigns...');

    if (INSTANTLY_MODE === 'SIMULATION') {
        console.log('[INSTANTLY SIM] Nothing to sync in simulation mode');
        return await getCampaigns();
    }

    try {
        const response = await axios.get(`${INSTANTLY_BASE_URL}/campaign/list`, {
            headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` }
        });

        const campaigns = response.data || [];
        console.log(`[INSTANTLY] Found ${campaigns.length} campaigns in Instantly`);

        for (const camp of campaigns) {
            // Upsert into local DB
            await supabase
                .from('instantly_campaigns')
                .upsert({
                    instantly_campaign_id: camp.id,
                    name: camp.name,
                    status: camp.status === 0 ? 'paused' : 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'instantly_campaign_id' });
        }

        return await getCampaigns();
    } catch (err) {
        console.error('[INSTANTLY] Error syncing campaigns:', err.message);
        throw err;
    }
}

// ============================================================================
// LEAD ENROLLMENT
// ============================================================================

/**
 * Enroll a lead in a campaign
 * @param {string} leadId - Lead UUID
 * @param {string} campaignId - Campaign UUID
 * @param {object} variables - Personalization variables
 */
async function enrollLead(leadId, campaignId, variables = {}) {
    console.log(`[INSTANTLY] Enrolling lead ${leadId} in campaign ${campaignId}`);

    // 1. Get lead data
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) throw new Error('Lead not found');
    if (!lead.email) throw new Error('Lead has no email');

    // 2. Get campaign data
    const campaign = await getCampaign(campaignId);

    if (INSTANTLY_MODE === 'SIMULATION') {
        // Simulation: Just save enrollment locally
        const simulatedLeadId = `SIM_lead_${Date.now()}`;
        const { data: enrollment, error } = await supabase
            .from('instantly_enrollments')
            .insert([{
                lead_id: leadId,
                campaign_id: campaignId,
                instantly_lead_id: simulatedLeadId,
                status: 'active',
                current_step: 1,
                email_account: 'simulation@example.com',
                meta: variables
            }])
            .select()
            .single();

        if (error) throw error;

        // Auto-create a "sent" event for simulation
        await simulateEvent('sent', lead.email, {
            campaign_id: campaignId,
            enrollment_id: enrollment.id
        });

        console.log(`[INSTANTLY SIM] Lead enrolled locally: ${enrollment.id}`);
        return { ...enrollment, simulated: true };
    } else {
        // Live: Call Instantly API
        const response = await axios.post(
            `${INSTANTLY_BASE_URL}/campaigns/${campaign.instantly_campaign_id}/leads`,
            {
                email: lead.email,
                first_name: lead.business_name.split(' ')[0],
                company_name: lead.business_name,
                variables
            },
            {
                headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` }
            }
        );

        // Save enrollment to local DB
        const { data: enrollment, error } = await supabase
            .from('instantly_enrollments')
            .insert([{
                lead_id: leadId,
                campaign_id: campaignId,
                instantly_lead_id: response.data.id,
                status: 'active',
                current_step: 1,
                meta: variables
            }])
            .select()
            .single();

        if (error) throw error;
        return enrollment;
    }
}

/**
 * Pause a lead's sequence
 */
async function pauseLead(enrollmentId) {
    console.log(`[INSTANTLY] Pausing enrollment ${enrollmentId}`);

    const { data: enrollment, error: fetchError } = await supabase
        .from('instantly_enrollments')
        .select('*, instantly_campaigns(*)')
        .eq('id', enrollmentId)
        .single();

    if (fetchError) throw fetchError;

    if (INSTANTLY_MODE === 'SIMULATION') {
        const { data, error } = await supabase
            .from('instantly_enrollments')
            .update({ status: 'paused' })
            .eq('id', enrollmentId)
            .select()
            .single();

        if (error) throw error;
        console.log(`[INSTANTLY SIM] Enrollment paused`);
        return { ...data, simulated: true };
    } else {
        // Live: Call Instantly API
        await axios.post(
            `${INSTANTLY_BASE_URL}/leads/${enrollment.instantly_lead_id}/pause`,
            {},
            { headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` } }
        );

        const { data, error } = await supabase
            .from('instantly_enrollments')
            .update({ status: 'paused' })
            .eq('id', enrollmentId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

/**
 * Resume a paused lead
 */
async function resumeLead(enrollmentId) {
    console.log(`[INSTANTLY] Resuming enrollment ${enrollmentId}`);

    const { data: enrollment, error: fetchError } = await supabase
        .from('instantly_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single();

    if (fetchError) throw fetchError;

    if (INSTANTLY_MODE === 'SIMULATION') {
        const { data, error } = await supabase
            .from('instantly_enrollments')
            .update({ status: 'active' })
            .eq('id', enrollmentId)
            .select()
            .single();

        if (error) throw error;
        console.log(`[INSTANTLY SIM] Enrollment resumed`);
        return { ...data, simulated: true };
    } else {
        // Live: Call Instantly API
        await axios.post(
            `${INSTANTLY_BASE_URL}/leads/${enrollment.instantly_lead_id}/resume`,
            {},
            { headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` } }
        );

        const { data, error } = await supabase
            .from('instantly_enrollments')
            .update({ status: 'active' })
            .eq('id', enrollmentId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

/**
 * Get enrollment status for a lead
 */
async function getLeadEnrollment(leadId, campaignId = null) {
    let query = supabase
        .from('instantly_enrollments')
        .select('*, instantly_campaigns(*)')
        .eq('lead_id', leadId);

    if (campaignId) {
        query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query.order('enrolled_at', { ascending: false });

    if (error) throw error;
    return campaignId ? (data?.[0] || null) : (data || []);
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get campaign statistics
 */
async function getCampaignStats(campaignId) {
    // Count enrollments by status
    const { data: enrollments, error } = await supabase
        .from('instantly_enrollments')
        .select('status, last_event_type')
        .eq('campaign_id', campaignId);

    if (error) throw error;

    const stats = {
        total: enrollments.length,
        active: enrollments.filter(e => e.status === 'active').length,
        paused: enrollments.filter(e => e.status === 'paused').length,
        completed: enrollments.filter(e => e.status === 'completed').length,
        replied: enrollments.filter(e => e.last_event_type === 'replied').length,
        bounced: enrollments.filter(e => e.last_event_type === 'bounced').length,
        opened: enrollments.filter(e => e.last_event_type === 'opened').length
    };

    // Update campaign stats
    await supabase
        .from('instantly_campaigns')
        .update({ stats, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

    return stats;
}

/**
 * Sync events from Instantly API for a campaign
 * Sustituto de webhooks para plan Growth
 */
async function syncEvents(campaignId) {
    console.log(`[INSTANTLY] Syncing events for campaign ${campaignId}...`);

    const campaign = await getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (INSTANTLY_MODE === 'SIMULATION') {
        console.log('[INSTANTLY SIM] Nothing to sync in simulation mode');
        return [];
    }

    try {
        // Fetch events from Instantly API
        // Instantly V2 has /campaign/{id}/events
        const response = await axios.get(`${INSTANTLY_BASE_URL}/campaign/${campaign.instantly_campaign_id}/events`, {
            headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` }
        });

        const events = response.data || [];
        console.log(`[INSTANTLY] Found ${events.length} events across all time`);

        for (const event of events) {
            // Find lead by email
            const { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('email', event.email)
                .single();

            if (!lead) continue;

            // Upsert into outreach_events
            const { data: existingEvent } = await supabase
                .from('outreach_events')
                .select('id')
                .eq('external_id', event.id)
                .single();

            if (!existingEvent) {
                await supabase.from('outreach_events').insert([{
                    lead_id: lead.id,
                    campaign_id: campaignId,
                    event_type: event.type, // sent, opened, clicked, replied, bounced
                    provider: 'instantly',
                    external_id: event.id,
                    occurred_at: event.timestamp || new Date().toISOString(),
                    provider_payload: event
                }]);

                // Update enrollment status if it's a critical event
                if (['replied', 'bounced'].includes(event.type)) {
                    await supabase
                        .from('instantly_enrollments')
                        .update({
                            status: event.type === 'replied' ? 'completed' : 'bounced',
                            last_event_type: event.type
                        })
                        .eq('lead_id', lead.id)
                        .eq('campaign_id', campaignId);
                }
            }
        }

        return await getCampaignStats(campaignId);
    } catch (err) {
        console.error('[INSTANTLY] Error syncing events:', err.message);
        throw err;
    }
}

// ============================================================================
// SIMULATION HELPERS
// ============================================================================

/**
 * Simulate an event (for testing without live API)
 */
async function simulateEvent(eventType, leadEmail, meta = {}) {
    console.log(`[INSTANTLY SIM] Simulating event: ${eventType} for ${leadEmail}`);

    // Find lead by email
    const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', leadEmail)
        .single();

    if (!lead) {
        console.warn(`[INSTANTLY SIM] Lead not found: ${leadEmail}`);
        return null;
    }

    // Create event in comm_events
    const { trackEvent } = require('./tracking');
    await trackEvent(lead.id, {
        eventType,
        provider: 'instantly',
        externalId: `SIM_${eventType}_${Date.now()}`,
        meta: { ...meta, simulated: true },
        occurredAt: new Date().toISOString()
    });

    // Update enrollment if exists
    if (meta.enrollment_id) {
        await supabase
            .from('instantly_enrollments')
            .update({
                last_event_at: new Date().toISOString(),
                last_event_type: eventType,
                status: eventType === 'replied' ? 'completed' :
                    eventType === 'bounced' ? 'bounced' : 'active'
            })
            .eq('id', meta.enrollment_id);
    }

    return { simulated: true, event_type: eventType };
}

/**
 * Enroll leads from a batch into Instantly campaign
 */
async function enrollLeadsInCampaign(campaignId, batchId) {
    console.log(`[INSTANTLY] Enrolling batch ${batchId} in campaign ${campaignId}`);

    // Get campaign
    const { supabase } = require('./supabase');
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    // Get batch_leads with validated personalization
    const { data: batchLeads } = await supabase
        .from('batch_leads')
        .select('*')
        .eq('batch_id', batchId)
        .eq('personalization_status', 'validated')
        .eq('enrollment_status', 'not_enrolled');

    if (!batchLeads || batchLeads.length === 0) {
        console.log('[INSTANTLY] No leads ready for enrollment');
        return { success: 0, failed: 0, total: 0 };
    }

    console.log(`[INSTANTLY] Enrolling ${batchLeads.length} leads...`);

    const results = { success: 0, failed: 0, total: batchLeads.length };

    for (const bl of batchLeads) {
        try {
            // Get lead data
            const { data: lead } = await supabase
                .from('leads')
                .select('*')
                .eq('id', bl.lead_id)
                .single();

            // Get personalization
            const { data: personalization } = await supabase
                .from('personalizations')
                .select('*')
                .eq('id', bl.personalization_id)
                .single();

            const payload = {
                email: bl.contact_email || lead.email,
                first_name: lead.business_name.split(' ')[0],
                company_name: lead.business_name,
                variables: {
                    business_name: lead.business_name,
                    first_line: personalization.first_line,
                    why_you: personalization.why_you,
                    micro_offer: personalization.micro_offer,
                    cta_question: personalization.cta_question
                }
            };

            if (INSTANTLY_MODE === 'SIMULATION') {
                // Simulation mode
                const simulatedId = `SIM_prospect_${Date.now()}_${Math.random()}`;

                await supabase
                    .from('batch_leads')
                    .update({
                        instantly_prospect_id: simulatedId,
                        enrollment_status: 'enrolled',
                        enrolled_at: new Date().toISOString()
                    })
                    .eq('id', bl.id);

                // Create enrolled event
                await supabase
                    .from('outreach_events')
                    .insert([{
                        lead_id: bl.lead_id,
                        campaign_id: campaignId,
                        batch_id: batchId,
                        batch_lead_id: bl.id,
                        event_type: 'enrolled',
                        provider: 'instantly',
                        external_id: simulatedId,
                        occurred_at: new Date().toISOString(),
                        provider_payload: { simulated: true, payload }
                    }]);

                results.success++;
                console.log(`  ✓ [SIM] Enrolled: ${lead.business_name}`);
            } else {
                // Live mode - call Instantly API
                const response = await axios.post(
                    `${INSTANTLY_BASE_URL}/campaigns/${campaign.instantly_campaign_id}/leads`,
                    payload,
                    { headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}` } }
                );

                await supabase
                    .from('batch_leads')
                    .update({
                        instantly_prospect_id: response.data.id,
                        enrollment_status: 'enrolled',
                        enrolled_at: new Date().toISOString()
                    })
                    .eq('id', bl.id);

                await supabase
                    .from('outreach_events')
                    .insert([{
                        lead_id: bl.lead_id,
                        campaign_id: campaignId,
                        batch_id: batchId,
                        batch_lead_id: bl.id,
                        event_type: 'enrolled',
                        provider: 'instantly',
                        external_id: response.data.id,
                        occurred_at: new Date().toISOString(),
                        provider_payload: response.data
                    }]);

                results.success++;
                console.log(`  ✓ Enrolled: ${lead.business_name}`);
            }
        } catch (error) {
            console.error(`  ✗ Failed:`, error.message);
            results.failed++;
        }
    }

    console.log(`[INSTANTLY] ✓ Enrollment complete: ${results.success} success, ${results.failed} failed`);
    return results;
}

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaign,
    updateCampaign,
    enrollLead,
    pauseLead,
    resumeLead,
    getLeadEnrollment,
    getCampaignStats,
    simulateEvent,
    enrollLeadsInCampaign,
    syncCampaigns,
    syncEvents
};

