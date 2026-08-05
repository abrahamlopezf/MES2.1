const service = require('./operationalArea.service');
const { sendSuccess } = require('../../../utils/apiResponse');

const list = async (req, res) => {
  const result = await service.list(req.query);
  return sendSuccess(res, result.data, result.meta);
};

const getByUuid = async (req, res) => {
  const record = await service.findByUuid(req.params.uuid);
  return sendSuccess(res, record);
};

const create = async (req, res) => {
  const record = await service.create(req.body);
  return sendSuccess(res, record, {}, 201);
};

const update = async (req, res) => {
  const record = await service.update(req.params.uuid, req.body);
  return sendSuccess(res, record);
};

const remove = async (req, res) => {
  const result = await service.delete(req.params.uuid);
  return sendSuccess(res, result);
};

const restore = async (req, res) => {
  const result = await service.restore(req.params.uuid);
  return sendSuccess(res, result);
};

module.exports = { list, getByUuid, create, update, remove, restore };
