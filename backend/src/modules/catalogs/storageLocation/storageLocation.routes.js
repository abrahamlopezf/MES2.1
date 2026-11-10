const express = require('express');
const router = express.Router();
const storageLocationController = require('./storageLocation.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocation.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationController.list);
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(createSchema, 'body'), storageLocationController.create);
router.get('/:uuid', storageLocationController.getOne);
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), validateRequest(updateSchema, 'body'), storageLocationController.update);
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), storageLocationController.delete);
router.post('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), storageLocationController.restore);

module.exports = router;
