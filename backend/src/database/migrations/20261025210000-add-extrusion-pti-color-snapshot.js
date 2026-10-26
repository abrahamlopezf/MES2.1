'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries
          ADD COLUMN IF NOT EXISTS pti_color_snapshot VARCHAR(240);
        ALTER TABLE pti_racks
          ADD COLUMN IF NOT EXISTS current_pti_product_id INTEGER REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE SET NULL;
        WITH unique_material_pti AS (
          SELECT material_id, MIN(id) AS pti_product_id
          FROM pti_products
          WHERE material_id IS NOT NULL
          GROUP BY material_id
          HAVING COUNT(*) = 1
        )
        UPDATE pti_racks AS rack
        SET current_pti_product_id = unique_material_pti.pti_product_id
        FROM unique_material_pti
        WHERE rack.current_quantity > 0
          AND rack.current_pti_product_id IS NULL
          AND rack.current_pti_type_id = unique_material_pti.material_id;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries
          DROP COLUMN IF EXISTS pti_color_snapshot;
        ALTER TABLE pti_racks
          DROP COLUMN IF EXISTS current_pti_product_id;
      `, { transaction });
    });
  },
};
