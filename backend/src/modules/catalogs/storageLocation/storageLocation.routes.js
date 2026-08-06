const express = require('express');
const router = express.Router();
const storageLocationController = require('./storageLocation.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocation.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationController.list);
router.post('/', validateRequest(createSchema, 'body'), storageLocationController.create);
router.get('/:uuid', storageLocationController.getOne);
router.patch('/:uuid', validateRequest(updateSchema, 'body'), storageLocationController.update);
router.delete('/:uuid', storageLocationController.delete);
router.post('/:uuid/restore', storageLocationController.restore);

module.exports = router;
