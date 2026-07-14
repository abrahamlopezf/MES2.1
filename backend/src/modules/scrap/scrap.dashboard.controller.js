const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const scrapDashboardService = require('./scrap.dashboard.service');

const getDashboardSummary = async (req, res) => {
    try {
        const data = await scrapDashboardService.getDashboardSummary();
        return successResponse(res, 'Resumen del dashboard obtenido', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener resumen', [], 500);
    }
};

const getScrapByType = async (req, res) => {
    try {
        const data = await scrapDashboardService.getScrapByType();
        return successResponse(res, 'Scrap por tipo obtenido', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener scrap por tipo', [], 500);
    }
};

const getScrapByRack = async (req, res) => {
    try {
        const data = await scrapDashboardService.getScrapByRack();
        return successResponse(res, 'Scrap por rack obtenido', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener scrap por rack', [], 500);
    }
};

const getMonthlyTrend = async (req, res) => {
    try {
        const data = await scrapDashboardService.getMonthlyTrend();
        return successResponse(res, 'Tendencia mensual obtenida', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener tendencia mensual', [], 500);
    }
};

const getDailyTrend = async (req, res) => {
    try {
        const data = await scrapDashboardService.getDailyTrend();
        return successResponse(res, 'Tendencia diaria obtenida', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener tendencia diaria', [], 500);
    }
};

const getTopGenerators = async (req, res) => {
    try {
        const data = await scrapDashboardService.getTopGenerators();
        return successResponse(res, 'Top generadores obtenido', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener top generadores', [], 500);
    }
};

const getMovementStatistics = async (req, res) => {
    try {
        const data = await scrapDashboardService.getMovementStatistics();
        return successResponse(res, 'Estadísticas de movimientos obtenidas', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al obtener estadísticas', [], 500);
    }
};

module.exports = {
    getDashboardSummary,
    getScrapByType,
    getScrapByRack,
    getMonthlyTrend,
    getDailyTrend,
    getTopGenerators,
    getMovementStatistics
};
