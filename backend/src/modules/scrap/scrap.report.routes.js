const express = require('express');
const scrapReportController = require('./scrap.report.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(permissionMiddleware('scrap.view', 'scrap.manage'));

router.get('/', scrapReportController.getReport);
router.get('/export', scrapReportController.exportReport);

module.exports = router;
