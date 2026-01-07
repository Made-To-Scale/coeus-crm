const axios = require('axios');
require('dotenv').config();

const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;

/**
 * Enrolls a lead into an Instantly campaign
 */
async function enrollLead(campaignId, lead) {
    if (!INSTANTLY_API_KEY) return { status: 'paused', message: 'Missing Instantly Key' };

    try {
        const response = await axios.post(`https://api.instantly.ai/1/lead/add`, {
            api_key: INSTANTLY_API_KEY,
            campaign_id: campaignId,
            skip_if_in_any_campaign: true,
            leads: [{
                email: lead.email,
                first_name: lead.first_name || '',
                last_name: lead.last_name || '',
                company_name: lead.business_name,
                website: lead.website,
                custom_variables: {
                    icebreaker: lead.personalization_summary || '',
                    city: lead.city,
                    niche: lead.gmb_category
                }
            }]
        });

        return response.data;
    } catch (err) {
        console.error('Instantly Enrollment Error:', err.response?.data || err.message);
        throw err;
    }
}

/**
 * Stops outreach for a lead
 */
async function stopLead(campaignId, email) {
    if (!INSTANTLY_API_KEY) return;
    try {
        await axios.post(`https://api.instantly.ai/1/lead/stop`, {
            api_key: INSTANTLY_API_KEY,
            campaign_id: campaignId,
            email: email
        });
    } catch (err) {
        console.error('Instantly Stop Error:', err.message);
    }
}

module.exports = { enrollLead, stopLead };
