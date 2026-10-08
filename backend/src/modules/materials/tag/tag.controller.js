const tagService = require('./tag.service');
const { successResponse } = require('../../../shared/responses/apiResponse');

const getAllTags = async (req, res, next) => {
  try {
    const data = await tagService.getAllTags();
    return successResponse(res, 'Etiquetas obtenidas correctamente', data);
  } catch (error) {
    next(error);
  }
};

const getActiveTags = async (req, res, next) => {
  try {
    const data = await tagService.getActiveTags();
    return successResponse(res, 'Etiquetas activas obtenidas correctamente', data);
  } catch (error) {
    next(error);
  }
};

const getTagById = async (req, res, next) => {
  try {
    const data = await tagService.getTagById(req.params.id);
    return successResponse(res, 'Etiqueta obtenida correctamente', data);
  } catch (error) {
    next(error);
  }
};

const createTag = async (req, res, next) => {
  try {
    const data = await tagService.createTag(req.body, req.user);
    return successResponse(res, 'Etiqueta creada correctamente', data, 201);
  } catch (error) {
    next(error);
  }
};

const updateTag = async (req, res, next) => {
  try {
    const data = await tagService.updateTag(req.params.id, req.body, req.user);
    return successResponse(res, 'Etiqueta actualizada correctamente', data);
  } catch (error) {
    next(error);
  }
};

const deleteTag = async (req, res, next) => {
  try {
    const data = await tagService.deleteTag(req.params.id, req.user);
    return successResponse(res, 'Etiqueta eliminada correctamente', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTags,
  getActiveTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag
};
