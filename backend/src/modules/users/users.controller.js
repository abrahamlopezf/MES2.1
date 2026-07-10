const usersService = require('./users.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const getUsers = async (req, res, next) => {
  try {
    const users = await usersService.getUsers(req.user);

    return successResponse(res, 'Usuarios obtenidos correctamente.', users);
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id, req.user);

    return successResponse(res, 'Usuario obtenido correctamente.', user);
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body, req.user);

    return successResponse(res, 'Usuario creado correctamente.', user, 201);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);

    return successResponse(res, 'Usuario actualizado correctamente.', user);
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await usersService.deleteUser(req.params.id, req.user);

    return successResponse(res, 'Usuario desactivado correctamente.', user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};