require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const mat = await s.query("SELECT * FROM materials WHERE internal_code='LIM-ESC-002'");
    console.log(mat[0]);
    process.exit(0);
}
main();
