require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    await s.query("UPDATE materials SET is_active=true, status='ACTIVE' WHERE internal_code IN ('LIM-ESC-002', 'RF-BUJ-004', 'RF-BRA-003')");
    const r = await s.query("SELECT COUNT(*) FROM materials WHERE is_active=true");
    console.log("ACTIVE COUNT:", r[0][0].count);
    process.exit(0);
}
main();
