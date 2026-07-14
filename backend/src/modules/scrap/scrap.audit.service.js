const { AsyncLocalStorage } = require('async_hooks');
const { AuditLog, ScrapMovement, User, ScrapContainer } = require('../../database/models');

// Usamos AsyncLocalStorage para capturar el contexto HTTP (req) sin modificar la capa de servicios
const contextStorage = new AsyncLocalStorage();

class ScrapAuditService {
    constructor() {
        this.setupHooks();
    }

    /**
     * Middleware para inicializar el contexto de la petición HTTP.
     * Permite a los hooks de Sequelize acceder a IP y User Agent.
     */
    middleware() {
        return (req, res, next) => {
            contextStorage.run({ req }, () => {
                next();
            });
        };
    }

    /**
     * Configura el hook a nivel del modelo para interceptar cualquier movimiento automáticamente.
     */
    setupHooks() {
        ScrapMovement.addHook('afterCreate', 'scrap_audit_hook', async (movement, options) => {
            // Extraemos el request del contexto asíncrono, si existe
            const store = contextStorage.getStore() || {};
            const req = store.req || {};

            const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'Sistema';
            const userAgent = req.headers?.['user-agent'] || 'Sistema';

            const description = `Registro de ${movement.movement_type}: ${movement.quantity} ${movement.unit} en contenedor ${movement.container_id}`;

            const auditData = {
                user_id: movement.performed_by || null,
                action: 'REGISTER_MOVEMENT',
                entity_type: 'ScrapMovement',
                entity_id: movement.id ? movement.id.toString() : null,
                module: 'Scrap',
                description: description,
                before_data: { 
                    balance_before: movement.balance_before
                },
                after_data: { 
                    balance_after: movement.balance_after,
                    quantity: movement.quantity
                },
                metadata: {
                    movement_type: movement.movement_type,
                    container_id: movement.container_id,
                    resultado: 'EXITO'
                },
                ip_address: ipAddress.substring(0, 80),
                user_agent: userAgent
            };

            // Ejecutamos la auditoría DESPUÉS del commit exitoso (siguiendo el mismo patrón que EDA)
            if (options.transaction) {
                options.transaction.afterCommit(async () => {
                    try {
                        await AuditLog.create(auditData);
                    } catch (err) {
                        console.error('Error al registrar auditoría post-commit:', err);
                    }
                });
            } else {
                try {
                    await AuditLog.create(auditData);
                } catch (err) {
                    console.error('Error al registrar auditoría:', err);
                }
            }
        });
    }
}

// Exportamos un singleton
module.exports = new ScrapAuditService();
