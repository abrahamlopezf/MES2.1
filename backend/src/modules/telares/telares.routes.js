const express = require('express');
const router = express.Router();
const telaresController = require('./telares.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Todas las rutas protegidas por autenticación
router.use(authMiddleware);

// Rutas de Telares y Racks
router.get('/subareas', telaresController.getSubareas);
router.get('/looms', telaresController.getLooms);
router.post('/looms', telaresController.createLoom);
router.put('/looms/:id', telaresController.updateLoom);
router.delete('/looms/:id', telaresController.deleteLoom);
router.get('/boms', telaresController.getBoms);
router.post('/boms', telaresController.createBom);
router.put('/boms/:id', telaresController.updateBom);
router.delete('/boms/:id', telaresController.deleteBom);
router.get('/operators', telaresController.getOperators);
router.post('/operators', telaresController.createOperator);
router.put('/operators/:id', telaresController.updateOperator);
router.delete('/operators/:id', telaresController.deleteOperator);
router.post('/looms/:id/assign-rack', telaresController.assignRack);
router.post('/looms/:id/load-creel', telaresController.loadCreel);
router.post('/transfer-cart', telaresController.transferCart);
router.get('/pti-racks', telaresController.getAvailablePtiRacks);
router.get('/pti-racks/lookup/:code', telaresController.lookupPtiRack);
router.get('/wip-summary', telaresController.getWipSummary);
router.get('/pti-transfer-mode', telaresController.getPtiTransferMode);
router.put('/pti-transfer-mode', telaresController.updatePtiTransferMode);
router.post('/runs/start', telaresController.startRun);
router.post('/runs/finish-roll', telaresController.finishRoll);

// Rutas del QR Viajero (Enrutamiento Dinámico)
router.post('/viajero/validate-scan', telaresController.validateViajeroScan);
router.post('/viajero/process-stage', telaresController.processViajeroStage);
router.get('/viajero/:qr_code', telaresController.getViajeroDetails);

module.exports = router;
