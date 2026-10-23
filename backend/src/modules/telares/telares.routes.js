const express = require('express');
const router = express.Router();
const telaresController = require('./telares.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Todas las rutas protegidas por autenticación
router.use(authMiddleware);

// Rutas de Telares y Racks
router.get('/looms', telaresController.getLooms);
router.post('/looms', telaresController.createLoom);
router.put('/looms/:id', telaresController.updateLoom);
router.delete('/looms/:id', telaresController.deleteLoom);
router.get('/boms', telaresController.getBoms);
router.post('/boms', telaresController.createBom);
router.put('/boms/:id', telaresController.updateBom);
router.delete('/boms/:id', telaresController.deleteBom);
router.post('/looms/:id/assign-rack', telaresController.assignRack);
router.post('/runs/start', telaresController.startRun);
router.post('/runs/finish-roll', telaresController.finishRoll);

// Rutas del QR Viajero (Enrutamiento Dinámico)
router.post('/viajero/validate-scan', telaresController.validateViajeroScan);
router.post('/viajero/process-stage', telaresController.processViajeroStage);
router.get('/viajero/:qr_code', telaresController.getViajeroDetails);

module.exports = router;
