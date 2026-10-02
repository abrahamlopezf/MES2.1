require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
});

async function main() {
    await s.query("DELETE FROM materials WHERE internal_code='GOM-001'");
    console.log("Cleaned production GOM-001");
    process.exit(0);
}
main();
