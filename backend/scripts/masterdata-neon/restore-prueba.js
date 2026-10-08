require('dotenv').config({ path: __dirname + '/../../.env' });
const { sequelize } = require('../../src/database/models');
(async () => {
  const t = await sequelize.transaction();
  try {
    const [[m]] = await sequelize.query(`SELECT * FROM materials WHERE id = 1237`, { transaction: t });
    const refs = [
      ['material_codes', m.material_code_id], ['material_families', m.family_id],
      ['material_types', m.type_id], ['material_brands', m.brand_id], ['material_locations', m.default_location_id],
    ];
    for (const [tbl, id] of refs) {
      if (!id) continue;
      const [, r] = await sequelize.query(`UPDATE ${tbl} SET deleted_at = NULL, is_active = TRUE WHERE id = :id AND deleted_at IS NOT NULL`, { replacements: { id }, transaction: t });
      console.log(`${tbl}#${id} restaurado:`, r.rowCount);
    }
    await sequelize.query(`UPDATE materials SET deleted_at = NULL, is_active = TRUE WHERE id = 1237`, { transaction: t });
    await t.commit();
    console.log('Material 1237 restaurado.');
  } catch (e) { await t.rollback(); console.error('ERR', e.message); }
  await sequelize.close();
})();
