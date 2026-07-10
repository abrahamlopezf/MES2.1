'use strict';

module.exports = {
  async up(queryInterface) {
    const permissions = [
      {
        name: 'Ver dashboard',
        code: 'dashboard.read',
        module: 'dashboard',
        description: 'Permite ver el panel principal.',
      },
      {
        name: 'Crear usuarios',
        code: 'users.create',
        module: 'users',
        description: 'Permite crear usuarios.',
      },
      {
        name: 'Ver usuarios',
        code: 'users.read',
        module: 'users',
        description: 'Permite consultar usuarios.',
      },
      {
        name: 'Editar usuarios',
        code: 'users.update',
        module: 'users',
        description: 'Permite editar usuarios.',
      },
      {
        name: 'Eliminar usuarios',
        code: 'users.delete',
        module: 'users',
        description: 'Permite eliminar usuarios.',
      },
      {
        name: 'Crear roles',
        code: 'roles.create',
        module: 'roles',
        description: 'Permite crear roles.',
      },
      {
        name: 'Ver roles',
        code: 'roles.read',
        module: 'roles',
        description: 'Permite consultar roles.',
      },
      {
        name: 'Editar roles',
        code: 'roles.update',
        module: 'roles',
        description: 'Permite editar roles.',
      },
      {
        name: 'Eliminar roles',
        code: 'roles.delete',
        module: 'roles',
        description: 'Permite eliminar roles.',
      },
      {
        name: 'Ver áreas',
        code: 'areas.read',
        module: 'areas',
        description: 'Permite consultar áreas.',
      },
      {
        name: 'Ver reportes',
        code: 'reports.read',
        module: 'reports',
        description: 'Permite consultar reportes.',
      },
      {
        name: 'Exportar reportes',
        code: 'reports.export',
        module: 'reports',
        description: 'Permite exportar reportes.',
      },
      {
        name: 'Ver gráficas',
        code: 'charts.read',
        module: 'charts',
        description: 'Permite consultar gráficas.',
      },
      {
        name: 'Ver operaciones de área',
        code: 'operations.area.read',
        module: 'operations',
        description: 'Permite consultar operaciones del área asignada.',
      },
      {
        name: 'Registrar operaciones de área',
        code: 'operations.area.write',
        module: 'operations',
        description: 'Permite registrar operaciones del área asignada.',
      },
    ];

    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO permissions (name, code, module, description, created_at, updated_at)
        VALUES (:name, :code, :module, :description, NOW(), NOW())
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          module = EXCLUDED.module,
          description = EXCLUDED.description,
          updated_at = NOW();
        `,
        { replacements: permission }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', null, {});
  },
};