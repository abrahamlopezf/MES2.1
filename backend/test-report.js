require('dotenv').config();
const { sequelize } = require('./src/database/models');
const scrapReportService = require('./src/modules/scrap/scrap.report.service');

async function runReportTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Reporte Sin Filtros");
        console.log("=====================================");
        const allData = await scrapReportService.getReportData({});
        console.log("Resumen:", allData.resumen);
        console.log("Totales:", allData.totales);
        console.log("Cantidad de movimientos detalle:", allData.detalle.length);

        console.log("\n=====================================");
        console.log("TEST: Reporte Con Filtro de Fecha y Tipo Movimiento");
        console.log("=====================================");
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30); // Últimos 30 días
        const filteredData = await scrapReportService.getReportData({
            fecha_inicio: fechaInicio,
            estado: 'AVAILABLE'
        });
        
        console.log("Resumen (Solo contenedores AVAILABLE):", filteredData.resumen);
        console.log("Totales filtrados:", filteredData.totales);

        if (filteredData.resumen.total_scrap_actual >= 0) {
            console.log("\n✅ Reporte filtrado generado correctamente sin fallos.");
        } else {
            console.error("❌ Inconsistencia en la data del reporte.");
        }

    } catch (error) {
        console.error("❌ Error en tests de Reportes:", error);
    } finally {
        await sequelize.close();
    }
}

runReportTests();
