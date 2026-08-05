const fs = require('fs');
const path = require('path');

const catalogs = [
  { name: 'MaterialCode', routeName: 'material-codes', displayName: 'Código de Material' },
  { name: 'MaterialCategory', routeName: 'material-categories', displayName: 'Categoría de Material' },
  { name: 'MaterialBrand', routeName: 'material-brands', displayName: 'Marca de Material' },
  { name: 'MaterialType', routeName: 'material-types', displayName: 'Tipo de Material' },
  { name: 'OperationalArea', routeName: 'operational-areas', displayName: 'Área Operacional' }
];

const basePath = path.join(__dirname, 'src/modules/materials');

catalogs.forEach(cat => {
  // Para OperationalArea, lo pondremos en su propio lugar o en materials? 
  // Según index.js, OperationalArea ya podría tener una carpeta o usar la que queramos.
  // Lo pondré en materials/operationalArea por consistencia.
  
  const camelName = cat.name.charAt(0).toLowerCase() + cat.name.slice(1);
  const folderPath = path.join(basePath, camelName);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Schema
  fs.writeFileSync(path.join(folderPath, `${camelName}.schema.js`), `const { z } = require('zod');

const createSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(15, 'El código no puede exceder 15 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional()
});

module.exports = { createSchema, updateSchema };
`);

  // Service
  fs.writeFileSync(path.join(folderPath, `${camelName}.service.js`), `const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { ${cat.name} } = require('../../../database/models');

class ${cat.name}Service extends BaseCatalogService {
  constructor() {
    super(${cat.name}, '${cat.displayName}');
  }
}

module.exports = new ${cat.name}Service();
`);

  // Controller
  fs.writeFileSync(path.join(folderPath, `${camelName}.controller.js`), `const service = require('./${camelName}.service');
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
`);

  // Routes
  fs.writeFileSync(path.join(folderPath, `${camelName}.routes.js`), `const express = require('express');
const router = express.Router();
const controller = require('./${camelName}.controller');
const validateRequest = require('../../../middlewares/validateRequest');
const schema = require('./${camelName}.schema');
const asyncHandler = require('../../../utils/asyncHandler');

router.get('/', asyncHandler(controller.list));
router.get('/:uuid', asyncHandler(controller.getByUuid));

router.post('/', validateRequest(schema.createSchema), asyncHandler(controller.create));
router.patch('/:uuid', validateRequest(schema.updateSchema), asyncHandler(controller.update));

router.delete('/:uuid', asyncHandler(controller.remove));
router.patch('/:uuid/restore', asyncHandler(controller.restore));

module.exports = router;
`);
});

console.log('Catálogos satélite generados exitosamente.');
