'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add uuid to qr_batches
    await queryInterface.addColumn('qr_batches', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      unique: true,
    });

    // 2. Add uuid to qr_codes
    await queryInterface.addColumn('qr_codes', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      unique: true,
    });

    // 3. Create a global sequence for serials to guarantee no manual consecutive locks
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS qr_code_serial_seq START 1;
    `);

    // 4. Add serial to qr_codes
    await queryInterface.addColumn('qr_codes', 'serial', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: Sequelize.literal("nextval('qr_code_serial_seq')"),
    });

    // Add index for fast lookups
    await queryInterface.addIndex('qr_codes', ['uuid'], {
      unique: true,
      name: 'idx_qr_codes_uuid',
    });
    
    await queryInterface.addIndex('qr_codes', ['serial'], {
      name: 'idx_qr_codes_serial',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('qr_codes', 'serial');
    await queryInterface.sequelize.query(`DROP SEQUENCE IF EXISTS qr_code_serial_seq;`);
    await queryInterface.removeColumn('qr_codes', 'uuid');
    await queryInterface.removeColumn('qr_batches', 'uuid');
  },
};
