const axios = require('axios');

async function testPut() {
  try {
    const res = await axios.put('http://localhost:4000/api/users/1', {
      first_name: "Admin",
      last_name: "User",
      email: "admin@nexus.com",
      username: "admin",
      role_id: 1,
      area_id: null,
      is_active: true,
      telefono: "",
      numero_nomina: ""
    }, {
      headers: {
        // Need to simulate a token, but wait, without token it's 401 Unauthorized, not 400 Bad Request
        // If it's 400, maybe the token is missing and my auth middleware returns 400? Let me check auth middleware
      }
    });
    console.log(res.data);
  } catch (error) {
    console.log(error.response?.status);
    console.log(error.response?.data);
  }
}

testPut();
