require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres'});
s.query("SELECT COUNT(*) FROM materials WHERE is_active=true").then(r => {
    console.log("ACTIVE COUNT: " + r[0][0].count);
    process.exit(0);
});
