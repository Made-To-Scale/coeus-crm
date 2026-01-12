const { supabase } = require('./supabase');
const { generatePersonalizationBlocks } = require('./llm');

/**
 * Validate personalization blocks quality
 */
function validateBlocks(blocks, context) {
    let quality_score = 1.0;
    let quality_flag = 'excellent';

    // Check 1: Not empty
    if (!blocks.first_line || blocks.first_line.length < 10) {
        return { quality_flag: 'failed', quality_score: 0 };
    }

    // Check 2: Not generic
    const genericPhrases = ['me gustaría', 'estoy interesado', 'he visto que', 'quería contactar'];
    if (genericPhrases.some(p => blocks.first_line.toLowerCase().includes(p))) {
        quality_score -= 0.3;
        quality_flag = 'needs_review';
    }

    // Check 3: Mentions something specific
    const hasSpecificity =
        blocks.first_line.includes(context.business_name) ||
        blocks.first_line.includes(context.city) ||
        blocks.first_line.includes(context.business_type) ||
        blocks.first_line.includes(context.categoria);

    if (!hasSpecificity) {
        quality_score -= 0.2;
    }

    // Check 4: Appropriate length (not too long)
    const wordCount = blocks.first_line.split(' ').length;
    if (wordCount > 25) {
        quality_score -= 0.1;
    }

    // Check 5: All blocks present
    if (!blocks.why_you || !blocks.micro_offer || !blocks.cta_question) {
        quality_score -= 0.2;
    }

    // Determine final flag
    if (quality_score >= 0.9) quality_flag = 'excellent';
    else if (quality_score >= 0.7) quality_flag = 'good';
    else if (quality_score >= 0.4) quality_flag = 'needs_review';
    else quality_flag = 'failed';

    return { quality_flag, quality_score };
}

/**
 * Generate blocks for a single lead
 */
async function generateBlocksForLead(leadId, campaignId, batchId) {
    console.log('[PERSONALIZATION] Generating blocks for lead:', leadId);

    // Get lead with all context
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) {
        console.error('[PERSONALIZATION] Lead not found:', leadId);
        throw new Error('Lead not found');
    }

    // Prepare context
    const context = {
        business_name: lead.business_name,
        city: lead.city,
        business_type: lead.business_type,
        website_summary: lead.personalization_summary,
        personalization_summary: lead.personalization_summary,
        contexto_personalizado: lead.meta?.contexto_personalizado,
        rating: lead.rating,
        reviews_count: lead.reviews_count,
        has_ecommerce: lead.meta?.is_ecommerce,
        categoria: lead.meta?.categoria
    };

    // Generate blocks with AI
    const blocks = await generatePersonalizationBlocks(context);

    // Validate
    const { quality_flag, quality_score } = validateBlocks(blocks, context);

    console.log('[PERSONALIZATION] Quality:', quality_flag, `(${quality_score})`);

    // Save to database
    const { data: personalization, error: saveError } = await supabase
        .from('personalizations')
        .insert([{
            lead_id: leadId,
            campaign_id: campaignId,
            batch_id: batchId,
            first_line: blocks.first_line,
            why_you: blocks.why_you,
            micro_offer: blocks.micro_offer,
            cta_question: blocks.cta_question,
            prompt_version: 'v1.0',
            model: process.env.LLM_PERSONALIZATION_MODEL || 'anthropic/claude-3-haiku',
            quality_flag,
            quality_score,
            context_snapshot: context
        }])
        .select()
        .single();

    if (saveError) {
        console.error('[PERSONALIZATION] Error saving:', saveError);
        throw saveError;
    }

    // Update batch_lead
    await supabase
        .from('batch_leads')
        .update({
            personalization_status: quality_flag === 'failed' ? 'failed' : 'validated',
            personalization_id: personalization.id,
            updated_at: new Date().toISOString()
        })
        .eq('lead_id', leadId)
        .eq('batch_id', batchId);

    console.log('[PERSONALIZATION] ✓ Blocks generated and saved');

    return personalization;
}

/**
 * Generate blocks for entire batch
 */
async function generateBlocksForBatch(batchId) {
    console.log('[PERSONALIZATION] Generating blocks for batch:', batchId);

    // Get batch info
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('campaign_id')
        .eq('id', batchId)
        .single();

    if (batchError) throw batchError;

    // Get all batch_leads with pending personalization
    const { data: batchLeads, error: leadsError } = await supabase
        .from('batch_leads')
        .select('id, lead_id')
        .eq('batch_id', batchId)
        .eq('personalization_status', 'pending');

    if (leadsError) throw leadsError;

    console.log('[PERSONALIZATION] Found', batchLeads.length, 'leads to personalize');

    const results = {
        total: batchLeads.length,
        success: 0,
        failed: 0,
        needs_review: 0
    };

    // Generate blocks for each lead
    for (const bl of batchLeads) {
        try {
            // Mark as generating
            await supabase
                .from('batch_leads')
                .update({ personalization_status: 'generating' })
                .eq('id', bl.id);

            const personalization = await generateBlocksForLead(bl.lead_id, batch.campaign_id, batchId);

            if (personalization.quality_flag === 'failed') {
                results.failed++;
            } else if (personalization.quality_flag === 'needs_review') {
                results.needs_review++;
            } else {
                results.success++;
            }
        } catch (error) {
            console.error('[PERSONALIZATION] Error for lead', bl.lead_id, ':', error.message);
            results.failed++;

            // Mark as failed
            await supabase
                .from('batch_leads')
                .update({ personalization_status: 'failed' })
                .eq('id', bl.id);
        }
    }

    console.log('[PERSONALIZATION] ✓ Batch completed:', results);

    return results;
}

/**
 * Regenerate blocks for a lead (with fallback)
 */
async function regenerateBlocks(personalizationId) {
    console.log('[PERSONALIZATION] Regenerating blocks:', personalizationId);

    const { data: existing, error } = await supabase
        .from('personalizations')
        .select('*')
        .eq('id', personalizationId)
        .single();

    if (error) throw error;

    // Generate new blocks
    const blocks = await generatePersonalizationBlocks(existing.context_snapshot);
    const { quality_flag, quality_score } = validateBlocks(blocks, existing.context_snapshot);

    // Update
    const { data: updated, error: updateError } = await supabase
        .from('personalizations')
        .update({
            first_line: blocks.first_line,
            why_you: blocks.why_you,
            micro_offer: blocks.micro_offer,
            cta_question: blocks.cta_question,
            quality_flag,
            quality_score,
            updated_at: new Date().toISOString()
        })
        .eq('id', personalizationId)
        .select()
        .single();

    if (updateError) throw updateError;

    // Update batch_lead status
    await supabase
        .from('batch_leads')
        .update({
            personalization_status: quality_flag === 'failed' ? 'failed' : 'validated'
        })
        .eq('personalization_id', personalizationId);

    console.log('[PERSONALIZATION] ✓ Blocks regenerated');

    return updated;
}

/**
 * Update blocks manually
 */
async function updateBlocksManually(personalizationId, blocks) {
    const { data, error } = await supabase
        .from('personalizations')
        .update({
            first_line: blocks.first_line,
            why_you: blocks.why_you,
            micro_offer: blocks.micro_offer,
            cta_question: blocks.cta_question,
            quality_flag: 'excellent', // Manual edits are considered excellent
            quality_score: 1.0,
            updated_at: new Date().toISOString()
        })
        .eq('id', personalizationId)
        .select()
        .single();

    if (error) throw error;

    // Update batch_lead status
    await supabase
        .from('batch_leads')
        .update({ personalization_status: 'validated' })
        .eq('personalization_id', personalizationId);

    console.log('[PERSONALIZATION] ✓ Blocks updated manually');

    return data;
}

module.exports = {
    validateBlocks,
    generateBlocksForLead,
    generateBlocksForBatch,
    regenerateBlocks,
    updateBlocksManually
};
