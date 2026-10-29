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

const qrPermission = (...permissions) => (req, res, next) => {
  const roleCode = String(req.user?.role?.code || '').toUpperCase();
  if (roleCode === 'SUPERVISOR_EXTRUSION' && permissions.every((permission) =>
    ['dashboard.read', 'qr.read', 'qr.create', 'qr.generate', 'qr.history.read', 'qr.events.read'].includes(permission)
  )) return next();
  return permissionMiddleware(...permissions)(req, res, next);
};

// --- RUTAS ESTÁTICAS ---

router.get(
  '/codes',
  qrPermission('dashboard.read', 'qr.read'),
  qrcodesController.getQrCodes
);

router.post(
  '/batches',
  qrPermission('qr.generate', 'qr.create'),
  validate(generateQrBatchSchema),
  qrcodesController.generateQrBatch
);

router.get(
  '/batches',
  qrPermission('dashboard.read', 'qr.read'),
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
  qrPermission('qr.read'),
  validate(validateQrSchema),
  qrcodesController.validateQrForUse
);

// --- RUTAS DINÁMICAS (Lotes) ---

router.get(
  '/batches/:id',
  qrPermission('dashboard.read', 'qr.read'),
  qrcodesController.getQrBatchById
);

router.post(
  '/batches/:id/print',
  qrPermission('dashboard.read', 'qr.read', 'qr.generate', 'qr.create'),
  qrcodesController.printQrBatch
);

router.post(
  '/print-multiple',
  qrPermission('dashboard.read', 'qr.read', 'qr.generate', 'qr.create'),
  qrcodesController.printMultipleQrs
);

// --- RUTAS DINÁMICAS (Códigos Individuales) ---

router.get(
  '/lookup/:qrCode',
  qrPermission('qr.read'),
  qrcodesController.lookup
);

router.post(
  '/scan/:qrCode',
  qrPermission('qr.read'),
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
  qrPermission('dashboard.read'),
  qrcodesController.printQrCode
);

router.get(
  '/:id/events',
  qrPermission('dashboard.read'),
  qrcodesController.getQrEvents
);

// ESTA RUTA DEBE IR AL FINAL PORQUE MATCHEA CON TODO
router.get(
  '/:qrCode',
  qrPermission('dashboard.read'),
  qrcodesController.getQrCodeByValue
);

module.exports = router;
