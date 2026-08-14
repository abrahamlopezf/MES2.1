const { sequelize } = require('./src/config/database');
sequelize.query("UPDATE traceability_events SET notes = 'Localidad actualizada a: A1 (A1)' WHERE notes = 'Localidad actualizada a ID 1'")
  .then(() => { console.log('Updated db'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
