require('dotenv').config();
const { sequelize, ScrapContainer, AuditLog } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');

// Asegurarse de que el hook esté inicializado
require('./src/modules/scrap/scrap.audit.service'); 

async function runAuditTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Auditoría Automática (Hooks)");
        console.log("=====================================");
        
        const [container] = await ScrapContainer.findOrCreate({
            where: { code: 'TEST-AUDIT-01' },
            defaults: {
                name: 'Contenedor Test Auditoria',
                capacity: 50,
                current_quantity: 0,
                status: 'EMPTY',
                is_active: true
            }
        });

        // Generar movimiento
        await updateContainerInventory({
            container_id: container.id,
            quantity: 15,
            movement_type: 'GENERACION',
            performed_by: 1
        });

        // Esperar un poco para que el hook asíncrono termine si es necesario (generalmente es inline en la misma trx)
        // Verificar en AuditLog
        const auditRecord = await AuditLog.findOne({
            where: {
                entity_type: 'ScrapMovement',
                module: 'Scrap'
            },
            order: [['id', 'DESC']]
        });

        if (auditRecord && auditRecord.metadata.container_id === container.id) {
            console.log("✅ Registro de Auditoría creado exitosamente.");
            console.log("   - IP capturada:", auditRecord.ip_address);
            console.log("   - Acción:", auditRecord.action);
            console.log("   - Balance Anterior:", auditRecord.before_data.balance_before);
            console.log("   - Balance Nuevo:", auditRecord.after_data.balance_after);
        } else {
            console.error("❌ No se encontró el registro de auditoría.");
        }

        console.log("\n=====================================");
        console.log("TEST: Rollback de Auditoría (Exceder Capacidad)");
        console.log("=====================================");
        
        try {
            await updateContainerInventory({
                container_id: container.id,
                quantity: 100, // Excede capacidad de 50
                movement_type: 'GENERACION',
                performed_by: 1
            });
            console.error("❌ El movimiento debió fallar por capacidad.");
        } catch (error) {
            console.log("Movimiento rechazado correctamente:", error.message);
            // Verificar que no se insertó auditoría errónea para cantidad 100
            const badAudit = await AuditLog.findOne({
                where: {
                    entity_type: 'ScrapMovement',
                    'after_data.quantity': 100
                }
            });
            if (!badAudit) {
                console.log("✅ Rollback confirmado: No se generó auditoría falsa.");
            } else {
                console.error("❌ Falla de integridad: Se generó auditoría a pesar del rollback.");
            }
        }

    } catch (error) {
        console.error("❌ Error general en tests de auditoría:", error);
    } finally {
        await sequelize.close();
    }
}

runAuditTests();
