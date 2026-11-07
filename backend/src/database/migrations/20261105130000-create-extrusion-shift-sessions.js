'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.some((t) => (typeof t === 'string' ? t : t.tableName) === 'extrusion_shift_sessions')) {
      await queryInterface.createTable('extrusion_shift_sessions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        shift_date: { type: Sequelize.DATEONLY, allowNull: false },
        shift_code: { type: Sequelize.STRING(30), allowNull: false },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'ABIERTO' },
        supervisor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        closed_at: { type: Sequelize.DATE, allowNull: true },
        closed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        closing_snapshot: { type: Sequelize.JSONB, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_extrusion_shift_date_code
        ON extrusion_shift_sessions (shift_date, shift_code);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_extrusion_one_open_session
        ON extrusion_shift_sessions (status) WHERE status = 'ABIERTO';
      CREATE INDEX IF NOT EXISTS idx_extrusion_shift_owner ON extrusion_shift_sessions (supervisor_id, opened_at DESC);
      ALTER TABLE pti_racks ADD COLUMN IF NOT EXISTS custody_shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
      ALTER TABLE extrusion_production_entries ADD COLUMN IF NOT EXISTS shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;
      ALTER TABLE extruder_queues ADD COLUMN IF NOT EXISTS shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;
      ALTER TABLE process_preparations ADD COLUMN IF NOT EXISTS shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;
      ALTER TABLE extrusion_scrap_logs ADD COLUMN IF NOT EXISTS shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_pti_racks_shift_custody ON pti_racks (custody_shift_session_id) WHERE custody_shift_session_id IS NOT NULL;
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_pti_racks_shift_custody;
      ALTER TABLE extrusion_scrap_logs DROP COLUMN IF EXISTS shift_session_id;
      ALTER TABLE process_preparations DROP COLUMN IF EXISTS shift_session_id;
      ALTER TABLE extruder_queues DROP COLUMN IF EXISTS shift_session_id;
      ALTER TABLE extrusion_production_entries DROP COLUMN IF EXISTS shift_session_id;
      ALTER TABLE pti_racks DROP COLUMN IF EXISTS custody_shift_session_id;
      DROP INDEX IF EXISTS idx_extrusion_shift_owner;
      DROP INDEX IF EXISTS uq_extrusion_one_open_session;
      DROP INDEX IF EXISTS uq_extrusion_shift_date_code;
      DROP TABLE IF EXISTS extrusion_shift_sessions;
    `);
  },
};
