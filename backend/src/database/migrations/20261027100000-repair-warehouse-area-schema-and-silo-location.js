'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`ALTER TABLE inventory_movements
        ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL`, { transaction });
      await queryInterface.sequelize.query(`ALTER TABLE material_locations
        ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL`, { transaction });
      await queryInterface.sequelize.query(`INSERT INTO material_locations (uuid, code, name, description, area_id, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), 'SILO', 'Silo', 'Localidad operativa para materia prima almacenada en silos.', a.id, true, NOW(), NOW()
        FROM areas a
        WHERE a.code = 'ALMACEN'
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          area_id = EXCLUDED.area_id,
          is_active = true,
          deleted_at = NULL,
          updated_at = NOW()`, { transaction });
      await queryInterface.sequelize.query(`UPDATE silos
        SET location_id = (SELECT id FROM material_locations WHERE UPPER(code) = 'SILO' AND deleted_at IS NULL LIMIT 1), updated_at = NOW()
        WHERE location_id IS NULL
          AND EXISTS (SELECT 1 FROM material_locations WHERE UPPER(code) = 'SILO' AND deleted_at IS NULL)`, { transaction });
    });
  },

  // Repair migration: deliberately retain the schema and location on rollback.
  async down() {},
};
