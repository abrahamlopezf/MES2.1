const db = require('./backend/src/database/models');
db.Inventory.findAll().then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
