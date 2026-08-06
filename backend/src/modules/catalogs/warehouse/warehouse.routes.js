const express = require('express');
const router = express.Router();
const warehouseController = require('./warehouse.controller');
const { createSchema, updateSchema, searchSchema } = require('./warehouse.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');

// Apply authentication middleware to all routes
router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), warehouseController.list);
router.post('/', validateRequest(createSchema, 'body'), warehouseController.create);
router.get('/:uuid', warehouseController.getOne);
router.patch('/:uuid', validateRequest(updateSchema, 'body'), warehouseController.update);
router.delete('/:uuid', warehouseController.delete);
router.post('/:uuid/restore', warehouseController.restore);

module.exports = router;
