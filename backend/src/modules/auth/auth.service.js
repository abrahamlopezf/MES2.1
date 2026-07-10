const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const db = require('../../database/models');
const env = require('../../config/env');

const buildUserPayload = (user) => {
  const plainUser = user.get({ plain: true });

  return {
    id: plainUser.id,
    first_name: plainUser.first_name,
    last_name: plainUser.last_name,
    email: plainUser.email,
    username: plainUser.username,
    is_active: plainUser.is_active,
    must_change_password: plainUser.must_change_password,
    last_login_at: plainUser.last_login_at,
    role: plainUser.role
      ? {
          id: plainUser.role.id,
          name: plainUser.role.name,
          code: plainUser.role.code,
        }
      : null,
    area: plainUser.area
      ? {
          id: plainUser.area.id,
          name: plainUser.area.name,
          code: plainUser.area.code,
        }
      : null,
    permissions: plainUser.role?.permissions
      ? plainUser.role.permissions.map((permission) => permission.code)
      : [],
  };
};

const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      roleCode: user.role?.code,
      areaId: user.area?.id || null,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    }
  );
};

const findUserWithSecurityData = async (where, includePassword = false) => {
  const userModel = includePassword ? db.User.unscoped() : db.User;

  return userModel.findOne({
    where,
    include: [
      {
        model: db.Role,
        as: 'role',
        where: {
          is_active: true,
        },
        include: [
          {
            model: db.Permission,
            as: 'permissions',
            through: {
              attributes: [],
            },
          },
        ],
      },
      {
        model: db.Area,
        as: 'area',
        required: false,
      },
    ],
  });
};

const login = async ({ identifier, password }) => {
  const user = await findUserWithSecurityData(
    {
      [Op.or]: [
        { username: identifier },
        { email: identifier },
      ],
    },
    true
  );

  if (!user) {
    const error = new Error('Usuario o contraseña incorrectos.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Este usuario está desactivado.');
    error.statusCode = 403;
    throw error;
  }

  if (!user.role || !user.role.is_active) {
    const error = new Error('El rol asignado no está disponible.');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error('Usuario o contraseña incorrectos.');
    error.statusCode = 401;
    throw error;
  }

  await user.update({
    last_login_at: new Date(),
  });

  const refreshedUser = await findUserWithSecurityData({ id: user.id }, false);

  const token = generateToken(refreshedUser);
  const userPayload = buildUserPayload(refreshedUser);

  return {
    token,
    user: userPayload,
  };
};

const getCurrentUser = async (userId) => {
  const user = await findUserWithSecurityData({ id: userId }, false);

  if (!user) {
    const error = new Error('La sesión ya no es válida.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Este usuario está desactivado.');
    error.statusCode = 403;
    throw error;
  }

  return buildUserPayload(user);
};

module.exports = {
  login,
  getCurrentUser,
};