const db = require('./src/database/models');
async function run() {
  const [locks] = await db.sequelize.query(`
    SELECT l.relation::regclass, l.mode, l.granted, a.query, a.state, a.pid
    FROM pg_locks l
    JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE l.relation::regclass::text IN ('roles', 'users', 'subareas')
  `);
  console.log('Locks:', locks);
  process.exit(0);
}
run();
