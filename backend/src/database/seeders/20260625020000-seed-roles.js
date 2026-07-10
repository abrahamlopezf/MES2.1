'use strict';

module.exports = {
  async up(queryInterface) {
    const roles = [
      {
        name: 'Superadmin',
        code: 'SUPERADMIN',
        description: 'Desarrollador del sistema con acceso total.',
        is_system: true,
        is_active: true,
      },
      {
        name: 'Admin',
        code: 'ADMIN',
        description: 'Gerente con permisos administrativos sobre usuarios.',
        is_system: true,
        is_active: true,
      },
      {
        name: 'Supervisor',
        code: 'SUPERVISOR',
        description: 'Supervisor asignado a un área operativa.',
        is_system: true,
        is_active: true,
      },
      {
        name: 'Empleado',
        code: 'EMPLOYEE',
        description: 'Empleado operativo asignado a un área.',
        is_system: true,
        is_active: true,
      },
      {
        name: 'Finanzas',
        code: 'FINANCE',
        description: 'Usuario financiero con acceso a reportes y gráficas.',
        is_system: true,
        is_active: true,
      },
    ];

    for (const role of roles) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO roles (name, code, description, is_system, is_active, created_at, updated_at)
        VALUES (:name, :code, :description, :is_system, :is_active, NOW(), NOW())
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
        `,
        { replacements: role }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', {
      code: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'FINANCE'],
    });
  },
};