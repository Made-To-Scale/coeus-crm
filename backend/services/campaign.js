const { supabase } = require('./supabase');

/**
 * Generate systematic campaign name
 * Format: EMAIL_ES_{CITY}_{ICP}_{SOURCE}_{TIER}_V{VERSION}
 */
function generateCampaignName(hypothesis) {
    const { city, icp, source, tier, version = 1 } = hypothesis;

    const cityNorm = (city || 'GENERAL').toUpperCase().replace(/\s+/g, '');
    const icpNorm = (icp || 'BUSINESS').toUpperCase().replace(/\s+/g, '');
    const sourceNorm = (source || 'GOOGLEMAPS').toUpperCase().replace(/\s+/g, '');
    const tierNorm = (tier || 'MIXED').toUpperCase();

    return `EMAIL_ES_${cityNorm}_${icpNorm}_${sourceNorm}_${tierNorm}_V${version}`;
}

/**
 * Create a new campaign
 */
async function createCampaign(hypothesis, templateConfig = {}, sendingConfig = {}) {
    console.log('[CAMPAIGN] Creating campaign...');

    const name = generateCampaignName(hypothesis);

    const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert([{
            name,
            version: hypothesis.version || 1,
            hypothesis,
            template_config: templateConfig,
            sending_config: sendingConfig,
            status: 'draft'
        }])
        .select()
        .single();

    if (error) {
        console.error('[CAMPAIGN] Error creating campaign:', error);
        throw error;
    }

    console.log('[CAMPAIGN] ✓ Campaign created:', campaign.id, '-', name);
    return campaign;
}

/**
 * Get all campaigns
 */
async function getCampaigns(filters = {}) {
    let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Get campaign by ID
 */
async function getCampaign(campaignId) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update campaign
 */
async function updateCampaign(campaignId, updates) {
    const { data, error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', campaignId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Launch campaign
 */
async function launchCampaign(campaignId) {
    console.log('[CAMPAIGN] Launching campaign:', campaignId);

    const { data, error } = await supabase
        .from('campaigns')
        .update({
            status: 'active',
            launched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

    if (error) throw error;

    console.log('[CAMPAIGN] ✓ Campaign launched');
    return data;
}

/**
 * Pause campaign
 */
async function pauseCampaign(campaignId) {
    console.log('[CAMPAIGN] Pausing campaign:', campaignId);

    const { data, error } = await supabase
        .from('campaigns')
        .update({
            status: 'paused',
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

    if (error) throw error;

    console.log('[CAMPAIGN] ✓ Campaign paused');
    return data;
}

/**
 * Delete campaign (only if draft)
 */
async function deleteCampaign(campaignId) {
    const campaign = await getCampaign(campaignId);

    if (campaign.status !== 'draft') {
        throw new Error('Can only delete draft campaigns');
    }

    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

    if (error) throw error;

    console.log('[CAMPAIGN] ✓ Campaign deleted');
    return { success: true };
}

/**
 * Get campaign statistics
 */
async function getCampaignStats(campaignId) {
    // Get all batch_leads for this campaign
    const { data: batchLeads, error } = await supabase
        .from('batch_leads')
        .select(`
      *,
      batch:batches!inner(campaign_id)
    `)
        .eq('batch.campaign_id', campaignId);

    if (error) {
        console.error('[CAMPAIGN] Error getting stats:', error);
        return {
            total: 0,
            enrolled: 0,
            sent: 0,
            opened: 0,
            replied: 0,
            bounced: 0,
            completed: 0
        };
    }

    const stats = {
        total: batchLeads.length,
        enrolled: batchLeads.filter(bl => bl.enrollment_status === 'enrolled' || bl.enrollment_status === 'sent').length,
        sent: batchLeads.filter(bl => bl.enrollment_status === 'sent').length,
        opened: 0, // Will be calculated from events
        replied: 0,
        bounced: 0,
        completed: batchLeads.filter(bl => bl.enrollment_status === 'completed').length
    };

    // Get events to calculate opened/replied/bounced
    const { data: events } = await supabase
        .from('outreach_events')
        .select('event_type, lead_id')
        .eq('campaign_id', campaignId);

    if (events) {
        const uniqueOpened = new Set();
        const uniqueReplied = new Set();
        const uniqueBounced = new Set();

        events.forEach(event => {
            if (event.event_type === 'opened') uniqueOpened.add(event.lead_id);
            if (event.event_type === 'replied') uniqueReplied.add(event.lead_id);
            if (event.event_type === 'bounced') uniqueBounced.add(event.lead_id);
        });

        stats.opened = uniqueOpened.size;
        stats.replied = uniqueReplied.size;
        stats.bounced = uniqueBounced.size;
    }

    return stats;
}

module.exports = {
    generateCampaignName,
    createCampaign,
    getCampaigns,
    getCampaign,
    updateCampaign,
    launchCampaign,
    pauseCampaign,
    deleteCampaign,
    getCampaignStats
};
