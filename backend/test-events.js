require('dotenv').config();
const { sequelize, ScrapContainer } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');
const { eventBus, ScrapEvents } = require('./src/core/events/eventBus');

async function runEventTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        let eventEmitted = false;
        let eventPayload = null;

        // Registrar listener temporal
        eventBus.on(ScrapEvents.SCRAP_GENERATED, (payload) => {
            eventEmitted = true;
            eventPayload = payload;
            console.log(">>> [EVENT_BUS_LISTENER] Evento interceptado:", ScrapEvents.SCRAP_GENERATED, payload);
        });

        // Crear contenedor mock si no existe
        const [container] = await ScrapContainer.findOrCreate({
            where: { code: 'TEST-EVENTS-01' },
            defaults: {
                name: 'Contenedor Test Eventos',
                capacity: 100,
                current_quantity: 0,
                status: 'EMPTY',
                is_active: true
            }
        });

        console.log("\n=====================================");
        console.log("TEST: Emisión de Eventos Desacoplados");
        console.log("=====================================");
        
        await updateContainerInventory({
            container_id: container.id,
            quantity: 5,
            movement_type: 'GENERACION',
            performed_by: 1
        });

        if (eventEmitted && eventPayload.container_id === container.id && eventPayload.quantity === 5) {
            console.log("\n✅ EVENTO DISPARADO CORRECTAMENTE DESDE EL CORE");
        } else {
            console.error("\n❌ EL EVENTO NO SE DISPARÓ O EL PAYLOAD ES INCORRECTO");
        }

        // Cleanup
        await updateContainerInventory({
            container_id: container.id,
            quantity: -5,
            movement_type: 'TRASLADO',
            notes: 'Reversión test',
            performed_by: 1
        });

    } catch (error) {
        console.error("❌ Error en tests de Eventos:", error);
    } finally {
        await sequelize.close();
    }
}

runEventTests();
