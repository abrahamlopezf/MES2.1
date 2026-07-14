require('dotenv').config();
const { sequelize, ScrapContainer, ScrapMovement } = require('./src/database/models');
const scrapDashboardService = require('./src/modules/scrap/scrap.dashboard.service');

async function runDashboardTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Dashboard Summary");
        console.log("=====================================");
        const summary = await scrapDashboardService.getDashboardSummary();
        console.log("Total Containers:", summary.total_containers);
        console.log("Empty:", summary.containers_empty, "Available:", summary.containers_available, "Full:", summary.containers_full);
        console.log("Total Scrap:", summary.total_scrap);
        console.log("Total Generado:", summary.total_generated, "Total Reciclado:", summary.total_recycled);

        console.log("\n=====================================");
        console.log("TEST: Scrap By Type");
        console.log("=====================================");
        const byType = await scrapDashboardService.getScrapByType();
        console.table(byType.map(r => r.get({ plain: true })));

        console.log("\n=====================================");
        console.log("TEST: Scrap By Rack");
        console.log("=====================================");
        const byRack = await scrapDashboardService.getScrapByRack();
        console.table(byRack.map(r => r.get({ plain: true })));

        console.log("\n=====================================");
        console.log("TEST: Movement Statistics");
        console.log("=====================================");
        const stats = await scrapDashboardService.getMovementStatistics();
        console.log("Generación:", stats.GENERACION);
        console.log("Traslado:", stats.TRASLADO);
        console.log("Salida a Reciclaje:", stats.SALIDA_RECICLAJE);

        console.log("\n=====================================");
        console.log("TEST: Trends (Monthly & Daily)");
        console.log("=====================================");
        const monthly = await scrapDashboardService.getMonthlyTrend();
        console.log(`Tendencia mensual obtenida: ${monthly.length} registros`);
        const daily = await scrapDashboardService.getDailyTrend();
        console.log(`Tendencia diaria obtenida: ${daily.length} registros`);

        console.log("\n✅ Todas las consultas del Dashboard ejecutadas correctamente.");

    } catch (error) {
        console.error("❌ Error en tests de Dashboard:", error);
    } finally {
        await sequelize.close();
    }
}

runDashboardTests();
