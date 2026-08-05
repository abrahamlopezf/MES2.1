const fs = require('fs');
const { sequelize } = require('../src/database/models');
const db = require('../src/database/models');

const records = JSON.parse(fs.readFileSync(__dirname + '/parsed-materials.json', 'utf-8'));

async function seedData() {
  try {
    console.log('Connecting to DB for Re-Seeding from Parsed JSON...');
    await sequelize.authenticate();

    // Wipe specific tables to fix data
    const modelsToClear = [
      db.Material, db.MaterialCode, db.MaterialFamily, db.MaterialBrand, db.MaterialType, db.OperationalArea
    ];
    for (const Model of modelsToClear) {
      if (Model) await Model.destroy({ where: {}, force: true, cascade: true });
    }
    console.log('Wiped previously seeded data.');

    let count = 0;
    for (const item of records) {
      // Ensure Family exists
      const [family] = await db.MaterialFamily.findOrCreate({
        where: { code: item.familia.substring(0, 20) },
        defaults: { name: item.familia }
      });

      // Ensure Code exists
      const codeParts = item.articulo.split('-');
      const codeBase = codeParts[0].substring(0, 20);
      const consecutiveBase = codeParts.length > 1 ? codeParts[1] : '001';
      const [matCode] = await db.MaterialCode.findOrCreate({
        where: { code: codeBase },
        defaults: { name: codeBase }
      });

      // Ensure Brand exists
      const [brand] = await db.MaterialBrand.findOrCreate({
        where: { code: item.marca.substring(0, 20).toUpperCase() },
        defaults: { name: item.marca }
      });

      // Ensure Type exists
      const [type] = await db.MaterialType.findOrCreate({
        where: { code: item.tipo.substring(0, 20).toUpperCase() },
        defaults: { name: item.tipo }
      });

      // Ensure OperationalArea exists
      const [opArea] = await db.OperationalArea.findOrCreate({
        where: { code: item.localidad.substring(0, 20) },
        defaults: { name: `Rack ${item.localidad}` }
      });

      // Create Material
      await db.Material.findOrCreate({
        where: { internal_code: item.nomenclatura },
        defaults: {
          family_id: family.id,
          material_code_id: matCode.id,
          brand_id: brand.id,
          type_id: type.id,
          default_location_id: opArea.id,
          internal_consecutive: consecutiveBase,
          name: item.descripcion,
          status: 'ACTIVE'
        }
      });
      count++;
    }

    console.log(`--- JSON RE-SEED COMPLETE. Inserted ${count} records. ---`);
  } catch (err) {
    console.error('Error during seeding:', err);
  }
}

seedData();
