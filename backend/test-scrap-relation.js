const db = require('./src/database/models');

async function test() {

    const outputs = await db.ProcessRunOutput.findAll({
        include: [
            {
                model: db.ScrapCatalog,
                as: 'scrap_type'
            }
        ]
    });


    console.log(
        JSON.stringify(outputs, null, 2)
    );


    process.exit();
}


test();