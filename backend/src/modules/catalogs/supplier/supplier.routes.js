const express = require('express');
const router = express.Router();
const controller = require('./supplier.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const permissionMiddleware = require('../../../middlewares/permission.middleware');
// const { validateRequest } = require('../../../middleware/validateRequest');
// All supplier operations require an authenticated user. Mutations require
// explicit Master Data permissions; the browser UI is not an authorization boundary.
router.use(authMiddleware);

router.get('/', controller.list);
router.get('/:uuid', controller.getByUuid);
router.post('/', permissionMiddleware('materials.create', 'masterdata.create'), controller.create);
router.patch('/:uuid', permissionMiddleware('materials.update', 'masterdata.update'), controller.update);
router.delete('/:uuid', permissionMiddleware('materials.delete', 'masterdata.delete'), controller.remove);
router.post('/:uuid/restore', permissionMiddleware('materials.update', 'masterdata.update'), controller.restore);

module.exports = router;
