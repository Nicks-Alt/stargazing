const axios = require('axios');

const ORG_API_URL = 'https://superiorservers.co/api/darkrp/orgprofile/9986';

async function fetchOrgData() {
    try {
        console.log('🌐 Fetching organization data from API...');
        const response = await axios.get(ORG_API_URL);
        console.log(`📊 API Response Status: ${response.status}`);
        console.log(`👥 Total members in org: ${response.data.Members?.length || 0}`);
        return response.data;
    } catch (error) {
        console.error('❌ API fetch error:', error);
        throw error;
    }
}

module.exports = { fetchOrgData };