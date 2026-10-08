'use strict';

/**
 * Crea `tags` y `material_tags` de forma idempotente.
 * En local estas tablas ya existían (creadas por sync); en producción no.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) DEFAULT '#e2e8f0',
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        updated_by INTEGER,
        deleted_by INTEGER,
        version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);
    await queryInterface.sequelize.query(`ALTER TABLE tags ADD COLUMN IF NOT EXISTS description VARCHAR(255);`);
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS tags_uuid_active ON tags (uuid) WHERE deleted_at IS NULL;`);
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS tags_name_active ON tags (name) WHERE deleted_at IS NULL;`);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS material_tags (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS material_tags_material_id_tag_id ON material_tags (material_id, tag_id);`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS material_tags;`);
  }
};
