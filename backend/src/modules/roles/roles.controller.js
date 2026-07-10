const rolesService = require('./roles.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const getRoles = async (req, res, next) => {
  try {
    const roles = await rolesService.getRoles(req.user);

    return successResponse(res, 'Roles obtenidos correctamente.', roles);
  } catch (error) {
    return next(error);
  }
};

const getRoleById = async (req, res, next) => {
  try {
    const role = await rolesService.getRoleById(req.params.id, req.user);

    return successResponse(res, 'Rol obtenido correctamente.', role);
  } catch (error) {
    return next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const role = await rolesService.createRole(req.body, req.user);

    return successResponse(res, 'Rol creado correctamente.', role, 201);
  } catch (error) {
    return next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await rolesService.updateRole(req.params.id, req.body, req.user);

    return successResponse(res, 'Rol actualizado correctamente.', role);
  } catch (error) {
    return next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const role = await rolesService.deleteRole(req.params.id, req.user);

    return successResponse(res, 'Rol desactivado correctamente.', role);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};