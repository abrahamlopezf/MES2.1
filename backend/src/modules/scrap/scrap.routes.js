const express = require('express');
const scrapController = require('./scrap.controller');
const validate = require('../../middlewares/validation.middleware');
const {
  listContainersSchema,
  getContainerSchema,
  createMovementSchema,
  transferSchema,
  recyclingSchema
} = require('./scrap.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const scrapAuditService = require('./scrap.audit.service');
const registerScrapListeners = require('./scrap.listeners');

const router = express.Router();

// Inicializar listeners de eventos (ej: PRODUCTION_FINISHED)
registerScrapListeners();

// Habilitar captura de IP y User-Agent para la auditoría de movimientos
router.use(scrapAuditService.middleware());

router.use(authMiddleware);

router.get(
  '/containers',
  permissionMiddleware('scrap.view', 'scrap.manage'),
  scrapController.listContainers
);

router.post(
  '/containers',
  permissionMiddleware('scrap.create', 'scrap.manage'),
  scrapController.createContainer
);

router.get(
  '/containers/:id',
  permissionMiddleware('scrap.view', 'scrap.manage'),
  validate(getContainerSchema, 'params'),
  scrapController.getContainer
);

router.post(
  '/movements',
  permissionMiddleware('scrap.create', 'scrap.manage'),
  validate(createMovementSchema, 'body'),
  scrapController.createMovement
);

router.post(
  '/transfers',
  permissionMiddleware('scrap.transfer', 'scrap.manage'),
  validate(transferSchema, 'body'),
  scrapController.transfer
);

router.post(
  '/recycling',
  permissionMiddleware('scrap.recycle', 'scrap.manage'),
  validate(recyclingSchema, 'body'),
  scrapController.recycle
);

module.exports = router;
