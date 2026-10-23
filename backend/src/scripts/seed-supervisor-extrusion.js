const bcrypt = require('bcrypt');
const { sequelize, Role, Permission, User, Area } = require('../database/models');

async function seedSupervisorExtrusion() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- SEEDING SUPERVISOR DE EXTRUSION ---');

    // 1. Verificar Área Extrusión (ID 2)
    const areaExtrusion = await Area.findByPk(2, { transaction });
    if (!areaExtrusion) {
      throw new Error('El área de Extrusión (ID 2) no existe en la base de datos.');
    }
    console.log('Área encontrada:', areaExtrusion.name);

    // 2. Crear o actualizar Rol SUPERVISOR_EXTRUSION
    let [supervisorRole, supCreated] = await Role.findOrCreate({
      where: { code: 'SUPERVISOR_EXTRUSION' },
      defaults: {
        name: 'Supervisor de Extrusión',
        code: 'SUPERVISOR_EXTRUSION',
        description: 'Supervisor operativo y administrativo del área de Extrusión',
        is_system: true,
        is_active: true,
        level: 50,
        area_id: 2,
      },
      transaction,
    });

    if (!supCreated) {
      await supervisorRole.update(
        {
          name: 'Supervisor de Extrusión',
          description: 'Supervisor operativo y administrativo del área de Extrusión',
          is_system: true,
          is_active: true,
          level: 50,
          area_id: 2,
        },
        { transaction }
      );
      console.log('Rol SUPERVISOR_EXTRUSION actualizado.');
    } else {
      console.log('Rol SUPERVISOR_EXTRUSION creado.');
    }

    // 3. Crear o actualizar Rol OPERADOR_EXTRUSION (para que el supervisor tenga rol asignable subordinado)
    let [operadorRole, opCreated] = await Role.findOrCreate({
      where: { code: 'OPERADOR_EXTRUSION' },
      defaults: {
        name: 'Operador de Extrusión',
        code: 'OPERADOR_EXTRUSION',
        description: 'Operador de máquinas y piso del área de Extrusión',
        is_system: true,
        is_active: true,
        level: 10,
        area_id: 2,
      },
      transaction,
    });

    if (!opCreated) {
      await operadorRole.update(
        {
          name: 'Operador de Extrusión',
          description: 'Operador de máquinas y piso del área de Extrusión',
          is_system: true,
          is_active: true,
          level: 10,
          area_id: 2,
        },
        { transaction }
      );
      console.log('Rol OPERADOR_EXTRUSION actualizado.');
    } else {
      console.log('Rol OPERADOR_EXTRUSION creado.');
    }

    // 4. Asignar Permisos a SUPERVISOR_EXTRUSION
    const supervisorPermCodes = [
      'extrusion.view',
      'extrusion.formulas.view',
      'extrusion.formulas.manage',
      'extrusion.orders.view',
      'extrusion.orders.create',
      'extrusion.wip.view',
      'extrusion.wip.manage',
      'extrusion.runs.manage',
      'warehouse.orders.create',
      'qr.read',
      'qr.create',
      'qr.generate',
      'qr.history.read',
      'users.read',
      'users.create',
      'dashboard.read',
      'charts.read',
      'scrap.view',
      'scrap.create',
    ];

    const supervisorPermissions = await Permission.findAll({
      where: {
        code: supervisorPermCodes,
      },
      transaction,
    });

    console.log(`Encontrados ${supervisorPermissions.length} permisos para SUPERVISOR_EXTRUSION.`);
    await supervisorRole.setPermissions(supervisorPermissions, { transaction });

    // 5. Asignar Permisos a OPERADOR_EXTRUSION
    const operadorPermCodes = [
      'extrusion.view',
      'extrusion.wip.view',
      'extrusion.wip.manage',
      'qr.read',
      'dashboard.read',
    ];

    const operadorPermissions = await Permission.findAll({
      where: {
        code: operadorPermCodes,
      },
      transaction,
    });
    await operadorRole.setPermissions(operadorPermissions, { transaction });

    // 6. Crear o actualizar Usuario supervisor_extrusion
    const passwordHash = await bcrypt.hash('Admin123*', 12);

    let [user, userCreated] = await User.findOrCreate({
      where: { username: 'supervisor_extrusion' },
      defaults: {
        first_name: 'Supervisor',
        last_name: 'Extrusión',
        email: 'supervisor.extrusion@sistema.com',
        username: 'supervisor_extrusion',
        numero_nomina: 'EMP-EXT-001',
        telefono: '555-123-4567',
        password_hash: passwordHash,
        role_id: supervisorRole.id,
        is_active: true,
        must_change_password: false,
      },
      transaction,
    });

    if (!userCreated) {
      await user.update(
        {
          first_name: 'Supervisor',
          last_name: 'Extrusión',
          email: 'supervisor.extrusion@sistema.com',
          numero_nomina: 'EMP-EXT-001',
          password_hash: passwordHash,
          role_id: supervisorRole.id,
          is_active: true,
          must_change_password: false,
        },
        { transaction }
      );
      console.log('Usuario supervisor_extrusion actualizado.');
    } else {
      console.log('Usuario supervisor_extrusion creado.');
    }

    await transaction.commit();
    console.log('--- SEED COMPLETADO SATISFACTORIAMENTE ---');
    console.log('Credenciales de acceso:');
    console.log('  Usuario: supervisor_extrusion');
    console.log('  Contraseña: Admin123*');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('Error durante el seed:', error);
    process.exit(1);
  }
}

seedSupervisorExtrusion();
