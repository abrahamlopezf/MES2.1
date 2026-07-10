const express = require('express');

const materialsController = require('./materials.controller');

const {
  createCategorySchema,
  updateCategorySchema,
  createMaterialSchema,
  updateMaterialSchema,
} = require('./materials.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validationMiddleware = require('../../middlewares/validation.middleware');

const router = express.Router();

const authenticate =
  authMiddleware.authenticate ||
  authMiddleware.authMiddleware ||
  authMiddleware;

const authorizePermission =
  permissionMiddleware.authorizePermission ||
  permissionMiddleware.requirePermission ||
  permissionMiddleware;

const validateRequest =
  validationMiddleware.validateRequest ||
  validationMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error(
    'El middleware de autenticación no es una función. Revisa src/middlewares/auth.middleware.js'
  );
}

if (typeof authorizePermission !== 'function') {
  throw new Error(
    'El middleware de permisos no es una función. Revisa src/middlewares/permission.middleware.js'
  );
}

if (typeof validateRequest !== 'function') {
  throw new Error(
    'El middleware de validación no es una función. Revisa src/middlewares/validation.middleware.js'
  );
}

router.use(authenticate);

router.get(
  '/categories',
  authorizePermission('materials.read'),
  materialsController.getCategories
);

router.get(
  '/categories/:id',
  authorizePermission('materials.read'),
  materialsController.getCategoryById
);

router.post(
  '/categories',
  authorizePermission('materials.create'),
  validateRequest(createCategorySchema),
  materialsController.createCategory
);

router.put(
  '/categories/:id',
  authorizePermission('materials.update'),
  validateRequest(updateCategorySchema),
  materialsController.updateCategory
);

router.delete(
  '/categories/:id',
  authorizePermission('materials.delete'),
  materialsController.deactivateCategory
);

router.get(
  '/',
  authorizePermission('materials.read'),
  materialsController.getMaterials
);

router.get(
  '/:id',
  authorizePermission('materials.read'),
  materialsController.getMaterialById
);

router.post(
  '/',
  authorizePermission('materials.create'),
  validateRequest(createMaterialSchema),
  materialsController.createMaterial
);

router.put(
  '/:id',
  authorizePermission('materials.update'),
  validateRequest(updateMaterialSchema),
  materialsController.updateMaterial
);

router.delete(
  '/:id',
  authorizePermission('materials.delete'),
  materialsController.deactivateMaterial
);

module.exports = router;