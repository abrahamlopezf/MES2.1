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

router.get(
  '/codes',
  permissionMiddleware('qr.read'),
  qrcodesController.getQrCodes
);

router.get(
  '/codes/:id/events',
  permissionMiddleware('qr.events.read'),
  qrcodesController.getQrEvents
);

router.get(
  '/scan/:qrCode',
  permissionMiddleware('qr.read'),
  qrcodesController.getQrCodeByValue
);

router.post(
  '/batches',
  permissionMiddleware('qr.generate'),
  validate(generateQrBatchSchema),
  qrcodesController.generateQrBatch
);

router.get(
  '/batches',
  permissionMiddleware('qr.read'),
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

router.post(
  '/codes/:id/cancel',
  permissionMiddleware('qr.cancel'),
  validate(cancelQrSchema),
  qrcodesController.cancelQrCode
);

module.exports = router;