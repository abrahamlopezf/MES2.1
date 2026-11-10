require('dotenv').config();
const axios = require('axios');
require('dotenv').config();

const API_BASE = (process.env.QA_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
if (!process.env.TEST_ACCOUNT_PASSWORD) throw new Error('TEST_ACCOUNT_PASSWORD is required.');
if (/mes-backend-3oux\.onrender\.com/i.test(API_BASE) && process.env.ALLOW_PRODUCTION_SECURITY_TESTS !== 'YES') {
  throw new Error('Set ALLOW_PRODUCTION_SECURITY_TESTS=YES only when production probing has been explicitly approved.');
}

async function check() {
  try {
    console.log('Logging in...');
    // Login to get token
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      nomina: '702811',
      password: process.env.TEST_ACCOUNT_PASSWORD
    });
    
    const token = loginRes.data.data.token;
    console.log('Got token. Fetching inventory...');
    
    const res = await axios.get(`${API_BASE}/warehouse/inventory`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('SUCCESS! Response keys:', Object.keys(res.data));
    console.log('Inventory items count:', res.data.data.items.length);
  } catch (err) {
    if (err.response) {
      console.log('ERROR:', err.response.status);
      console.log(err.response.data);
    } else {
      console.log('ERROR:', err.message);
    }
  }
}

check();
