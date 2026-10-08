const { sequelize, MaterialConsumption, MaterialConsumptionItem, TraceabilityEvent } = require('./src/database/models');
async function test() {
  const events = await TraceabilityEvent.findAll({ order: [['created_at', 'DESC']], limit: 10 });
  console.log('Events:', JSON.stringify(events, null, 2));
  process.exit(0);
}
test();
