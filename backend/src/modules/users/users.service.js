const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const { User, Role, Area, Subarea, Permission, Notification, sequelize } = require('../../database/models');
const {
  SUPERADMIN_ROLE_CODE,
  isSuperadmin,
  isAdmin,
  throwHttpError,
} = require('../../shared/security/accessRules');
const AuthorizationService = require('../../shared/security/authorization.service');

const PASSWORD_SALT_ROUNDS = 12;

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
  const isGlobal = actorRole.area_id === null && actorRole.subarea_id === null;
  if (isGlobal) {
    return {}; // No filter, can see everyone
  }

  const isAreaAdmin = actorRole.area_id !== null && actorRole.subarea_id === null;
  if (isAreaAdmin) {
    return { '$role.area_id$': actorRole.area_id };
  }

  // Subarea admin
  return { 
    '$role.area_id$': actorRole.area_id,
    '$role.subarea_id$': actorRole.subarea_id 
  };
};

const getUsers = async (currentUser) => {
  const scopeWhere = buildScopeWhereClause(currentUser.role);
  
  const users = await User.findAll({
    where: scopeWhere,
    include: userInclude(),
    order: [['id', 'ASC']],
  });

  return users.map(buildUserResponse);
};

const getUserById = async (userId, currentUser) => {
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
  return sequelize.transaction(async (transaction) => {
    const roleToAssign = await Role.findByPk(payload.role_id, { transaction });
    
    if (!roleToAssign || !roleToAssign.is_active) {
      throwHttpError('El rol seleccionado no existe o está inactivo.', 400);
    }

    if (!AuthorizationService.canAssignRole(currentUser.role, roleToAssign)) {
      throwHttpError('No tienes permisos para asignar este rol.', 403);
    }

    await validateUniqueUserFields({
      email: payload.email,
      username: payload.username,
      numero_nomina: payload.numero_nomina,
      transaction,
    });

    const isGlobalAdmin = currentUser.role.area_id === null && currentUser.role.subarea_id === null;
    const isActive = isGlobalAdmin ? (payload.is_active ?? true) : false;
    
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

    if (!isGlobalAdmin) {
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
        type: 'USER_ACTIVATION_REQUEST',
        title: 'Nueva solicitud de activación',
        message: `El usuario ${currentUser.first_name} ${currentUser.last_name} ha creado al usuario ${createdUser.first_name} ${createdUser.last_name} y está pendiente de activación.`,
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

    const isGlobalAdmin = currentUser.role.area_id === null && currentUser.role.subarea_id === null;

    const updateData = {
      first_name: payload.first_name ?? user.first_name,
      last_name: payload.last_name ?? user.last_name,
      email: payload.email ?? user.email,
      username: payload.username ?? user.username,
      numero_nomina: Object.prototype.hasOwnProperty.call(payload, 'numero_nomina') ? (payload.numero_nomina || null) : user.numero_nomina,
      telefono: Object.prototype.hasOwnProperty.call(payload, 'telefono') ? (payload.telefono || null) : user.telefono,
      role_id: targetRole.id,
      is_active: isGlobalAdmin ? (payload.is_active ?? user.is_active) : user.is_active,
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

const deleteUser = async (userId, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    if (Number(user.id) === Number(currentUser.id)) {
      throwHttpError('No puedes desactivar tu propio usuario.', 400);
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

    await user.update({ is_active: false }, { transaction });

    const updatedUser = await findVisibleUserById(user.id, transaction);
    return buildUserResponse(updatedUser);
  });
};

const requestDeactivation = async (userId, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
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