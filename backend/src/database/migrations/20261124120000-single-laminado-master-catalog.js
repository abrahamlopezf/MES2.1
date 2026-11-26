'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE laminado_specifications
          ADD COLUMN IF NOT EXISTS is_catalog_master BOOLEAN NOT NULL DEFAULT FALSE;

        WITH chosen AS (
          SELECT id
          FROM laminado_specifications
          ORDER BY is_active DESC, updated_at DESC, id ASC
          LIMIT 1
        )
        UPDATE laminado_specifications AS spec
        SET is_catalog_master = (spec.id = (SELECT id FROM chosen)),
            is_active = CASE WHEN spec.id = (SELECT id FROM chosen) THEN spec.is_active ELSE FALSE END,
            configuration_status = CASE WHEN spec.id = (SELECT id FROM chosen) AND spec.is_active THEN 'ACTIVA' ELSE 'BORRADOR' END;

        CREATE UNIQUE INDEX IF NOT EXISTS laminado_single_catalog_master_idx
          ON laminado_specifications (is_catalog_master)
          WHERE is_catalog_master = TRUE;
        CREATE UNIQUE INDEX IF NOT EXISTS laminado_single_active_spec_idx
          ON laminado_specifications ((1))
          WHERE is_active = TRUE;
      `, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS laminado_single_active_spec_idx;
        DROP INDEX IF EXISTS laminado_single_catalog_master_idx;
        ALTER TABLE laminado_specifications DROP COLUMN IF EXISTS is_catalog_master;
      `, { transaction });
    });
  },
};
