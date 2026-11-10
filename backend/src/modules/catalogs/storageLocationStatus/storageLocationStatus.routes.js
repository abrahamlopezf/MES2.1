const express = require('express');
const router = express.Router();
const storageLocationStatusController = require('./storageLocationStatus.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocationStatus.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationStatusController.list);
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(createSchema, 'body'), storageLocationStatusController.create);
router.get('/:uuid', storageLocationStatusController.getOne);
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), validateRequest(updateSchema, 'body'), storageLocationStatusController.update);
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), storageLocationStatusController.delete);
router.post('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), storageLocationStatusController.restore);

module.exports = router;
