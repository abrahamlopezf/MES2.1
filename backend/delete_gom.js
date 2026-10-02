require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres'});
s.query("DELETE FROM materials WHERE material_code_id=389").then(() => {
    console.log("DELETED");
    process.exit(0);
});
