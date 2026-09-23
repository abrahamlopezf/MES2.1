const axios = require('axios');
(async () => {
  try {
    // We don't have a token.
    // Instead we can temporarily remove authorizePermission from the route to test.
    console.log("Need token");
  } catch(e) {
    console.error(e);
  }
})();
