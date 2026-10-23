'use strict';

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, User, Role, Area, Permission } = require('../database/models');

const SUPERVISOR_PERMISSION_CODES = [
  'extrusion.view',
  'extrusion.formulas.view',
  'extrusion.formulas.manage',
  'extrusion.orders.view',
  'extrusion.orders.create',
  'extrusion.wip.view',
  'extrusion.wip.manage',
  'extrusion.runs.manage',
];

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable requerida ${name}.`);
  return value;
};

const validateAccount = (account, label) => {
  if (account.username.length < 3 || account.username.length > 80) {
    throw new Error(`El usuario de ${label} debe tener entre 3 y 80 caracteres.`);
  }
  if (account.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
    throw new Error(`El correo de ${label} no tiene un formato válido.`);
  }
  if (
    account.password.length < 8 ||
    account.password.length > 100 ||
    !/[a-z]/.test(account.password) ||
    !/[A-Z]/.test(account.password) ||
    !/\d/.test(account.password) ||
    !/[^A-Za-z\d]/.test(account.password)
  ) {
    throw new Error(`La contraseña de ${label} debe tener de 8 a 100 caracteres e incluir mayúscula, minúscula, número y símbolo.`);
  }
};

const accountFromEnv = (prefix, defaults = {}) => {
  const account = {
    username: required(`${prefix}_USERNAME`),
    email: required(`${prefix}_EMAIL`).toLowerCase(),
    password: required(`${prefix}_PASSWORD`),
    first_name: process.env[`${prefix}_FIRST_NAME`]?.trim() || defaults.first_name || 'Usuario',
    last_name: process.env[`${prefix}_LAST_NAME`]?.trim() || defaults.last_name || 'Demostración',
    numero_nomina: process.env[`${prefix}_PAYROLL`]?.trim() || null,
  };
  validateAccount(account, prefix);
  return account;
};

async function getOrCreateSupervisorRole(transaction) {
  const area = await Area.findOne({ where: { code: 'EXTRUSION', is_active: true }, transaction });
  if (!area) throw new Error('No existe un área activa con código EXTRUSION.');

  let role = await Role.findOne({ where: { code: 'SUPERVISOR_EXTRUSION' }, transaction });
  if (!role) {
    role = await Role.create(
      {
        name: 'Supervisor de Extrusión',
        code: 'SUPERVISOR_EXTRUSION',
        description: 'Supervisor operativo y administrativo del área de Extrusión',
        is_system: true,
        is_active: true,
        level: 50,
        area_id: area.id,
      },
      { transaction }
    );
  } else if (!role.is_active || role.area_id !== area.id) {
    throw new Error('El rol SUPERVISOR_EXTRUSION existe, pero está inactivo o asignado a otra área. Corrígelo antes de cargar usuarios.');
  }

  const permissions = await Permission.findAll({
    where: { code: { [Op.in]: SUPERVISOR_PERMISSION_CODES } },
    transaction,
  });
  const permissionMap = new Map(permissions.map((permission) => [permission.code, permission]));
  const missing = SUPERVISOR_PERMISSION_CODES.filter((code) => !permissionMap.has(code));
  if (missing.length) {
    throw new Error(`Faltan permisos de Extrusión en producción: ${missing.join(', ')}. Ejecuta las migraciones primero.`);
  }

  await role.addPermissions(permissions, { transaction });
  return role;
}

async function getGlobalRole(transaction) {
  const roleCode = (process.env.DEMO_GLOBAL_ROLE_CODE || 'ADMIN_GRAL').trim().toUpperCase();
  if (!['ADMIN_GENERAL', 'ADMIN_GRAL'].includes(roleCode)) {
    throw new Error('DEMO_GLOBAL_ROLE_CODE solo puede ser ADMIN_GENERAL o ADMIN_GRAL.');
  }
  const role = await Role.findOne({ where: { code: roleCode }, transaction });
  if (!role || !role.is_active || role.area_id !== null || role.subarea_id !== null) {
    throw new Error(`El rol global activo ${roleCode} no existe o está ligado a un área.`);
  }
  return role;
}

async function createAccountIfMissing(account, role, transaction) {
  const matches = await User.findAll({
    where: { [Op.or]: [{ username: account.username }, { email: account.email }] },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (matches.length) {
    const existing = matches.find(
      (user) => user.username === account.username && user.email.toLowerCase() === account.email
    );
    if (matches.length !== 1 || !existing) {
      throw new Error(`El usuario o correo de ${account.username} ya está asociado a otra cuenta.`);
    }
    if (existing.role_id !== role.id || !existing.is_active) {
      throw new Error(`La cuenta ${account.username} ya existe, pero su rol o estado no coincide. No se modificó.`);
    }
    console.log(`Cuenta existente verificada: ${account.username} (${role.code}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(account.password, 12);
  await User.create(
    {
      first_name: account.first_name,
      last_name: account.last_name,
      email: account.email,
      username: account.username,
      numero_nomina: account.numero_nomina,
      password_hash: passwordHash,
      role_id: role.id,
      is_active: true,
      must_change_password: true,
    },
    { transaction }
  );
  console.log(`Cuenta creada: ${account.username} (${role.code}); deberá cambiar su contraseña al iniciar sesión.`);
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');

  const supervisor = accountFromEnv('DEMO_SUPERVISOR', {
    first_name: 'Supervisor',
    last_name: 'Extrusión',
  });
  const globalAdmin = accountFromEnv('DEMO_GLOBAL', {
    first_name: 'Administrador',
    last_name: 'Demostración',
  });
  if (supervisor.username.toLowerCase() === globalAdmin.username.toLowerCase() || supervisor.email === globalAdmin.email) {
    throw new Error('Las dos cuentas deben tener usuarios y correos distintos.');
  }

  const transaction = await sequelize.transaction();
  try {
    const supervisorRole = await getOrCreateSupervisorRole(transaction);
    const globalRole = await getGlobalRole(transaction);
    await createAccountIfMissing(supervisor, supervisorRole, transaction);
    await createAccountIfMissing(globalAdmin, globalRole, transaction);
    await transaction.commit();
    console.log('Carga de usuarios de demostración completada.');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(`No se completó la carga: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
