require('dotenv').config();

const db = require('./src/database/models');

async function testScrap() {
    try {
        await db.sequelize.authenticate();

        console.log("DB conectada");
        const scrap = await db.ProcessRunOutput.create({
            folio: `SCRAP-EXT-${Date.now()}`,
            process_run_id: 1,
            source_traceable_item_id: 5,
            source_qr_code_id: 5,
            intermediate_material_id: 1,
            rack_id: 3,
            intermediate_stock_id: 1,
            output_type: "SCRAP",
            quantity_primary: 5,
            primary_unit: "KG",
            quantity_secondary: 5,
            secondary_unit: "KG",
            status: "REGISTRADO",
            produced_at: new Date(),
            scrap_weight: 5,
            waste_weight: 0,
            scrap_catalog_id: 1,
            notes:
            "Scrap generado durante prueba de producción",
            metadata: {
                estacion: "Extrusora 1",
                motivo: "Sobrante de proceso",
                operador: "Superadmin prueba"
            },
            created_by: 1
        });

        console.log("\n===== SCRAP CREADO =====");
        console.log(
            JSON.stringify(
                scrap.toJSON(),
                null,
                2
            )
        );

        const result = await db.ProcessRunOutput.findOne({
            where:{
                id:scrap.id
            },
            include:[
                {
                    model: db.ScrapCatalog,
                    as:"scrap_type"
                }
            ]
        });

        console.log("\n===== SCRAP CON CATALOGO =====");
        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

        await db.sequelize.close();
    } catch(error){
        console.error(error);
        await db.sequelize.close();
    }
}

testScrap();