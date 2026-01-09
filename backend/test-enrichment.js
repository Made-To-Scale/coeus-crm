/**
 * Test script to validate the enrichment pipeline
 * Run with: node test-enrichment.js
 */

const { enrichLead } = require('./services/enrichment');
const { supabase } = require('./services/supabase');
require('dotenv').config();

async function testEnrichment() {
    console.log('='.repeat(60));
    console.log('ENRICHMENT PIPELINE TEST');
    console.log('='.repeat(60));

    try {
        // Find a lead to test with
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'new')
            .limit(1);

        if (error) {
            console.error('Error fetching lead:', error);
            return;
        }

        if (!leads || leads.length === 0) {
            console.log('No leads found with status "new". Please run a scrape first.');
            return;
        }

        const testLead = leads[0];
        console.log(`\nTesting with lead: ${testLead.business_name}`);
        console.log(`Lead ID: ${testLead.id}`);
        console.log(`Website: ${testLead.website || 'N/A'}`);
        console.log(`Email: ${testLead.email || 'N/A'}`);
        console.log(`Phone: ${testLead.phone_number || 'N/A'}`);
        console.log('\n' + '='.repeat(60));
        console.log('STARTING ENRICHMENT...');
        console.log('='.repeat(60) + '\n');

        // Run enrichment
        await enrichLead(testLead.id);

        // Check results
        console.log('\n' + '='.repeat(60));
        console.log('ENRICHMENT COMPLETE - CHECKING RESULTS...');
        console.log('='.repeat(60) + '\n');

        const { data: enrichedLead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', testLead.id)
            .single();

        console.log('✅ Lead Status:', enrichedLead.status);
        console.log('✅ Routing Status:', enrichedLead.routing_status);
        console.log('✅ AI Summary:', enrichedLead.personalization_summary ? 'YES' : 'NO');
        console.log('✅ Icebreaker:', enrichedLead.icebreaker ? 'YES' : 'NO');
        console.log('✅ Keywords:', enrichedLead.meta?.keywords?.length || 0);
        console.log('✅ Verified Emails:', enrichedLead.meta?.verified_emails?.length || 0);
        console.log('✅ Total Contacts Found:', enrichedLead.meta?.total_contacts_found || 0);

        // Check contacts table
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('lead_id', testLead.id);

        console.log('\n📧 Contacts in Database:', contacts?.length || 0);
        if (contacts && contacts.length > 0) {
            contacts.forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.name} (${c.role}) - ${c.email} - Source: ${c.source}`);
            });
        }

        // Check email channels
        const { data: channels } = await supabase
            .from('lead_channels')
            .select('*')
            .eq('lead_id', testLead.id)
            .eq('type', 'email');

        console.log('\n📬 Email Channels from Apify:', channels?.length || 0);
        if (channels && channels.length > 0) {
            channels.forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.value} (Primary: ${c.is_primary})`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('='.repeat(60));

        // Summary
        const success =
            enrichedLead.status === 'enriched' &&
            (enrichedLead.routing_status === 'OUTREACH_READY' || enrichedLead.routing_status === 'ENRICH_MANUAL');

        if (success) {
            console.log('\n✅ TEST PASSED - Enrichment pipeline working correctly!');
        } else {
            console.log('\n❌ TEST FAILED - Check logs above for issues');
        }

    } catch (err) {
        console.error('\n❌ TEST ERROR:', err.message);
        console.error(err.stack);
    }

    process.exit(0);
}

testEnrichment();
