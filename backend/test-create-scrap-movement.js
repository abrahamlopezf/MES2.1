require('dotenv').config();

const db = require('./src/database/models');

async function testScrapMovement() {
    try {
        await db.sequelize.authenticate();
        console.log("DB conectada");

        const movement = await db.ScrapMovement.create({
            process_run_output_id: 3,
            scrap_catalog_id: 1,
            from_rack_id: 3,
            to_rack_id: 4,
            movement_type: 'TRANSFERENCIA',
            quantity: 5,
            unit: 'KG',
            status: 'TRANSFERIDO',
            notes: 'Movimiento de prueba de scrap desde Extrusión hacia Rack Scrap General',
            created_by: 1,
            approved_by: 1
        });

        console.log("\n===== MOVIMIENTO CREADO =====");
        console.log(
            JSON.stringify(
                movement,
                null,
                2
            )
        );

        const result = await db.ScrapMovement.findOne({
            where: {
                id: movement.id
            },
            include: [
                {
                    model: db.ScrapCatalog,
                    as: 'scrap_type'
                },
                {
                    model: db.ProcessRunOutput,
                    as: 'process_output'
                },
                {
                    model: db.StorageRack,
                    as: 'from_rack'
                },
                {
                    model: db.StorageRack,
                    as: 'to_rack'
                }
            ]
        });

        console.log("\n===== TRAZABILIDAD COMPLETA =====");
        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testScrapMovement();