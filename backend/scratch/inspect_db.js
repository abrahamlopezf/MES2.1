const db = require('../src/database/models');

async function checkTable() {
    try {
        await db.sequelize.authenticate();
        console.log("DB connected.");
        const [results] = await db.sequelize.query(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE typname = 'enum_scrap_containers_status';
        `);
        console.log("Enum values for scrap_containers status:", results.map(r => r.enumlabel));
        
        const tableInfo = await db.sequelize.getQueryInterface().describeTable('scrap_containers');
        console.log("Table info keys:", Object.keys(tableInfo));
        console.log("Status column info:", tableInfo.status);
    } catch (e) {
        console.error(e);
    } finally {
        await db.sequelize.close();
    }
}

checkTable();
