require('dotenv').config();
const { login } = require('./src/modules/auth/auth.service');

async function test() {
  try {
    if (!process.env.TEST_ACCOUNT_PASSWORD) throw new Error('TEST_ACCOUNT_PASSWORD is required.');
    const { token } = await login(process.env.TEST_ACCOUNT_USERNAME || 'admin_alm', process.env.TEST_ACCOUNT_PASSWORD);
    const res = await fetch('http://localhost:5000/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        first_name: 'Juan',
        last_name: 'Perez',
        email: 'juan.perez' + Date.now() + '@example.com',
        role_id: 24, // Assuming WAREHOUSEMAN role
        telefono: '',
        numero_nomina: '',
        username: '',
        is_active: true,
        password: process.env.TEST_ACCOUNT_PASSWORD
      })
    });
    const data = await res.json();
    console.log(res.status, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
test();
