const express = require('express');
const extrusionController = require('./extrusion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;

router.use(authenticate);

// Formulas
router.get('/formulas', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulas);
router.get('/formulas/:id', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulaDetails);

// Mixing
router.post('/mix', authorizePermission('extrusion.mix.create'), extrusionController.mixFormula);

module.exports = router;
