const { sequelize } = require('./src/database/models');
async function test() {
  const triggers = await sequelize.query("SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'lotes'");
  console.log('TRIGGERS:', triggers[0]);
  process.exit(0);
}
test();
