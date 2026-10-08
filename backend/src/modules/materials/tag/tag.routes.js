const express = require('express');
const router = express.Router();

const tagController = require('./tag.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', tagController.getAllTags);
router.get('/active', tagController.getActiveTags);
router.get('/:id', tagController.getTagById);

router.post('/', permissionMiddleware('masterdata.create'), tagController.createTag);
router.put('/:id', permissionMiddleware('masterdata.update'), tagController.updateTag);
router.delete('/:id', permissionMiddleware('masterdata.delete'), tagController.deleteTag);

module.exports = router;
