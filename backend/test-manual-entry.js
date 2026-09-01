const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function testManualEntry() {
  try {
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: 'nexus',
      password: 'QhBv47RkNK$1096'
    });
    
    if (!loginRes.data.success) {
      console.log("LOGIN DATA:", loginRes.data);
      throw new Error("Login failed");
    }
    
    const token = loginRes.data.data.token;
    console.log("Logged in successfully");

    const entryRes = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/warehouse/inventory/manual-entry',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      material_id: 569, 
      location_id: 1, 
      entries: [
        { folio: "PR001-31826", quantity: 100 },
        { folio: "PR002-31826", quantity: 50 }
      ],
      notes: "Prueba de script"
    });

    console.log("RESPONSE STATUS:", entryRes.status);
    console.log("RESPONSE DATA:", JSON.stringify(entryRes.data));
  } catch (error) {
    console.log("ERROR:", error);
  }
}

testManualEntry();
