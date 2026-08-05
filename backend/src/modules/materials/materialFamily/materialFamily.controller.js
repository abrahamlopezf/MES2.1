const materialFamilyService = require('./materialFamily.service');
const { sendSuccess } = require('../../../utils/apiResponse');

const list = async (req, res) => {
  const result = await materialFamilyService.list(req.query);
  return sendSuccess(res, result.data, result.meta);
};

const getByUuid = async (req, res) => {
  const { uuid } = req.params;
  const record = await materialFamilyService.findByUuid(uuid);
  return sendSuccess(res, record);
};

const create = async (req, res) => {
  const record = await materialFamilyService.create(req.body);
  return sendSuccess(res, record, {}, 201);
};

const update = async (req, res) => {
  const { uuid } = req.params;
  const record = await materialFamilyService.update(uuid, req.body);
  return sendSuccess(res, record);
};

const remove = async (req, res) => {
  const { uuid } = req.params;
  const result = await materialFamilyService.delete(uuid);
  return sendSuccess(res, result);
};

const restore = async (req, res) => {
  const { uuid } = req.params;
  const result = await materialFamilyService.restore(uuid);
  return sendSuccess(res, result);
};

module.exports = {
  list,
  getByUuid,
  create,
  update,
  remove,
  restore
};
