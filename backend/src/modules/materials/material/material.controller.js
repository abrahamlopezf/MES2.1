const crudService = require('./material.crud.service');
const searchService = require('./material.search.service');
const { sendSuccess } = require('../../../utils/apiResponse');

const search = async (req, res) => {
  const result = await searchService.search(req.query);
  return sendSuccess(res, result.data, result.meta);
};

const getByUuid = async (req, res) => {
  const record = await searchService.getByUuid(req.params.uuid);
  return sendSuccess(res, record);
};

const create = async (req, res) => {
  const record = await crudService.create(req.body);
  return sendSuccess(res, record, {}, 201);
};

const update = async (req, res) => {
  const record = await crudService.update(req.params.uuid, req.body);
  return sendSuccess(res, record);
};

const remove = async (req, res) => {
  const result = await crudService.delete(req.params.uuid);
  return sendSuccess(res, result);
};

const restore = async (req, res) => {
  const result = await crudService.restore(req.params.uuid);
  return sendSuccess(res, result);
};

module.exports = {
  search,
  getByUuid,
  create,
  update,
  remove,
  restore
};
