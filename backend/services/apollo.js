const axios = require('axios');
require('dotenv').config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

/**
 * Searches for people/decision makers in Apollo by domain
 */
async function findContacts(domain) {
    if (!domain) return [];

    try {
        const response = await axios.post('https://api.apollo.io/v1/people/search', {
            q_organization_domains: domain,
            page: 1,
            person_titles: ['Owner', 'CEO', 'Director', 'Manager', 'Founder', 'Marketing', 'Founder & CEO'],
            display_mode: 'regular'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': APOLLO_API_KEY
            }
        });

        const people = response.data.people || [];
        return people.map(p => ({
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Generic Contact',
            role: p.title || 'Unknown',
            email: p.email,
            status: 'new',
            linkedin: p.linkedin_url,
            photo: p.photo_url
        })).filter(p => p.email); // Only return those with emails
    } catch (err) {
        console.error('Apollo Search Error:', err.response?.data || err.message);
        return [];
    }
}

module.exports = { findContacts };
