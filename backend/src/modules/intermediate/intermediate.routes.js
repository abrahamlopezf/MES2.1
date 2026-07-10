const express = require('express');

const intermediateController = require('./intermediate.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const authenticate =
    authMiddleware.authenticate ||
    authMiddleware.protect ||
    authMiddleware.verifyToken ||
    authMiddleware;

const authorizePermission =
    permissionMiddleware.authorizePermission ||
    permissionMiddleware.requirePermission ||
    permissionMiddleware;

if (typeof authenticate !== 'function') {
    throw new Error(
        'No se pudo resolver el middleware de autenticación en intermediate.routes.js'
    );
}

if (typeof authorizePermission !== 'function') {
    throw new Error(
        'No se pudo resolver el middleware de permisos en intermediate.routes.js'
    );
}

const router = express.Router();

router.get(
    '/materials',
    authenticate,
    authorizePermission('operations.area.read'),
    intermediateController.listIntermediateMaterials
);

router.post(
    '/materials',
    authenticate,
    authorizePermission('operations.area.write'),
    intermediateController.createIntermediateMaterial
);

router.get(
    '/racks',
    authenticate,
    authorizePermission('operations.area.read'),
    intermediateController.listRacks
);

router.post(
    '/racks',
    authenticate,
    authorizePermission('operations.area.write'),
    intermediateController.createRack
);

router.get(
    '/stocks',
    authenticate,
    authorizePermission('operations.area.read'),
    intermediateController.listStocks
);

router.post(
    '/stocks/ensure',
    authenticate,
    authorizePermission('operations.area.write'),
    intermediateController.ensureStock
);

module.exports = router;