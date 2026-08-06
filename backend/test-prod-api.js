const axios = require('axios');

async function check() {
  try {
    console.log('Logging in...');
    // Login to get token
    const loginRes = await axios.post('https://mes-backend-3oux.onrender.com/api/auth/login', {
      nomina: '702811',
      password: 'password123'
    });
    
    const token = loginRes.data.data.token;
    console.log('Got token. Fetching inventory...');
    
    const res = await axios.get('https://mes-backend-3oux.onrender.com/api/warehouse/inventory', {
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
