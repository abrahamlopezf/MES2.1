const { sequelize } = require('./src/database/models');
sequelize.query(`SELECT id, name FROM areas;`)
  .then(res => { console.log(res[0]); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
