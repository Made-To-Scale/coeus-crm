const axios = require('axios');

async function testIngest() {
    console.log('--- Testing Backend Ingestion ---');
    try {
        const response = await axios.post('http://localhost:3000/api/ingest', {
            business_type: 'Clinica estetica',
            city: 'Barcelona',
            limit: 1,
            timestamp: new Date().toISOString()
        });
        console.log('Status Code:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}

testIngest();
