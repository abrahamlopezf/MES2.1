const Joi = require('joi');

const listContainersSchema = Joi.object({
  status: Joi.string().valid('EMPTY', 'AVAILABLE', 'NEAR_FULL', 'FULL', 'INACTIVE', 'BLOCKED', 'DISPOSED').optional(),
  scrap_catalog_id: Joi.number().integer().positive().optional()
});

const getContainerSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const createMovementSchema = Joi.object({
  container_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().required(),
  movement_type: Joi.string().valid('GENERACION', 'TRASLADO', 'SALIDA_RECICLAJE', 'AJUSTE', 'CANCELACION').required(),
  process_run_id: Joi.number().integer().positive().optional().allow(null),
  traceable_item_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().max(500).optional().allow('', null),
  reference_folio: Joi.string().max(100).optional().allow('', null)
});

const transferSchema = Joi.object({
  origin_container_id: Joi.number().integer().positive().required(),
  destination_container_id: Joi.number().integer().positive().required().invalid(Joi.ref('origin_container_id')),
  quantity: Joi.number().positive().required(),
  notes: Joi.string().max(500).optional().allow('', null)
});

const recyclingSchema = Joi.object({
  container_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().required(),
  reference_folio: Joi.string().max(100).optional().allow('', null),
  notes: Joi.string().max(500).optional().allow('', null)
});

module.exports = {
  listContainersSchema,
  getContainerSchema,
  createMovementSchema,
  transferSchema,
  recyclingSchema
};
