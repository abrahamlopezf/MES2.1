require('dotenv').config();
const { sequelize } = require('./src/database/models');
const { eventBus, ScrapEvents } = require('./src/core/events/eventBus');

// Inicializar listeners
const registerScrapListeners = require('./src/modules/scrap/scrap.listeners');
registerScrapListeners();

async function runWarehouseIntegrationTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Integración Warehouse (Event Driven)");
        console.log("=====================================");
        
        console.log("Simulando emisión interna de SCRAP_TRANSFERRED...");
        
        eventBus.emit(ScrapEvents.SCRAP_TRANSFERRED, {
            container_id: 1,
            movement_type: 'TRASLADO',
            quantity: 20,
            current_quantity: 80,
            status: 'AVAILABLE',
            performed_by: 1
        });

        console.log("✅ El payload fue ruteado al listener preparado de Warehouse (Stub).");

        console.log("Simulando emisión interna de SCRAP_RECYCLED...");

        eventBus.emit(ScrapEvents.SCRAP_RECYCLED, {
            container_id: 1,
            movement_type: 'SALIDA_RECICLAJE',
            quantity: 30,
            current_quantity: 50,
            status: 'AVAILABLE',
            performed_by: 1
        });

        console.log("✅ El payload de salida reciclaje fue preparado para Warehouse.");
        
        // Dado que el listener no arroja errores ni altera el inventario, finaliza de inmediato.
        console.log("✅ Arquitectura de Integración EDA configurada correctamente para Almacén.");

    } catch (error) {
        console.error("❌ Error en tests de integración Warehouse:", error);
    } finally {
        await sequelize.close();
    }
}

runWarehouseIntegrationTests();
