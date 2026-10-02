require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false
});

async function main() {
    const tables = ['materials', 'material_families', 'material_codes', 'material_brands', 'material_locations', 'material_types', 'operational_areas'];
    for (const t of tables) {
        try {
            const r = await s.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id)+1 FROM ${t}), 1), false)`);
            console.log(`Synced ${t}`);
        } catch (e) {
            console.log(`Skipped ${t}:`, e.message);
        }
    }
    process.exit(0);
}
main();
