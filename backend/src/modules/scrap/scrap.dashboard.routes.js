const express = require('express');
const scrapDashboardController = require('./scrap.dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

// Middleware de autenticación global para estas rutas
router.use(authMiddleware);

// Middleware de permisos (solo los que tienen scrap.view pueden ver dashboard)
router.use(permissionMiddleware('scrap.view', 'scrap.manage'));

router.get(
    '/',
    scrapDashboardController.getDashboardSummary
);

router.get(
    '/types',
    scrapDashboardController.getScrapByType
);

router.get(
    '/racks',
    scrapDashboardController.getScrapByRack
);

router.get(
    '/monthly',
    scrapDashboardController.getMonthlyTrend
);

router.get(
    '/daily',
    scrapDashboardController.getDailyTrend
);

router.get(
    '/top-generators',
    scrapDashboardController.getTopGenerators
);

router.get(
    '/statistics',
    scrapDashboardController.getMovementStatistics
);

module.exports = router;
