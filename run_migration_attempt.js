require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'coeus' }
});

async function runMigration() {
    console.log('Running migration...');
    const sqlPath = path.join(__dirname, 'backend', 'crm_3_0_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon if multiple statements, but here it's simple
    // Supabase JS client doesn't support raw SQL directly on table query unless via rpc, 
    // BUT we can use pg driver OR just copy paste to dashboard. 
    // Wait, the previous `db_update.sql` was likely manual. 
    // Since I don't have direct SQL access via JS client without RPC, 
    // I will try to use the `rpc` if a `exec_sql` function exists, OR just log it for the user if I can't.
    // However, I see I have `ssh` access in the metadata? No, that's the user's terminal.

    // Actually, I can use the `postgres` package if installed, but checking package.json...
    // Let's assume I can't easily run DDL via supabase-js client standard methods.

    // PLAN B: Notify user? No, I should try to solve it.
    // Often projects expose a `rpc` for this or use a specific connection string.

    // Let's try to mimic what I did before? 
    // Actually, checking previous turns, I see `backend/db_update.sql` was just edited, not run?
    // Oh, I see "Run migration" in my plan.

    // Let's try to use `psql` if available?
    // Or just ask Supabase to run it via an arbitrary query if we have a "query" helper?

    // Let's look at `backend/package.json` to see dependencies.
    console.log('Migration SQL:', sql);
    console.log('Please run this in Supabase SQL Editor if automation fails.');

    // Attempting via RPC if exists, else just printing.
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
        console.error('RPC exec_sql failed (expected if not set up):', error.message);
        // Fallback: Using `pg` if available?
    } else {
        console.log('Migration executed via RPC!');
    }
}

// Check package.json for pg
// actually, I'll just write a script that tries to connect via connection string in .env if available
// But the user has `VITE_SUPABASE_URL`.
// Let's just create the file and TRY to check if `pg` is installed.

console.log('Checking for pg...');
try {
    const { Client } = require('pg');
    // If we have a DB_URL or DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const client = new Client({ connectionString: dbUrl });
        await client.connect();
        await client.query(sql);
        await client.end();
        console.log('Migration success via PG!');
    }
} catch (e) {
    console.log('PG driver not found or connection failed:', e.message);
}

runMigration();
