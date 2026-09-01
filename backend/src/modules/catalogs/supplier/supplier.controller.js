const service = require('./supplier.service');
const { sendSuccess } = require('../../../utils/apiResponse');

const list = async (req, res) => {
  const result = await service.list(req.query);
  return sendSuccess(res, result.data, result.meta);
};

const getByUuid = async (req, res) => {
  const record = await service.findByUuid(req.params.uuid);
  return sendSuccess(res, record);
};

const generateCode = (name, commercialName) => {
  const sanitize = (str) => (str || '').toUpperCase().replace(/[^A-Z]/g, '');
  const rz = sanitize(name).substring(0, 3).padEnd(3, 'X');
  const cm = sanitize(commercialName).substring(0, 2).padEnd(2, 'X');
  return `PROV-${rz}-${cm}`;
};

const create = async (req, res) => {
  const payload = { ...req.body };
  if (!payload.code) {
    payload.code = generateCode(payload.name, payload.commercial_name);
  }
  
  const record = await service.create({
    ...payload,
    created_by: req.user?.id
  });
  return sendSuccess(res, record, {}, 201);
};

const update = async (req, res) => {
  const record = await service.update(req.params.uuid, {
    ...req.body,
    updated_by: req.user?.id
  });
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
