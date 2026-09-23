const { sequelize } = require('./src/database/models');
sequelize.query(`SELECT code FROM permissions;`)
  .then(res => { console.log(res[0].map(r => r.code)); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
