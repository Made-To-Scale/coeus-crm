const { supabase } = require('./supabase');

/**
 * Create batch from filters
 */
async function createBatchFromFilters(campaignId, filters) {
    console.log('[BATCH] Creating batch for campaign:', campaignId);
    console.log('[BATCH] Filters:', JSON.stringify(filters, null, 2));

    // Build query to find leads
    let query = supabase
        .from('leads')
        .select('id, email, business_name, city, lead_tier');

    // Apply filters
    if (filters.channel === 'EMAIL') {
        query = query.not('email', 'is', null);
    }

    if (filters.email_verified) {
        // Check if email is in verified_emails array in meta
        query = query.not('meta->verified_emails', 'is', null);
    }

    if (filters.tier) {
        const tiers = Array.isArray(filters.tier) ? filters.tier : [filters.tier];
        query = query.in('lead_tier', tiers);
    }

    if (filters.city) {
        // Case-insensitive search
        query = query.ilike('city', filters.city);
    }

    // Map ICP from UI to business_type or niche_tag in DB
    const businessTypeQuery = filters.business_type || filters.icp;
    if (businessTypeQuery) {
        // Search in both business_type and niche_tag using OR logic
        // For simplicity, we search business_type with ilike. 
        // If we want OR, we need a complex query, but let's start with business_type
        query = query.ilike('business_type', `%${businessTypeQuery}%`);
    }

    if (filters.niche_tag) {
        query = query.ilike('niche_tag', `%${filters.niche_tag}%`);
    }

    if (filters.digital_maturity) {
        const maturities = Array.isArray(filters.digital_maturity) ? filters.digital_maturity : [filters.digital_maturity];
        query = query.in('digital_maturity', maturities);
    }

    // Exclusions
    if (filters.exclusions?.do_not_contact === false) {
        query = query.eq('do_not_contact', false);
    }

    if (filters.exclusions?.already_in_campaign === false) {
        // Get leads already enrolled
        const { data: enrolledLeads } = await supabase
            .from('batch_leads')
            .select('lead_id')
            .in('enrollment_status', ['enrolled', 'sent']);

        if (enrolledLeads && enrolledLeads.length > 0) {
            const enrolledIds = enrolledLeads.map(e => e.lead_id);
            query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
        }
    }

    // Execute query
    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
        console.error('[BATCH] Error querying leads:', leadsError);
        throw leadsError;
    }

    console.log('[BATCH] Found', leads.length, 'leads matching filters');

    if (leads.length === 0) {
        throw new Error('No leads found matching filters');
    }

    // Create batch
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert([{
            campaign_id: campaignId,
            filters_snapshot: filters,
            total_leads: leads.length,
            status: 'created'
        }])
        .select()
        .single();

    if (batchError) {
        console.error('[BATCH] Error creating batch:', batchError);
        throw batchError;
    }

    console.log('[BATCH] ✓ Batch created:', batch.id);

    // Insert batch_leads
    const batchLeadsData = leads.map(lead => ({
        batch_id: batch.id,
        lead_id: lead.id,
        contact_email: lead.email,
        personalization_status: 'pending',
        enrollment_status: 'not_enrolled'
    }));

    const { error: insertError } = await supabase
        .from('batch_leads')
        .insert(batchLeadsData);

    if (insertError) {
        console.error('[BATCH] Error inserting batch_leads:', insertError);
        throw insertError;
    }

    console.log('[BATCH] ✓ Inserted', batchLeadsData.length, 'batch_leads');

    return batch;
}

/**
 * Get batch leads
 */
async function getBatchLeads(batchId, filters = {}) {
    let query = supabase
        .from('batch_leads')
        .select(`
      *,
      lead:leads(id, business_name, email, city, lead_tier, business_type),
      personalization:personalizations(*)
    `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

    if (filters.personalization_status) {
        query = query.eq('personalization_status', filters.personalization_status);
    }

    if (filters.enrollment_status) {
        query = query.eq('enrollment_status', filters.enrollment_status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Get batch statistics
 */
async function getBatchStats(batchId) {
    const { data: batchLeads, error } = await supabase
        .from('batch_leads')
        .select('personalization_status, enrollment_status')
        .eq('batch_id', batchId);

    if (error) throw error;

    const stats = {
        total: batchLeads.length,
        personalization: {
            pending: batchLeads.filter(bl => bl.personalization_status === 'pending').length,
            generating: batchLeads.filter(bl => bl.personalization_status === 'generating').length,
            validated: batchLeads.filter(bl => bl.personalization_status === 'validated').length,
            failed: batchLeads.filter(bl => bl.personalization_status === 'failed').length,
            needs_review: batchLeads.filter(bl => bl.personalization_status === 'needs_review').length
        },
        enrollment: {
            not_enrolled: batchLeads.filter(bl => bl.enrollment_status === 'not_enrolled').length,
            enrolled: batchLeads.filter(bl => bl.enrollment_status === 'enrolled').length,
            sent: batchLeads.filter(bl => bl.enrollment_status === 'sent').length,
            replied: batchLeads.filter(bl => bl.enrollment_status === 'replied').length,
            bounced: batchLeads.filter(bl => bl.enrollment_status === 'bounced').length,
            completed: batchLeads.filter(bl => bl.enrollment_status === 'completed').length
        }
    };

    return stats;
}

/**
 * Exclude lead from batch
 */
async function excludeLeadFromBatch(batchLeadId) {
    const { error } = await supabase
        .from('batch_leads')
        .delete()
        .eq('id', batchLeadId);

    if (error) throw error;

    console.log('[BATCH] ✓ Lead excluded from batch');
    return { success: true };
}

/**
 * Approve batch (mark as ready)
 */
async function approveBatch(batchId) {
    const { data, error } = await supabase
        .from('batches')
        .update({
            status: 'ready',
            updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select()
        .single();

    if (error) throw error;

    console.log('[BATCH] ✓ Batch approved and ready');
    return data;
}

module.exports = {
    createBatchFromFilters,
    getBatchLeads,
    getBatchStats,
    excludeLeadFromBatch,
    approveBatch
};
