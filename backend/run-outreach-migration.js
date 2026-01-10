const { supabase } = require('./services/supabase');
require('dotenv').config();

async function createOutreachTables() {
    console.log('[MIGRATION] Creating outreach system tables...\n');

    // Since we can't execute raw SQL, we'll verify tables exist by trying to query them
    // The tables should be created manually in Supabase SQL Editor

    const tables = [
        { name: 'campaigns', exists: false },
        { name: 'batches', exists: false },
        { name: 'batch_leads', exists: false },
        { name: 'personalizations', exists: false },
        { name: 'outreach_events', exists: false },
        { name: 'lead_routing', exists: false }
    ];

    console.log('[CHECK] Verifying tables...\n');

    for (const table of tables) {
        const { data, error } = await supabase.from(table.name).select('*').limit(1);
        if (error) {
            console.log(`✗ ${table.name} - NOT FOUND`);
            console.log(`  Error: ${error.message}`);
        } else {
            console.log(`✓ ${table.name} - EXISTS`);
            table.exists = true;
        }
    }

    const missingTables = tables.filter(t => !t.exists);

    if (missingTables.length > 0) {
        console.log(`\n[ACTION REQUIRED] Please create the following tables manually in Supabase SQL Editor:`);
        console.log(`  URL: https://sssupabase.made-to-scale.com/project/default/sql`);
        console.log(`  File: backend/migrations/001_outreach_system.sql\n`);
        console.log(`Missing tables: ${missingTables.map(t => t.name).join(', ')}`);
        process.exit(1);
    } else {
        console.log('\n[SUCCESS] ✓ All tables exist!');
        process.exit(0);
    }
}

createOutreachTables();
