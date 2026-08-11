const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/qr/lookup/ALM-000000172',
  method: 'GET',
  headers: {
    // I need a token to fetch, maybe? 
    // Yes, the route uses authMiddleware
  }
};
// since auth is required, a simple script won't work without a valid token.
