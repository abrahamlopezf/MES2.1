const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const scrapReportService = require('./scrap.report.service');

const getReport = async (req, res) => {
    try {
        const data = await scrapReportService.getReportData(req.query);
        return successResponse(res, 'Reporte de Scrap obtenido correctamente', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al generar el reporte', [], 500);
    }
};

const exportReport = async (req, res) => {
    try {
        const data = await scrapReportService.getReportData(req.query);
        // Aquí en el futuro se generará el archivo físico (Excel/PDF)
        // Por ahora se devuelve el dataset estructurado.
        return successResponse(res, 'Estructura del reporte para exportar', data, 200);
    } catch (error) {
        return errorResponse(res, error.message || 'Error al exportar el reporte', [], 500);
    }
};

module.exports = {
    getReport,
    exportReport
};
