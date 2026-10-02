require('dotenv').config();
const fs = require('fs');
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const text = fs.readFileSync('docs/catalogo_materiales_stock_minimo.md', 'utf-8');
    const lines = text.split('\n').filter(l => l.includes('|')).slice(2);
    
    const mdNomenclatures = lines.map(l => l.split('|')[3].trim());
    
    const dbRows = await s.query("SELECT internal_code FROM materials WHERE is_active=true", {type: Sequelize.QueryTypes.SELECT});
    const dbNomenclatures = dbRows.map(r => r.internal_code);
    
    const missingInDb = mdNomenclatures.filter(n => !dbNomenclatures.includes(n));
    console.log("MISSING IN DB:", missingInDb);
    
    process.exit(0);
}
main();
