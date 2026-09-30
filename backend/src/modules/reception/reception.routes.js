const express = require('express');
const router = express.Router();
const receptionController = require('./reception.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// RUTAS DE RECEPCIÓN (MES)
router.post('/', authMiddleware, roleMiddleware('ADMIN_ALM'), receptionController.receiveMaterial.bind(receptionController));

module.exports = router;
