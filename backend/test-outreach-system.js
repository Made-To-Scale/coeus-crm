const { supabase } = require('./services/supabase');
const { createCampaign } = require('./services/campaign');
const { createBatchFromFilters } = require('./services/batch');
const { generateBlocksForBatch } = require('./services/personalization');

async function testOutreachSystem() {
    console.log('\n=== TESTING OUTREACH SYSTEM ===\n');

    try {
        // 1. Test campaign creation
        console.log('[TEST 1] Creating test campaign...');
        const campaign = await createCampaign({
            city: 'Madrid',
            icp: 'Centro de Estética',
            source: 'google_maps',
            tier: 'GOLD',
            version: 1
        });
        console.log('✓ Campaign created:', campaign.name);

        // 2. Test batch creation
        console.log('\n[TEST 2] Creating batch with filters...');
        const batch = await createBatchFromFilters(campaign.id, {
            channel: 'EMAIL',
            tier: ['GOLD', 'SILVER'],
            city: 'Madrid',
            exclusions: {
                do_not_contact: false
            }
        });
        console.log('✓ Batch created with', batch.total_leads, 'leads');

        // 3. Test personalization (just 1 lead)
        console.log('\n[TEST 3] Generating personalization for first lead...');
        const { data: firstBatchLead } = await supabase
            .from('batch_leads')
            .select('lead_id')
            .eq('batch_id', batch.id)
            .limit(1)
            .single();

        if (firstBatchLead) {
            const { generateBlocksForLead } = require('./services/personalization');
            const personalization = await generateBlocksForLead(
                firstBatchLead.lead_id,
                campaign.id,
                batch.id
            );
            console.log('✓ Personalization generated:');
            console.log('  First line:', personalization.first_line);
            console.log('  Quality:', personalization.quality_flag, `(${personalization.quality_score})`);
        }

        console.log('\n=== ALL TESTS PASSED ===\n');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ TEST FAILED:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testOutreachSystem();
