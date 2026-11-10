const express = require('express');
const router = express.Router();
const warehouseController = require('./warehouse.controller');
const { createSchema, updateSchema, searchSchema } = require('./warehouse.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

// Apply authentication middleware to all routes
router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), warehouseController.list);
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(createSchema, 'body'), warehouseController.create);
router.get('/:uuid', warehouseController.getOne);
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), validateRequest(updateSchema, 'body'), warehouseController.update);
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), warehouseController.delete);
router.post('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), warehouseController.restore);

module.exports = router;
