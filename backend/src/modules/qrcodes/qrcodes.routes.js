const express = require('express');

const qrcodesController = require('./qrcodes.controller');
const {
  generateQrBatchSchema,
  assignQrCodesSchema,
  validateQrSchema,
  cancelQrSchema,
} = require('./qrcodes.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const router = express.Router();

router.use(authMiddleware);

// --- RUTAS ESTÁTICAS ---

router.get(
  '/codes',
  permissionMiddleware('dashboard.read'),
  qrcodesController.getQrCodes
);

router.post(
  '/batches',
  permissionMiddleware('qr.generate'),
  validate(generateQrBatchSchema),
  qrcodesController.generateQrBatch
);

router.get(
  '/batches',
  permissionMiddleware('dashboard.read'),
  qrcodesController.getQrBatches
);

router.post(
  '/assign',
  permissionMiddleware('qr.assign'),
  validate(assignQrCodesSchema),
  qrcodesController.assignQrCodes
);

router.post(
  '/validate',
  permissionMiddleware('qr.read'),
  validate(validateQrSchema),
  qrcodesController.validateQrForUse
);

// --- RUTAS DINÁMICAS (Lotes) ---

router.get(
  '/batches/:id',
  permissionMiddleware('dashboard.read'),
  qrcodesController.getQrBatchById
);

router.post(
  '/batches/:id/print',
  permissionMiddleware('dashboard.read'),
  qrcodesController.printQrBatch
);

// --- RUTAS DINÁMICAS (Códigos Individuales) ---

router.get(
  '/lookup/:qrCode',
  permissionMiddleware('qr.read'),
  qrcodesController.lookup
);

router.post(
  '/scan/:qrCode',
  permissionMiddleware('qr.read'),
  qrcodesController.getQrCodeByValue
);

router.post(
  '/codes/:id/cancel',
  permissionMiddleware('qr.cancel'),
  validate(cancelQrSchema),
  qrcodesController.cancelQrCode
);

router.post(
  '/:uuid/print',
  permissionMiddleware('dashboard.read'),
  qrcodesController.printQrCode
);

router.get(
  '/:id/events',
  permissionMiddleware('dashboard.read'),
  qrcodesController.getQrEvents
);

// ESTA RUTA DEBE IR AL FINAL PORQUE MATCHEA CON TODO
router.get(
  '/:qrCode',
  permissionMiddleware('dashboard.read'),
  qrcodesController.getQrCodeByValue
);

module.exports = router;