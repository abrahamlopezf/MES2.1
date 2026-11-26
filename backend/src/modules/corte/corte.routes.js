'use strict';
const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const controller = require('./corte.controller');
const router = express.Router();
router.use(authMiddleware);
const roleCode = (req) => String(req.user?.role?.code || req.user?.role || '').toUpperCase();
const requireCorte = (req, res, next) => ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE'].includes(roleCode(req))
  ? next() : res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado de Corte.' });
const requireProcess = (req, res, next) => ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO', 'ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO'].includes(roleCode(req))
  ? next() : res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado del proceso.' });
const requireLaminado = (req, res, next) => ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO'].includes(roleCode(req))
  ? next() : res.status(403).json({ success: false, message: 'Solo Laminado puede confirmar la salida hacia Corte.' });
const requireCorteOrLaminado = (req, res, next) => [...['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE'], ...['ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO']].includes(roleCode(req))
  ? next() : res.status(403).json({ success: false, message: 'Acceso restringido al seguimiento de transferencias Laminado → Corte.' });
router.get('/process-orders', requireCorteOrLaminado, controller.processOrders);
router.post('/process-pickup-scan', requireProcess, controller.processPickupScan);
router.get('/laminado-output-transfers', requireCorteOrLaminado, controller.laminatedOutputTransfers);
router.post('/laminado-output-dispatch-scan', requireLaminado, controller.dispatchLaminatedOutput);
router.post('/laminado-output-receive-scan', requireCorte, controller.receiveLaminatedOutput);
router.get('/process-demand-options', requireCorte, controller.processOptions);
router.post('/process-orders', requireCorte, controller.createProcessOrder);
router.get('/laminado-eligible-rolls', requireCorte, controller.eligible);
router.get('/laminado-wip', requireCorte, controller.laminatedWip);
router.get('/laminado-demand-options', requireCorte, controller.demandOptions);
router.get('/laminado-orders', requireCorte, controller.list);
router.post('/laminado-orders', requireCorte, controller.create);
router.post('/laminado-orders/:id/cancel', requireCorte, controller.cancel);
module.exports = router;
