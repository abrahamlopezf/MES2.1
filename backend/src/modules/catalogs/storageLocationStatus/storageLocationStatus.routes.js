const express = require('express');
const router = express.Router();
const storageLocationStatusController = require('./storageLocationStatus.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocationStatus.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationStatusController.list);
router.post('/', validateRequest(createSchema, 'body'), storageLocationStatusController.create);
router.get('/:uuid', storageLocationStatusController.getOne);
router.patch('/:uuid', validateRequest(updateSchema, 'body'), storageLocationStatusController.update);
router.delete('/:uuid', storageLocationStatusController.delete);
router.post('/:uuid/restore', storageLocationStatusController.restore);

module.exports = router;
