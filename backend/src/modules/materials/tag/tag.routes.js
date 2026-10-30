const express = require('express');
const router = express.Router();

const tagController = require('./tag.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const permissionMiddleware = require('../../../middlewares/permission.middleware');

const authorizeTagCreation = (req, res, next) => {
  const role = req.user?.role;
  const roleCode = String(typeof role === 'string' ? role : role?.code || '').trim().toUpperCase();
  if (['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode)) return next();
  return permissionMiddleware('materials.create', 'masterdata.create')(req, res, next);
};

router.use(authMiddleware);

router.get('/', tagController.getAllTags);
router.get('/active', tagController.getActiveTags);
router.get('/:id', tagController.getTagById);

// ADMIN_ALM ya puede crear materiales y debe poder crear sus etiquetas de
// clasificación sin recibir permisos generales para administrar todo Master Data.
router.post('/', authorizeTagCreation, tagController.createTag);
router.put('/:id', permissionMiddleware('masterdata.update'), tagController.updateTag);
router.delete('/:id', permissionMiddleware('masterdata.delete'), tagController.deleteTag);

module.exports = router;
