const express = require('express');
const router = express.Router();
const storageLocationTypeController = require('./storageLocationType.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocationType.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationTypeController.list);
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(createSchema, 'body'), storageLocationTypeController.create);
router.get('/:uuid', storageLocationTypeController.getOne);
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), validateRequest(updateSchema, 'body'), storageLocationTypeController.update);
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), storageLocationTypeController.delete);
router.post('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), storageLocationTypeController.restore);

module.exports = router;
