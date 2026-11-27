const express = require('express');

const qrcodesController = require('./qrcodes.controller');
const {
  generateQrBatchSchema,
  assignQrCodesSchema,
  validateQrSchema,
  cancelQrSchema,
  createQrIdentityRequestSchema,
  fulfillQrIdentityRequestSchema,
} = require('./qrcodes.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireQrBatchManager } = require('./qrBatchAccess');

const router = express.Router();

router.use(authMiddleware);

router.post('/identity-requests', validate(createQrIdentityRequestSchema), qrcodesController.createQrIdentityRequest);
router.get('/identity-requests', qrcodesController.listQrIdentityRequests);
router.get('/identity-requests/available-codes', qrcodesController.listAvailableQrCodesForWarehouse);
router.post('/identity-requests/:id/fulfill', validate(fulfillQrIdentityRequestSchema), qrcodesController.fulfillQrIdentityRequest);

const qrPermission = (...permissions) => (req, res, next) => {
  if (req.user && permissions.length === 1 && permissions[0] === 'qr.read') return next();
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
  requireQrBatchManager,
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
  requireQrBatchManager,
  qrPermission('dashboard.read', 'qr.read', 'qr.generate', 'qr.create'),
  qrcodesController.printQrBatch
);

router.post(
  '/batches/:id/print-preview',
  requireQrBatchManager,
  qrPermission('dashboard.read', 'qr.read', 'qr.generate', 'qr.create'),
  qrcodesController.previewQrBatchPrint
);

router.post(
  '/print-preview',
  requireQrBatchManager,
  qrPermission('dashboard.read', 'qr.read', 'qr.generate', 'qr.create'),
  qrcodesController.previewMultipleQrPrint
);

router.post(
  '/print-multiple',
  requireQrBatchManager,
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
  requireQrBatchManager,
  qrPermission('qr.create', 'qr.generate'),
  qrcodesController.printQrCode
);

router.post(
  '/:uuid/print-preview',
  requireQrBatchManager,
  qrPermission('qr.create', 'qr.generate'),
  qrcodesController.previewQrCodePrint
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
