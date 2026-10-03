async function test() {
  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_alm', password: 'Temporal123!' })
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.token;
    if (!token) {
      console.log("No token:", loginJson);
      return;
    }
    
    const res = await fetch('http://localhost:4000/api/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status Roles:", res.status);
    
    const res2 = await fetch('http://localhost:4000/api/permissions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status Permissions:", res2.status);
  } catch (e) {
    console.error(e);
  }
}
test();
