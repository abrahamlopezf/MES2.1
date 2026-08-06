const express = require('express');
const router = express.Router();
const storageLocationTypeController = require('./storageLocationType.controller');
const { createSchema, updateSchema, searchSchema } = require('./storageLocationType.schema');
const { validateRequest } = require('../../../middlewares/validateRequest');
const { requireAuth } = require('../../../middlewares/auth');

router.use(requireAuth);

router.get('/', validateRequest(searchSchema, 'query'), storageLocationTypeController.list);
router.post('/', validateRequest(createSchema, 'body'), storageLocationTypeController.create);
router.get('/:uuid', storageLocationTypeController.getOne);
router.patch('/:uuid', validateRequest(updateSchema, 'body'), storageLocationTypeController.update);
router.delete('/:uuid', storageLocationTypeController.delete);
router.post('/:uuid/restore', storageLocationTypeController.restore);

module.exports = router;
