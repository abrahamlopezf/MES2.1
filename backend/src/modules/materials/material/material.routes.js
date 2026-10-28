const express = require('express');
const router = express.Router();
const controller = require('./material.controller');
const validateRequest = require('../../../middlewares/validateRequest');
const schema = require('./material.schema');
const asyncHandler = require('../../../utils/asyncHandler');
const authMiddleware = require('../../../middlewares/auth.middleware');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(authMiddleware);

const requireWarehouseAdministrator = (req, res, next) => {
  const role = req.user?.role;
  const roleCode = String(typeof role === 'string' ? role : role?.code || '').trim().toUpperCase();
  const roleName = String(typeof role === 'object' ? role?.name || '' : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  if (['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode) || roleName === 'ADMINISTRADOR DE ALMACEN') return next();
  return res.status(403).json({ success: false, message: 'Solo el Administrador de Almacén puede editar materiales.' });
};

// Endpoints de Búsqueda y Lectura
router.get('/', validateRequest(schema.searchSchema, 'query'), asyncHandler(controller.search));
router.get('/rankings', asyncHandler(async (req, res) => {
  const { Ranking } = require('../../../database/models');
  const rankings = await Ranking.findAll({ where: { is_active: true } });
  res.status(200).json({ success: true, data: rankings });
}));
router.get('/:uuid', asyncHandler(controller.getByUuid));

// Endpoints de Mutación (CRUD)
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(schema.createSchema), asyncHandler(controller.create));
// La edición de materiales cambia el catálogo operativo de Almacén y queda reservada
// al administrador de Almacén. La validación de permisos frontend no es suficiente.
router.patch(
  '/:uuid',
  requireWarehouseAdministrator,
  validateRequest(schema.updateSchema),
  asyncHandler(controller.update)
);

// Soft Delete y Restore
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), asyncHandler(controller.remove));
router.patch('/:uuid/restore', requireWarehouseAdministrator, asyncHandler(controller.restore));

module.exports = router;
