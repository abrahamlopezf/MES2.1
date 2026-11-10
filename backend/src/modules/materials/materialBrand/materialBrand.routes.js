const express = require('express');
const router = express.Router();
const controller = require('./materialBrand.controller');
const validateRequest = require('../../../middlewares/validateRequest');
const schema = require('./materialBrand.schema');
const asyncHandler = require('../../../utils/asyncHandler');
const authMiddleware = require('../../../middlewares/auth.middleware');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', asyncHandler(controller.list));
router.get('/:uuid', asyncHandler(controller.getByUuid));

router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), validateRequest(schema.createSchema), asyncHandler(controller.create));
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), validateRequest(schema.updateSchema), asyncHandler(controller.update));

router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), asyncHandler(controller.remove));
router.patch('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), asyncHandler(controller.restore));

module.exports = router;
