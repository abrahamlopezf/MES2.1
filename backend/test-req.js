const { login } = require('./src/modules/auth/auth.service');

async function test() {
  try {
    const { token } = await login('admin_alm', 'Demo123!');
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
        password: 'Temporal123!'
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
