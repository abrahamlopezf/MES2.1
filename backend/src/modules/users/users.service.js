const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const { User, Role, Area, Permission, sequelize } = require('../../database/models');
const {
  SUPERADMIN_ROLE_CODE,
  isSuperadmin,
  throwHttpError,
} = require('../../shared/security/accessRules');

const AREA_REQUIRED_ROLES = ['SUPERVISOR', 'EMPLOYEE'];
const PASSWORD_SALT_ROUNDS = 12;

const userInclude = (currentUser, options = {}) => {
  const includeSuperadmin = isSuperadmin(currentUser) || options.includeSuperadmin === true;

  return [
    {
      model: Role,
      as: 'role',
      required: true,
      where: includeSuperadmin
        ? {}
        : {
            code: {
              [Op.ne]: SUPERADMIN_ROLE_CODE,
            },
          },
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: {
            attributes: [],
          },
        },
      ],
    },
    {
      model: Area,
      as: 'area',
      required: false,
    },
  ];
};

const buildUserResponse = (user) => {
  if (!user) return null;

  const plainUser = user.get ? user.get({ plain: true }) : user;

  return {
    id: plainUser.id,
    first_name: plainUser.first_name,
    last_name: plainUser.last_name,
    email: plainUser.email,
    username: plainUser.username,
    is_active: plainUser.is_active,
    must_change_password: plainUser.must_change_password,
    last_login_at: plainUser.last_login_at,
    created_at: plainUser.created_at,
    updated_at: plainUser.updated_at,
    role: plainUser.role
      ? {
          id: plainUser.role.id,
          name: plainUser.role.name,
          code: plainUser.role.code,
          description: plainUser.role.description,
          is_system: plainUser.role.is_system,
          is_active: plainUser.role.is_active,
          permissions:
            plainUser.role.permissions?.map((permission) => ({
              id: permission.id,
              name: permission.name,
              code: permission.code,
              module: permission.module,
              description: permission.description,
            })) || [],
        }
      : null,
    area: plainUser.area
      ? {
          id: plainUser.area.id,
          name: plainUser.area.name,
          code: plainUser.area.code,
          description: plainUser.area.description,
          is_active: plainUser.area.is_active,
        }
      : null,
  };
};

const findVisibleUserById = async (userId, currentUser, transaction = null) => {
  return User.findByPk(userId, {
    include: userInclude(currentUser),
    transaction,
  });
};

const findRoleForAssignment = async (roleId, currentUser, transaction = null) => {
  const role = await Role.findByPk(roleId, {
    transaction,
  });

  if (!role || !role.is_active) {
    throwHttpError('El rol seleccionado no existe o está inactivo.', 400);
  }

  if (role.code === SUPERADMIN_ROLE_CODE && !isSuperadmin(currentUser)) {
    throwHttpError('El rol seleccionado no está disponible.', 400);
  }

  return role;
};

const validateAreaRequirement = async (role, areaId, transaction = null) => {
  if (AREA_REQUIRED_ROLES.includes(role.code) && !areaId) {
    throwHttpError('Este rol requiere un área asignada.', 400);
  }

  if (!areaId) return null;

  const area = await Area.findByPk(areaId, {
    transaction,
  });

  if (!area || !area.is_active) {
    throwHttpError('El área seleccionada no existe o está inactiva.', 400);
  }

  return area;
};

const validateUniqueUserFields = async ({
  email,
  username,
  currentUser,
  excludeUserId = null,
  transaction = null,
}) => {
  const where = {
    [Op.or]: [{ email }, { username }],
  };

  if (excludeUserId) {
    where.id = {
      [Op.ne]: excludeUserId,
    };
  }

  const existingUser = await User.findOne({
    where,
    include: [
      {
        model: Role,
        as: 'role',
        required: false,
      },
    ],
    transaction,
  });

  if (!existingUser) return;

  const existingRoleCode = existingUser.role?.code;

  if (existingRoleCode === SUPERADMIN_ROLE_CODE && !isSuperadmin(currentUser)) {
    throwHttpError('No se pudo procesar el usuario con los datos proporcionados.', 400);
  }

  if (existingUser.email === email) {
    throwHttpError('El correo ya está registrado.', 400);
  }

  if (existingUser.username === username) {
    throwHttpError('El nombre de usuario ya está registrado.', 400);
  }
};

const getUsers = async (currentUser) => {
  const users = await User.findAll({
    include: userInclude(currentUser),
    order: [['id', 'ASC']],
  });

  return users.map(buildUserResponse);
};

const getUserById = async (userId, currentUser) => {
  const user = await findVisibleUserById(userId, currentUser);

  if (!user) {
    throwHttpError('Usuario no encontrado.', 404);
  }

  return buildUserResponse(user);
};

const createUser = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const role = await findRoleForAssignment(payload.role_id, currentUser, transaction);

    await validateAreaRequirement(role, payload.area_id, transaction);

    await validateUniqueUserFields({
      email: payload.email,
      username: payload.username,
      currentUser,
      transaction,
    });

    const passwordHash = await bcrypt.hash(payload.password, PASSWORD_SALT_ROUNDS);

    const createdUser = await User.create(
      {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        username: payload.username,
        password_hash: passwordHash,
        role_id: role.id,
        area_id: payload.area_id || null,
        is_active: payload.is_active ?? true,
        must_change_password: payload.must_change_password ?? true,
      },
      {
        transaction,
      }
    );

    const user = await findVisibleUserById(createdUser.id, currentUser, transaction);

    return buildUserResponse(user);
  });
};

const updateUser = async (userId, payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, currentUser, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    let role = user.role;

    if (payload.role_id) {
      role = await findRoleForAssignment(payload.role_id, currentUser, transaction);
    }

    await validateAreaRequirement(
      role,
      Object.prototype.hasOwnProperty.call(payload, 'area_id') ? payload.area_id : user.area_id,
      transaction
    );

    if (payload.email || payload.username) {
      await validateUniqueUserFields({
        email: payload.email || user.email,
        username: payload.username || user.username,
        currentUser,
        excludeUserId: user.id,
        transaction,
      });
    }

    const updateData = {
      first_name: payload.first_name ?? user.first_name,
      last_name: payload.last_name ?? user.last_name,
      email: payload.email ?? user.email,
      username: payload.username ?? user.username,
      role_id: payload.role_id ?? user.role_id,
      area_id: AREA_REQUIRED_ROLES.includes(role.code)
        ? payload.area_id ?? user.area_id
        : null,
      is_active: payload.is_active ?? user.is_active,
      must_change_password: payload.must_change_password ?? user.must_change_password,
    };

    if (payload.password) {
      updateData.password_hash = await bcrypt.hash(payload.password, PASSWORD_SALT_ROUNDS);
    }

    await user.update(updateData, {
      transaction,
    });

    const updatedUser = await findVisibleUserById(user.id, currentUser, transaction);

    return buildUserResponse(updatedUser);
  });
};

const deleteUser = async (userId, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const user = await findVisibleUserById(userId, currentUser, transaction);

    if (!user) {
      throwHttpError('Usuario no encontrado.', 404);
    }

    if (Number(user.id) === Number(currentUser.id)) {
      throwHttpError('No puedes desactivar tu propio usuario.', 400);
    }

    if (user.role?.code === SUPERADMIN_ROLE_CODE) {
      const activeSuperadmins = await User.count({
        include: [
          {
            model: Role,
            as: 'role',
            required: true,
            where: {
              code: SUPERADMIN_ROLE_CODE,
            },
          },
        ],
        where: {
          is_active: true,
        },
        transaction,
      });

      if (activeSuperadmins <= 1) {
        throwHttpError('No se puede desactivar el último Superadmin activo.', 400);
      }
    }

    await user.update(
      {
        is_active: false,
      },
      {
        transaction,
      }
    );

    const updatedUser = await findVisibleUserById(user.id, currentUser, transaction);

    return buildUserResponse(updatedUser);
  });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};