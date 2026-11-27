const express = require('express');
const router = express.Router();
const telaresController = require('./telares.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');
const { requireTelaresAreaAccess, requireTelaresAdministrator, requireTelaresCatalogAdministrator } = require('./telares.access');

// Todas las rutas protegidas por autenticación
router.use(authMiddleware);

// Area-only authorization: executive roles use the consolidated dashboard, not Telares endpoints.
router.use(requireTelaresAreaAccess);

// Rutas de Telares y Racks
router.get('/subareas', telaresController.getSubareas);
router.get('/looms', telaresController.getLooms);
router.post('/looms', requireTelaresAdministrator, telaresController.createLoom);
router.put('/looms/:id', requireTelaresAdministrator, telaresController.updateLoom);
router.delete('/looms/:id', requireTelaresAdministrator, telaresController.deleteLoom);
router.get('/boms', telaresController.getBoms);
router.post('/boms', requireTelaresCatalogAdministrator, telaresController.createBom);
router.put('/boms/:id', requireTelaresCatalogAdministrator, telaresController.updateBom);
router.delete('/boms/:id', requireTelaresCatalogAdministrator, telaresController.deleteBom);
router.get('/operators', requireTelaresAdministrator, telaresController.getOperators);
router.post('/operators', requireTelaresAdministrator, telaresController.createOperator);
router.put('/operators/:id', requireTelaresAdministrator, telaresController.updateOperator);
router.delete('/operators/:id', requireTelaresAdministrator, telaresController.deleteOperator);
router.post('/looms/:id/assign-rack', telaresController.assignRack);
router.post('/looms/:id/load-creel', telaresController.loadCreel);
router.post('/transfer-cart', telaresController.transferCart);
router.get('/pti-racks', telaresController.getAvailablePtiRacks);
router.get('/pti-racks/lookup/:code', telaresController.lookupPtiRack);
router.get('/wip-summary', telaresController.getWipSummary);
router.get('/performance-summary', telaresController.getPerformanceSummary);
router.get('/pti-transfer-mode', telaresController.getPtiTransferMode);
router.put('/pti-transfer-mode', requireTelaresAdministrator, telaresController.updatePtiTransferMode);
router.post('/runs/start', telaresController.startRun);
router.post('/runs/finish-roll', telaresController.finishRoll);
router.post('/runs/:id/finish', telaresController.finishRun);
router.get('/rolls', telaresController.getRecentRolls);
router.get('/scrap-logs', roleMiddleware('ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES'), telaresController.getScrapLogs);
router.post('/scrap-logs', roleMiddleware('ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES'), telaresController.createScrapLog);
router.put('/scrap-logs/:id', roleMiddleware('ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES'), telaresController.updateScrapLog);

// Rutas del QR Viajero (Enrutamiento Dinámico)
router.post('/viajero/validate-scan', telaresController.validateViajeroScan);
router.post('/viajero/process-stage', telaresController.processViajeroStage);
router.get('/viajero/:qr_code', telaresController.getViajeroDetails);

module.exports = router;
