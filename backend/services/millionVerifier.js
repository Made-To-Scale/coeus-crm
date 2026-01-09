const axios = require('axios');
const { supabase } = require('./supabase');
require('dotenv').config();

const MILLION_VERIFIER_API_KEY = process.env.MILLION_VERIFIER_API_KEY || process.env.MILLIONVERIFIER_API_KEY;

/**
 * Verifies email using Million Verifier and caches the result
 */
async function verifyEmail(email) {
    if (!email || !email.includes('@')) {
        console.log(`[MILLION_VERIFIER] Invalid email format: ${email}`);
        return { result: 'invalid', status: 'invalid' };
    }

    // Check cache first
    const { data: cached } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

    if (cached) {
        console.log(`[MILLION_VERIFIER] Cache hit for ${email}: ${cached.result || cached.status}`);
        return cached;
    }

    if (!MILLION_VERIFIER_API_KEY) {
        console.warn('[MILLION_VERIFIER] API key not configured, skipping verification');
        return { result: 'unknown', status: 'unknown', email };
    }

    try {
        console.log(`[MILLION_VERIFIER] Verifying: ${email}`);
        const response = await axios.get(`https://api.millionverifier.com/api/v3/`, {
            params: {
                api: MILLION_VERIFIER_API_KEY,
                email: email,
                timeout: 10
            },
            timeout: 15000
        });

        const result = response.data;

        // Million Verifier returns: ok, catch_all, unknown, disposable, invalid
        const verification = {
            email: email.toLowerCase(),
            result: result.result || result.resultcode || 'unknown',
            status: result.result || result.resultcode || 'unknown',
            provider: 'million_verifier',
            raw_response: result,
            verified_at: new Date().toISOString()
        };

        // Save to cache
        await supabase.from('email_verifications').upsert(verification, { onConflict: 'email' });

        console.log(`[MILLION_VERIFIER] Result for ${email}: ${verification.result}`);
        return verification;
    } catch (err) {
        console.error(`[MILLION_VERIFIER] Error verifying ${email}:`, err.response?.data || err.message);

        // Return unknown status on error but don't block the process
        return {
            result: 'error',
            status: 'error',
            email,
            error: err.message
        };
    }
}

module.exports = { verifyEmail };
