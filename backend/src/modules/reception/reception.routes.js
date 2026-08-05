const express = require('express');
const router = express.Router();
const receptionController = require('./reception.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// RUTAS DE RECEPCIÓN (MES)
router.post('/', authMiddleware, receptionController.receiveMaterial.bind(receptionController));

module.exports = router;
