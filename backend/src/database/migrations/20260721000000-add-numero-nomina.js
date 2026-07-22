'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add column allowing null first to avoid crashes on existing data
    await queryInterface.addColumn('users', 'numero_nomina', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    // 2. Populate existing rows with a unique dummy value
    // Handle both SQLite and Postgres/MySQL string concatenation
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres' || dialect === 'sqlite') {
      await queryInterface.sequelize.query(
        `UPDATE users SET numero_nomina = 'EMP-TEMP-' || id WHERE numero_nomina IS NULL`
      );
    } else {
      await queryInterface.sequelize.query(
        `UPDATE users SET numero_nomina = CONCAT('EMP-TEMP-', id) WHERE numero_nomina IS NULL`
      );
    }

    // 3. Change column to NOT NULL and UNIQUE. SQLite doesn't support alterColumn for NOT NULL natively via changeColumn in some versions, but Sequelize tries its best. 
    // To be safer, we can just use the constraints. 
    await queryInterface.changeColumn('users', 'numero_nomina', {
      type: Sequelize.STRING(30),
      allowNull: false,
      unique: true,
    });

    // 4. Create Indexes (username is already unique in the original migration, but we add an index explicitly as requested)
    await queryInterface.addIndex('users', ['username'], {
      name: 'users_username_idx',
      unique: true,
    });

    await queryInterface.addIndex('users', ['numero_nomina'], {
      name: 'users_numero_nomina_idx',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_numero_nomina_idx');
    await queryInterface.removeIndex('users', 'users_username_idx');
    await queryInterface.removeColumn('users', 'numero_nomina');
  }
};
