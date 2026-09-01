const express = require('express');
const router = express.Router();
const controller = require('./supplier.controller');
// const { validateRequest } = require('../../../middleware/validateRequest');
// validation schemas can be added later

router.get('/', controller.list);
router.get('/:uuid', controller.getByUuid);
router.post('/', controller.create);
router.patch('/:uuid', controller.update);
router.delete('/:uuid', controller.remove);
router.post('/:uuid/restore', controller.restore);

module.exports = router;
