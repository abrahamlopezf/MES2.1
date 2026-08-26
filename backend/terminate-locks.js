const db = require('./src/database/models');
async function run() {
  await db.sequelize.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND datname = current_database()`);
  console.log('Terminated all other connections for current database');
  process.exit(0);
}
run();
