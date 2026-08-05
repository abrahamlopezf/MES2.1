const express = require('express');
const router = express.Router();
const controller = require('./materialCode.controller');
const validateRequest = require('../../../middlewares/validateRequest');
const schema = require('./materialCode.schema');
const asyncHandler = require('../../../utils/asyncHandler');

router.get('/', asyncHandler(controller.list));
router.get('/:uuid', asyncHandler(controller.getByUuid));

router.post('/', validateRequest(schema.createSchema), asyncHandler(controller.create));
router.patch('/:uuid', validateRequest(schema.updateSchema), asyncHandler(controller.update));

router.delete('/:uuid', asyncHandler(controller.remove));
router.patch('/:uuid/restore', asyncHandler(controller.restore));

module.exports = router;
