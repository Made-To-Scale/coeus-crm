const { supabase } = require('./services/supabase');
require('dotenv').config();

async function checkSchema() {
    try {
        console.log('--- Checking Leads Table ---');
        // We use a query that fails if the table doesn't exist but gives column info if it does
        const { data: leads, error: leadsError } = await supabase.from('leads').select('*').limit(1);
        if (leadsError) {
            console.error('Leads Table Error:', leadsError.message);
        } else if (leads.length > 0) {
            console.log('Leads Columns:', Object.keys(leads[0]));
        } else {
            console.log('Leads Table is empty, but exists.');
        }

        console.log('\n--- Checking Contacts Table ---');
        const { data: contacts, error: contactsError } = await supabase.from('contacts').select('*').limit(1);
        if (contactsError) {
            console.error('Contacts Table Error:', contactsError.message);
        } else {
            console.log('Contacts Table exists.');
            if (contacts.length > 0) console.log('Contacts Columns:', Object.keys(contacts[0]));
        }

        console.log('\n--- Checking Scrape Runs Table ---');
        const { data: runs, error: runsError } = await supabase.from('scrape_runs').select('*').limit(1);
        if (runsError) {
            console.error('Scrape Runs Table Error:', runsError.message);
        } else {
            console.log('Scrape Runs Table exists.');
        }

    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
    process.exit(0);
}

checkSchema();
