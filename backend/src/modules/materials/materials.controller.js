const materialsService = require('./materials.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const getCategories = async (req, res, next) => {
  try {
    const categories = await materialsService.getCategories({
      query: req.query,
      currentUser: req.user,
    });

    return successResponse(res, categories, 'Categorías consultadas correctamente.');
  } catch (error) {
    return next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await materialsService.getCategoryById({
      id: req.params.id,
      currentUser: req.user,
    });

    return successResponse(res, category, 'Categoría consultada correctamente.');
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await materialsService.createCategory({
      payload: req.body,
      currentUser: req.user,
    });

    return successResponse(res, category, 'Categoría creada correctamente.', 201);
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await materialsService.updateCategory({
      id: req.params.id,
      payload: req.body,
      currentUser: req.user,
    });

    return successResponse(res, category, 'Categoría actualizada correctamente.');
  } catch (error) {
    return next(error);
  }
};

const deactivateCategory = async (req, res, next) => {
  try {
    const category = await materialsService.deactivateCategory({
      id: req.params.id,
      currentUser: req.user,
    });

    return successResponse(res, category, 'Categoría desactivada correctamente.');
  } catch (error) {
    return next(error);
  }
};

const getMaterials = async (req, res, next) => {
  try {
    const materials = await materialsService.getMaterials({
      query: req.query,
      currentUser: req.user,
    });

    return successResponse(res, materials, 'Materiales consultados correctamente.');
  } catch (error) {
    return next(error);
  }
};

const getMaterialById = async (req, res, next) => {
  try {
    const material = await materialsService.getMaterialById({
      id: req.params.id,
      currentUser: req.user,
    });

    return successResponse(res, material, 'Material consultado correctamente.');
  } catch (error) {
    return next(error);
  }
};

const createMaterial = async (req, res, next) => {
  try {
    const material = await materialsService.createMaterial({
      payload: req.body,
      currentUser: req.user,
    });

    return successResponse(res, material, 'Material creado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
};

const updateMaterial = async (req, res, next) => {
  try {
    const material = await materialsService.updateMaterial({
      id: req.params.id,
      payload: req.body,
      currentUser: req.user,
    });

    return successResponse(res, material, 'Material actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
};

const deactivateMaterial = async (req, res, next) => {
  try {
    const material = await materialsService.deactivateMaterial({
      id: req.params.id,
      currentUser: req.user,
    });

    return successResponse(res, material, 'Material desactivado correctamente.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deactivateMaterial,
};