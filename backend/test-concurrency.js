require('dotenv').config();
const { sequelize, ScrapContainer } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');

async function runConcurrencyTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Concurrencia ACID y Race Conditions");
        console.log("=====================================");

        // Crear contenedor aislado para la prueba
        const [container] = await ScrapContainer.findOrCreate({
            where: { code: 'TEST-CONCURRENCY-01' },
            defaults: {
                name: 'Contenedor Test Concurrencia',
                capacity: 1000, // Alta capacidad para evitar rechazos normales
                current_quantity: 100, // Base inicial
                status: 'AVAILABLE',
                is_active: true
            }
        });

        // Asegurar que partimos de 100
        await container.update({ current_quantity: 100 });

        console.log("Balance inicial del contenedor:", 100);
        console.log("Iniciando operaciones masivas simultáneas (Generación, Traslado, Reciclaje)...");

        // Preparar arreglo de promesas
        const promises = [];

        // 1. Añadiremos 10 operaciones de GENERACIÓN simultáneas (+10 cada una = +100 total)
        for(let i = 0; i < 10; i++) {
            promises.push(
                updateContainerInventory({
                    container_id: container.id,
                    quantity: 10,
                    movement_type: 'GENERACION',
                    performed_by: 1
                }).catch(e => `Fallo Generacion: ${e.message}`)
            );
        }

        // 2. Añadiremos 10 operaciones de TRASLADO simultáneas (retiros, -5 cada una = -50 total)
        for(let i = 0; i < 10; i++) {
            promises.push(
                updateContainerInventory({
                    container_id: container.id,
                    quantity: -5,
                    movement_type: 'TRASLADO',
                    performed_by: 1
                }).catch(e => `Fallo Traslado: ${e.message}`)
            );
        }

        // 3. Añadiremos 1 operación de RECICLAJE masivo maliciosa (-500) para forzar un Rollback (100+100-50 = 150 < 500)
        // Esta debería fallar garantizadamente sin corromper la BD
        promises.push(
            updateContainerInventory({
                container_id: container.id,
                quantity: -500,
                movement_type: 'SALIDA_RECICLAJE',
                performed_by: 1
            }).catch(e => `Rechazo Correcto Reciclaje: ${e.message}`)
        );

        // Ejecutar todas al mismo tiempo para maximizar chance de race condition
        const results = await Promise.all(promises);
        
        // Resultados
        const rechazos = results.filter(r => typeof r === 'string');
        const exitos = results.filter(r => typeof r !== 'string');

        console.log(`\nPromesas resueltas. Éxitos: ${exitos.length}, Rechazos/Rollbacks: ${rechazos.length}`);
        
        // Verificar registro que debió fallar por inventario negativo
        const expectedRejection = rechazos.find(msg => msg.includes('saldo no puede ser negativo') || msg.includes('Inconsistencia'));
        if (expectedRejection) {
            console.log("✅ Rollback confirmado de la operación destructiva (-500).");
        } else {
            console.error("❌ Falla crítica: La operación destructiva no fue rechazada.");
        }

        // Validar el balance final de forma estricta (100 inicial + 100 generación - 50 traslado = 150)
        const finalContainer = await ScrapContainer.findByPk(container.id);
        const expectedBalance = 150;
        
        console.log(`Balance Final Real: ${finalContainer.current_quantity} | Esperado: ${expectedBalance}`);
        
        if (Number(finalContainer.current_quantity) === expectedBalance) {
            console.log("\n✅ PRUEBA DE CONCURRENCIA EXITOSA: Ausencia total de Race Conditions. Consistencia ACID verificada.");
        } else {
            console.error("\n❌ FALLO DE CONCURRENCIA: Existen Race Conditions, la DB no está bloqueando correctamente las filas (FOR UPDATE).");
        }

    } catch (error) {
        console.error("❌ Error inesperado en el test de concurrencia:", error);
    } finally {
        await sequelize.close();
    }
}

runConcurrencyTests();
