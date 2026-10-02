require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const fam = await s.query("SELECT * FROM material_families WHERE code='LIM-'");
    const code = await s.query("SELECT * FROM material_codes WHERE code='ESC-002'");
    console.log(fam[0]);
    console.log(code[0]);
    process.exit(0);
}
main();
