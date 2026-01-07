const axios = require('axios');
const { supabase } = require('./supabase');
require('dotenv').config();

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

/**
 * Verifies email using Hunter.io and caches the result
 */
async function verifyEmail(email) {
    if (!email) return { status: 'unknown' };

    // Check cache first
    const { data: cached } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .single();

    if (cached) return cached;

    try {
        const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
            params: {
                email,
                api_key: HUNTER_API_KEY
            }
        });

        const result = response.data.data;
        const status = result.result; // deliverable, risky, undeliverable, unknown

        const verification = {
            email,
            status,
            provider: 'hunter',
            raw_response: result,
            verified_at: new Date().toISOString()
        };

        // Save to cache
        await supabase.from('email_verifications').upsert(verification);

        return verification;
    } catch (err) {
        console.error('Hunter Verification Error:', err.message);
        return { status: 'error', message: err.message };
    }
}

/**
 * Find decision makers for a domain
 */
async function findContacts(domain, companyName) {
    if (!domain) return [];

    try {
        const response = await axios.get(`https://api.hunter.io/v2/domain-search`, {
            params: {
                domain,
                api_key: HUNTER_API_KEY,
                limit: 5
            }
        });

        const emails = response.data.data.emails || [];
        return emails.map(e => ({
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Generic Contact',
            role: e.position || 'Unknown',
            email: e.value,
            status: 'new'
        }));
    } catch (err) {
        console.error('Hunter Domain Search Error:', err.message);
        return [];
    }
}

module.exports = { verifyEmail, findContacts };
