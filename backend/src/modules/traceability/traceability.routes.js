const express = require('express');

const traceabilityController = require('./traceability.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

const authenticate =
  authMiddleware.authenticate ||
  authMiddleware.authMiddleware ||
  authMiddleware;

const authorizePermission =
  permissionMiddleware.authorizePermission ||
  permissionMiddleware.requirePermission ||
  permissionMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error(
    'Traceability routes: authenticate middleware no es una función válida.'
  );
}

if (typeof authorizePermission !== 'function') {
  throw new Error(
    'Traceability routes: permission middleware no es una función válida.'
  );
}

router.get(
  '/scan/:qrCode',
  authenticate,
  authorizePermission('qr.read'),
  traceabilityController.scanQrCode
);

router.post(
  '/qr-area-assignments',
  authenticate,
  authorizePermission('qr.assign'),
  traceabilityController.assignQrCodesToArea
);

router.post(
  '/raw-material-entry',
  authenticate,
  traceabilityController.registerRawMaterialEntry
);

router.post(
  '/warehouse-transfer',
  authenticate,
  traceabilityController.warehouseTransfer
);

router.post(
  '/process-preparations',
  authenticate,
  authorizePermission('operations.area.write'),
  traceabilityController.prepareProcessFormula
);

router.post(
  '/receive-in-area',
  authenticate,
  authorizePermission('operations.area.write'),
  traceabilityController.receiveInArea
);

router.post(
  '/process-runs/start',
  authenticate,
  authorizePermission('operations.area.write'),
  traceabilityController.startProcessRun
);

router.post(
  '/process-runs/outputs',
  authenticate,
  authorizePermission('operations.area.write'),
  traceabilityController.registerProcessOutputToRack
);

module.exports = router;