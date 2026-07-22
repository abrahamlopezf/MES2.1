'use strict';

const bcrypt = require('bcrypt');
const { QueryTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const [superadminRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1;",
      { type: QueryTypes.SELECT }
    );

    if (!superadminRole) {
      throw new Error('No existe el rol SUPERADMIN. Ejecuta primero el seeder de roles.');
    }

    const passwordHash = await bcrypt.hash('Admin123*', 12);

    await queryInterface.sequelize.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        username,
        numero_nomina,
        password_hash,
        role_id,
        area_id,
        is_active,
        must_change_password,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES (
        'Sistema',
        'Desarrollador',
        'superadmin@sistema.local',
        'superadmin',
        'EMP-0000',
        :passwordHash,
        :roleId,
        NULL,
        true,
        true,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (username)
      DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        numero_nomina = EXCLUDED.numero_nomina,
        role_id = EXCLUDED.role_id,
        area_id = NULL,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP;
      `,
      {
        replacements: {
          passwordHash,
          roleId: superadminRole.id,
        },
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      username: 'superadmin',
    });
  },
};