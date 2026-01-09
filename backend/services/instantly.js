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
    simulateEvent
};
