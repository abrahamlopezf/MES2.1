'use strict';
const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const controller = require('./corte.controller');
const router = express.Router();
router.use(authMiddleware, (req, res, next) => {
  const code = String(req.user?.role?.code || req.user?.role || '').toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE'].includes(code)) return next();
  return res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado de Corte.' });
});
router.get('/laminado-eligible-rolls', controller.eligible);
router.get('/laminado-orders', controller.list);
router.post('/laminado-orders', controller.create);
router.post('/laminado-orders/:id/cancel', controller.cancel);
module.exports = router;
