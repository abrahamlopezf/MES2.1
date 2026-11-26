const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const { User, Role, Area, Subarea, Permission, Notification, sequelize } = require('../../database/models');
const {
  SUPERADMIN_ROLE_CODE,
  isAdmin,
  throwHttpError,
} = require('../../shared/security/accessRules');
const AuthorizationService = require('../../shared/security/authorization.service');

const PASSWORD_SALT_ROUNDS = 12;

const AREA_RESPONSIBILITY_ROLES = {
  1: { ADMIN: ['ADMIN_ALM', 'ADMIN_ALMACEN'], SUPERVISOR: ['SUPERVISOR'] },
  2: { ADMIN: ['ADMIN_EXT', 'ADMIN_EXTRUSION'], SUPERVISOR: ['SUPERVISOR_EXTRUSION'] },
  3: { ADMIN: ['ADMIN_TELARES', 'ADMIN_TEL'], SUPERVISOR: ['SUPERVISOR_TELARES'] },
  4: { ADMIN: ['ADMIN_LAMINADO'], SUPERVISOR: ['SUPERVISOR_LAMINADO'] },
  5: { ADMIN: ['ADMIN_GLOBO'], SUPERVISOR: ['SUPERVISOR_GLOBO'] },
  6: { ADMIN: ['ADMIN_CORTE'], SUPERVISOR: ['SUPERVISOR_CORTE'] },
};

const getResponsibility = (role) => {
  const code = String(role?.code || '').toUpperCase();
  const areaId = Number(role?.area_id);
  const areaRoles = AREA_RESPONSIBILITY_ROLES[areaId];
  if (!areaRoles) return null;
  if (areaRoles.ADMIN.includes(code)) return { areaId, kind: 'ADMIN' };
  if (areaRoles.SUPERVISOR.includes(code)) return { areaId, kind: 'SUPERVISOR' };
  return null;
};

const assertUserManagementActor = (currentUser) => {
  if (!AuthorizationService.canAdministerUsers(currentUser)) {
    throwHttpError('Solo los administradores globales o de área pueden administrar usuarios.', 403);
  }
};

const assertAreaResponsibleCanBeRemoved = async (role, transaction) => {
  const responsibility = getResponsibility(role);
  if (!responsibility) return;

  const bucketKey = `${responsibility.areaId}:${responsibility.kind}`;
  await sequelize.query(
    "SELECT pg_advisory_xact_lock(hashtext('traceflow.area-responsibility'), hashtext($1))",
    { bind: [bucketKey], transaction }
  );

  const roleCodes = AREA_RESPONSIBILITY_ROLES[responsibility.areaId][responsibility.kind];
  const responsibleRoles = await Role.findAll({
    attributes: ['id'],
    where: { area_id: responsibility.areaId, code: { [Op.in]: roleCodes } },
    transaction,
  });
  const responsibleRoleIds = responsibleRoles.map((item) => item.id);
  if (!responsibleRoleIds.length) {
    throwHttpError('No se pudo verificar la configuración de responsables del área.', 409);
  }

  const activeCount = await User.count({
    where: { role_id: { [Op.in]: responsibleRoleIds }, is_active: true },
    transaction,
  });
  if (activeCount <= 1) {
    throwHttpError(`No se puede desactivar o cambiar al último ${responsibility.kind === 'ADMIN' ? 'administrador' : 'supervisor'} activo del área.`, 409);
  }
};

const userInclude = (options = {}) => {
  return [
    {
      model: Role,
      as: 'role',
      required: true,
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: {
            attributes: [],
          },
        },
        {
          model: Area,
          as: 'area',
          required: false,
        },
        {
          model: Subarea,
          as: 'subarea',
          required: false,
        },
      ],
    },
  ];
};

const buildUserResponse = (user) => {
  if (!user) return null;

  const plainUser = user.get ? user.get({ plain: true }) : user;
  const role = plainUser.role || {};

  return {
    id: plainUser.id,
    first_name: plainUser.first_name,
    last_name: plainUser.last_name,
    email: plainUser.email,
    username: plainUser.username,
    numero_nomina: plainUser.numero_nomina,
    telefono: plainUser.telefono,
    is_active: plainUser.is_active,
    must_change_password: plainUser.must_change_password,
    last_login_at: plainUser.last_login_at,
    created_at: plainUser.created_at,
    updated_at: plainUser.updated_at,
    role: plainUser.role
      ? {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          level: role.level,
          is_system: role.is_system,
          is_active: role.is_active,
          permissions:
            role.permissions?.map((permission) => ({
              id: permission.id,
              name: permission.name,
              code: permission.code,
              module: permission.module,
              description: permission.description,
            })) || [],
          area: role.area
            ? {
                id: role.area.id,
                name: role.area.name,
                code: role.area.code,
                is_active: role.area.is_active,
              }
            : null,
          subarea: role.subarea
            ? {
                id: role.subarea.id,
                name: role.subarea.name,
                nomenclature: role.subarea.nomenclature,
                is_active: role.subarea.is_active,
              }
            : null,
        }
      : null,
  };
};

const findVisibleUserById = async (userId, transaction = null) => {
  return User.findByPk(userId, {
    include: userInclude(),
    transaction,
  });
};

const validateUniqueUserFields = async ({
  email,
  username,
  numero_nomina = null,
  excludeUserId = null,
  transaction = null,
}) => {
  const orConditions = [{ email }, { username }];
  if (numero_nomina) {
    orConditions.push({ numero_nomina });
  }

  const where = {
    [Op.or]: orConditions,
  };

  if (excludeUserId) {
    where.id = {
      [Op.ne]: excludeUserId,
    };
  }

  const existingUser = await User.findOne({
    where,
    transaction,
  });

  if (!existingUser) return;

  if (existingUser.email === email) {
    throwHttpError('El correo ya está registrado.', 400);
  }

  if (existingUser.username === username) {
    throwHttpError('El nombre de usuario ya está registrado.', 400);
  }

  if (numero_nomina && existingUser.numero_nomina === numero_nomina) {
    throwHttpError('El número de nómina ya está registrado.', 400);
  }
};

const buildScopeWhereClause = (actorRole) => {
  const roleCode = String(actorRole?.code || '').toUpperCase();
  const areaFallbacks = { ADMIN_EXT: 2, ADMIN_EXTRUSION: 2, SUPERVISOR_EXTRUSION: 2, OPERADOR_EXTRUSION: 2, ADMIN_TELARES: 3, ADMIN_TEL: 3, SUPERVISOR_TELARES: 3, OPERADOR_TELARES: 3 };
  const areaId = actorRole?.area_id ?? areaFallbacks[roleCode] ?? null;
  const isKnownAreaScopedRole = [...Object.keys(areaFallbacks), 'ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode);
  const isGlobal = isAdmin({ role: actorRole }) || (!isKnownAreaScopedRole && actorRole.area_id === null && actorRole.subarea_id === null);
  if (isGlobal) {
    return {}; // No filter, can see everyone
  }

  const isAreaAdmin = areaId !== null && actorRole.subarea_id === null;
  if (isAreaAdmin) {
    return { '$role.area_id$': areaId };
  }

  // Subarea admin
  return { 
    '$role.area_id$': actorRole.area_id,
    '$role.subarea_id$': actorRole.subarea_id 
  };
};

const getUsers = async (currentUser) => {
  assertUserManagementActor(currentUser);
  const scopeWhere = buildScopeWhereClause(currentUser.role);
  
  const users = await User.findAll({
    where: scopeWhere,
    include: userInclude(),
    order: [['id', 'ASC']],
  });

  return users
    .filter((user) => AuthorizationService.canViewUser(currentUser.role, user.role))
    .map(buildUserResponse);
};

const getUserById = async (userId, currentUser) => {
  assertUserManagementActor(currentUser);
  const user = await findVisibleUserById(userId);

  if (!user) {
    throwHttpError('Usuario no encontrado.', 404);
  }

  if (!AuthorizationService.canViewUser(currentUser.role, user.role)) {
    throwHttpError('No tienes permisos para ver este usuario.', 403);
  }

  return buildUserResponse(user);
};

const createUser = async (payload, currentUser) => {
  assertUserManagementActor(currentUser);
  return sequelize.transaction(async (transaction) => {
    const roleToAssign = await Role.findByPk(payload.role_id, { transaction });
    
    if (!roleToAssign || !roleToAssign.is_active) {
      throwHttpError('El rol seleccionado no existe o está inactivo.', 400);
    }

    if (!AuthorizationService.canAssignRole(currentUser.role, roleToAssign)) {
      throwHttpError('No tienes permisos para asignar este rol.', 403);
    }

    // Auto-generar username basado en las 3 primeras letras del nombre y apellido
    const normalizeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    const cleanFirstName = normalizeName(payload.first_name);
    const cleanLastName = normalizeName(payload.last_name);
    const baseUsername = `${cleanFirstName.substring(0, 3)}${cleanLastName.substring(0, 3)}`;
    if (baseUsername.length < 3) {
      throwHttpError('No se pudo generar el usuario. Verifica nombre y apellidos.', 400);
    }

    let generatedUsername = baseUsername;
    let seq = 1;
    let exists = true;
    while(exists) {
      const user = await User.findOne({ where: { username: generatedUsername }, transaction });
      if (user) {
        generatedUsername = `${baseUsername}${String(seq).padStart(3, '0')}`;
        seq++;
      } else {
        exists = false;
      }
    }
    payload.username = generatedUsername;

    await validateUniqueUserFields({
      email: payload.email,
      username: payload.username,
      numero_nomina: payload.numero_nomina,
      transaction,
    });

    let isActive = payload.is_active ?? true;
    if (payload.status === 'PENDING') {
      isActive = false;
    }
    
    const tempPassword = payload.password || Math.random().toString(36).slice(-8) + '1Aa@';
    const passwordHash = await bcrypt.hash(tempPassword, PASSWORD_SALT_ROUNDS);

    const createdUser = await User.create(
      {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        username: payload.username,
        numero_nomina: payload.numero_nomina || null,
        telefono: payload.telefono || null,
        password_hash: passwordHash,
        role_id: roleToAssign.id,
        is_active: isActive,
        must_change_password: payload.must_change_password ?? true,
      },
      { transaction }
    );

    const isGlobalAdmin = isAdmin(currentUser);
    if (!isGlobalAdmin) {
      const globalAdmins = await User.findAll({
        include: [{
          model: Role,
          as: 'role',
          where: {
            [Op.or]: [
              { area_id: null, subarea_id: null },
              { code: ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'] }
            ]
          }
        }],
        where: { is_active: true },
        transaction
      });
      
      const notifications = globalAdmins.map(admin => ({
        recipient_id: admin.id,
        sender_id: currentUser.id,
        type: 'SYSTEM',
        title: 'Nuevo usuario creado por Administrador de Área',
        message: `El usuario ${currentUser.first_name} ${currentUser.last_name} ha creado al usuario ${createdUser.first_name} ${createdUser.last_name} (${createdUser.username}) con el rol ${roleToAssign.name}.`,
      }));

      if (notifications.length > 0) {
        await Notification.bulkCreate(notifications, { transaction });
      }
    }

    const user = await findVisibleUserById(createdUser.id, transaction);
    return buildUserResponse(user);
  });
};

const updateUser = async (userId, payload, currentUser) => {
  assertUserManagementActor(currentUser);
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    if (!AuthorizationService.canManageUser(currentUser.role, user.role)) {
      throwHttpError('No tienes permisos para editar este usuario.', 403);
    }

    let targetRole = user.role;
    if (payload.role_id && payload.role_id !== user.role_id) {
      targetRole = await Role.findByPk(payload.role_id, { transaction });
      if (!targetRole || !targetRole.is_active) {
        throwHttpError('El nuevo rol seleccionado no existe o está inactivo.', 400);
      }
      
      if (!AuthorizationService.canChangeRole(currentUser.role, user.role, targetRole)) {
        throwHttpError('No tienes permisos para cambiar a este rol.', 403);
      }
    }

    if (payload.email || payload.username || payload.numero_nomina) {
      await validateUniqueUserFields({
        email: payload.email || user.email,
        username: payload.username || user.username,
        numero_nomina: Object.prototype.hasOwnProperty.call(payload, 'numero_nomina') ? (payload.numero_nomina || null) : user.numero_nomina,
        excludeUserId: user.id,
        transaction,
      });
    }

    const isGlobalAdmin = isAdmin(currentUser);
    const mayManageAreaActivation = AuthorizationService.isAreaAdminRole(currentUser.role);
    const currentResponsibility = getResponsibility(user.role);
    const nextResponsibility = getResponsibility(targetRole);
    const roleChanged = Number(targetRole.id) !== Number(user.role_id);
    const isLeavingResponsibleRole = user.is_active && (
      payload.is_active === false
      || (roleChanged && currentResponsibility && (
        currentResponsibility.areaId !== nextResponsibility?.areaId
        || currentResponsibility.kind !== nextResponsibility?.kind
      ))
    );
    if (payload.is_active === false && Number(user.id) === Number(currentUser.id)) {
      throwHttpError('No puedes desactivar tu propio usuario.', 400);
    }
    if (isLeavingResponsibleRole) await assertAreaResponsibleCanBeRemoved(user.role, transaction);

    const updateData = {
      first_name: payload.first_name ?? user.first_name,
      last_name: payload.last_name ?? user.last_name,
      email: payload.email ?? user.email,
      username: payload.username ?? user.username,
      numero_nomina: Object.prototype.hasOwnProperty.call(payload, 'numero_nomina') ? (payload.numero_nomina || null) : user.numero_nomina,
      telefono: Object.prototype.hasOwnProperty.call(payload, 'telefono') ? (payload.telefono || null) : user.telefono,
      role_id: targetRole.id,
      is_active: (isGlobalAdmin || mayManageAreaActivation) ? (payload.is_active ?? user.is_active) : user.is_active,
      must_change_password: payload.must_change_password ?? user.must_change_password,
    };

    if (payload.password) {
      updateData.password_hash = await bcrypt.hash(payload.password, PASSWORD_SALT_ROUNDS);
    }

    await user.update(updateData, { transaction });

    const updatedUser = await findVisibleUserById(user.id, transaction);
    return buildUserResponse(updatedUser);
  });
};

const deleteUser = async (userId, currentUser, options = {}) => {
  assertUserManagementActor(currentUser);
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, transaction);
    const { action = 'deactivate', reason = 'Sin justificación' } = options;
    const { AuditLog } = require('../../database/models');

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    if (Number(user.id) === Number(currentUser.id)) {
      throwHttpError('No puedes desactivar tu propio usuario.', 400);
    }

    if (AuthorizationService.isAreaAdminRole(currentUser.role) && action === 'delete') {
      throwHttpError('Los administradores de área pueden desactivar usuarios, pero no eliminarlos físicamente.', 403);
    }

    if (!AuthorizationService.canDisableUser(currentUser.role, user.role)) {
      throwHttpError('No tienes permisos para desactivar este usuario.', 403);
    }

    if (user.role?.code === SUPERADMIN_ROLE_CODE) {
      const activeSuperadmins = await User.count({
        include: [{
          model: Role,
          as: 'role',
          required: true,
          where: { code: SUPERADMIN_ROLE_CODE },
        }],
        where: { is_active: true },
        transaction,
      });

      if (activeSuperadmins <= 1) {
        throwHttpError('No se puede desactivar el último Superadmin activo.', 400);
      }
    }

    if (user.is_active) await assertAreaResponsibleCanBeRemoved(user.role, transaction);

    if (action === 'delete') {
      if (typeof user.destroy === 'function') {
        await user.destroy({ transaction });
      } else {
        await user.update({ is_active: false, deleted_at: new Date() }, { transaction });
      }
    } else {
      await user.update({ is_active: false }, { transaction });
    }

    if (AuditLog) {
      await AuditLog.create({
        user_id: currentUser.id,
        action_type: action === 'delete' ? 'SOFT_DELETE' : 'DEACTIVATE',
        table_name: User.tableName || User.name,
        record_id: user.id,
        details: { reason, username: user.username, email: user.email }
      }, { transaction });
    }

    const updatedUser = await findVisibleUserById(user.id, transaction);
    return buildUserResponse(updatedUser);
  });
};

const requestDeactivation = async (userId, currentUser) => {
  assertUserManagementActor(currentUser);
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    if (!AuthorizationService.canManageUser(currentUser.role, user.role)) {
      throwHttpError('No tienes permisos para solicitar la desactivación de este usuario.', 403);
    }

    if (Number(user.id) === Number(currentUser.id)) {
      throwHttpError('No puedes solicitar la desactivación de tu propio usuario.', 400);
    }

    if (!user.is_active) {
      throwHttpError('El usuario ya está inactivo.', 400);
    }

    // Find global admins
    const globalAdmins = await User.findAll({
      include: [{
        model: Role,
        as: 'role',
        where: { area_id: null, subarea_id: null }
      }],
      where: { is_active: true },
      transaction
    });

    const notifications = globalAdmins.map(admin => ({
      recipient_id: admin.id,
      sender_id: currentUser.id,
      type: `USER_DEACTIVATION_REQUEST|userId=${user.id}`,
      title: 'Solicitud de Desactivación de Usuario',
      message: `El usuario ${currentUser.first_name} ${currentUser.last_name} ha solicitado desactivar al usuario ${user.first_name} ${user.last_name}.`,
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications, { transaction });
    }

    return true;
  });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  requestDeactivation,
};
