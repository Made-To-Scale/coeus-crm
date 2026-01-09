/**
 * Test script to validate external API connections
 * Run with: node test-external-apis.js
 */

require('dotenv').config();
const axios = require('axios');

async function testAPIs() {
    console.log('='.repeat(60));
    console.log('EXTERNAL API CONNECTION TEST');
    console.log('='.repeat(60));

    const results = {
        apify: false,
        millionVerifier: false,
        openRouter: false
    };

    // Test Apify
    console.log('\n1. Testing Apify API...');
    try {
        const response = await axios.get(`https://api.apify.com/v2/acts?token=${process.env.APIFY_API_KEY}&limit=1`);
        if (response.status === 200) {
            console.log('   ✅ Apify API: Connected');
            results.apify = true;
        }
    } catch (err) {
        console.log('   ❌ Apify API: Failed -', err.message);
    }

    // Test Million Verifier
    console.log('\n2. Testing Million Verifier API...');
    const mvKey = process.env.MILLION_VERIFIER_API_KEY || process.env.MILLIONVERIFIER_API_KEY;
    if (!mvKey) {
        console.log('   ⚠️  Million Verifier API: No API key configured');
    } else {
        try {
            const response = await axios.get(`https://api.millionverifier.com/api/v3/`, {
                params: {
                    api: mvKey,
                    email: 'test@example.com',
                    timeout: 10
                },
                timeout: 15000
            });
            if (response.status === 200) {
                console.log('   ✅ Million Verifier API: Connected');
                console.log(`   Result: ${response.data.result || response.data.resultcode}`);
                results.millionVerifier = true;
            }
        } catch (err) {
            console.log('   ❌ Million Verifier API: Failed -', err.response?.data || err.message);
        }
    }

    // Test OpenRouter (LLM)
    console.log('\n3. Testing OpenRouter API (LLM)...');
    if (!process.env.OPENROUTER_API_KEY) {
        console.log('   ⚠️  OpenRouter API: No API key configured');
    } else {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: process.env.LLM_MODEL || 'anthropic/claude-3-haiku',
                messages: [
                    { role: 'user', content: 'Say "API test successful" in JSON format' }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 50
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://coeus-crm.com',
                    'X-Title': 'Coeus CRM'
                }
            });
            if (response.status === 200) {
                console.log('   ✅ OpenRouter API: Connected');
                console.log(`   Model: ${process.env.LLM_MODEL || 'anthropic/claude-3-haiku'}`);
                results.openRouter = true;
            }
        } catch (err) {
            console.log('   ❌ OpenRouter API: Failed -', err.response?.data || err.message);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Apify:           ${results.apify ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Million Verifier: ${results.millionVerifier ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`OpenRouter (AI):  ${results.openRouter ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = results.apify && results.millionVerifier && results.openRouter;
    console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'));
    console.log('='.repeat(60));

    process.exit(allPassed ? 0 : 1);
}

testAPIs();
