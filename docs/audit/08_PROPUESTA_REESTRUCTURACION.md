# 08 — Propuesta de Reestructuración Arquitectónica (MVC Backend y Modular Frontend)

## 1. Principios Rectores de la Propuesta

Esta propuesta está diseñada sobre las características reales de **TraceFlow MES** y el Mapa de Dominios Oficiales ([`MES_DOMAIN_MAP.md`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/MES_DOMAIN_MAP.md) — Directiva Arquitectónica No. 002), evitando sobreingeniería:
1. **Respeto a los Dominios Oficiales del MES**: `Core` (Auth, Users, Roles, Permissions, Audit), `MasterData` (Materials, Units, Families, Codes, Brands, Types, Locations, Suppliers, Tags), `Warehouse` (Inventory, Lotes, Movements, Reception, Silos, ConsumptionOrders), `Production` (Extrusion, Telares, Globo, Laminado, Corte, WIP), `Traceability` (QR, Labels, Scan, Genealogy), `Scrap` y `Dashboard`.
2. **Backend MVC + Capa de Servicios y Repositorios Pragmáticos**:
   - **Rutas (`*.routes.js`)**: Solo declaran endpoints HTTP, middlewares de autenticación/autorización (`authMiddleware`, `permissionMiddleware`) y validación declarativa (`validateRequest`).
   - **Controladores (`*.controller.js`)**: Máximo 150-200 líneas. Extraen datos de `req`, llaman a un Servicio de Dominio y devuelven la respuesta HTTP estandarizada. **Cero llamadas directas a modelos Sequelize**.
   - **Servicios de Dominio (`services/*.service.js`)**: Máximo 400-500 líneas por archivo. Contienen las reglas de negocio industriales, orquestan transacciones (`sequelize.transaction`) y delegan consultas complejas a Repositorios.
   - **Modelos y Repositorios (`models/*.model.js`, `repositories/*.repository.js`)**: Definen la estructura de tablas, asociaciones locales (`Model.associate(db)`) y consultas SQL/Sequelize reutilizables.
3. **Frontend Pragmático Alineado a las 20 Reglas de Oro (`AGENTS.md`)**:
   - Conservar el Runtime ligero ya probado (`core/platform/EventBus`, `core/platform/CapabilityRegistry`, `core/runtime/WorkflowEngine`) y la arquitectura por módulo (`pages/`, `containers/`, `presenters/`, `hooks/queries/`, `hooks/mutations/`, `services/`, `types/`).
   - **Eliminar la capa DDD experimental desconectada** (`domain/aggregates`, `domain/valueObjects` con imports rotos, `InMemory*Repository`) que no participa en la operación real y rompe `tsc --noEmit`.

---

## 2. Estructura Objetivo del Backend (`backend/src/`)

```text
backend/
├── package.json
├── .sequelizerc
├── test/                                    # Pruebas de integración y flujos transversales
│   ├── unit/
│   └── integration/
└── src/
    ├── server.js                            # Punto de entrada HTTP y conexión DB
    ├── app.js                               # Configuración Express, CORS, Helmet, Rutas y ErrorHandler
    ├── config/
    │   ├── env.js                           # Validación estricta de variables de entorno (Local/UAT/Prod)
    │   ├── database.js                      # Instancia Sequelize multi-ambiente (Local, UAT, Producción)
    │   └── sequelize-cli.config.js          # Perfiles CLI: development, test, uat, production
    ├── shared/                              # Infraestructura transversal unificada (absorbe src/utils/ y src/services/)
    │   ├── errors/                          # AppError, DomainError, NotFoundError
    │   ├── http/                            # apiResponse.js unificado y asyncHandler.js
    │   ├── logging/                         # Logger estructurado (sin fs.appendFileSync en disco)
    │   ├── crypto/                          # crypto.utils.js (QR AES-GCM / Legacy CBC)
    │   ├── time/                            # timezone.js (CDMX America/Mexico_City)
    │   └── base/                            # BaseCatalogService.js
    ├── middlewares/
    │   ├── auth.middleware.js
    │   ├── permission.middleware.js
    │   ├── areaScope.middleware.js
    │   ├── rateLimit.middleware.js
    │   ├── validateRequest.middleware.js    # Middleware único de validación (Zod + compatibilidad Joi)
    │   ├── notFound.middleware.js
    │   └── error.middleware.js              # Manejador global único (sin escritura síncrona a error_log.txt)
    ├── database/
    │   ├── models/
    │   │   └── index.js                     # Orquestador ligero (<150 líneas) que carga modelos y ejecuta associate(db)
    │   ├── migrations/                      # Fuente única de migraciones (se elimina database/legacy/)
    │   └── seeders/
    ├── routes/
    │   └── index.js                         # Registro central de prefijos /api/*
    ├── scripts/                             # ÚNICAMENTE scripts operativos de CI/CD y mantenimiento vigentes
    │   ├── validate-migration.js
    │   ├── verify-catalog-seed.js
    │   └── provision-demo-users.js
    └── modules/
        ├── core/                            # (Agrupa auth, users, roles, permissions, areas, audit, notifications, health)
        ├── master-data/                     # (Agrupa materials, families, codes, brands, types, units, locations, suppliers, tags)
        ├── warehouse/                       # (Inventario, Lotes, Recepción, Silos, ODC, Reportes de Almacén)
        │   ├── controllers/
        │   ├── services/
        │   │   ├── warehouseInventory.service.js
        │   │   ├── reception.service.js
        │   │   ├── siloManagement.service.js
        │   │   ├── consumptionOrder.service.js
        │   │   └── warehouseReport.service.js
        │   ├── repositories/
        │   ├── models/
        │   ├── schemas/
        │   └── warehouse.routes.js
        ├── extrusion/                       # Descomposición del monolito de 8,303 líneas en servicios cohesivos:
        │   ├── extrusion.controller.js      # (<200 líneas, o dividido por sub-recurso)
        │   ├── extrusion.routes.js
        │   ├── models/                      # Incluye extrusionProductionAdjustment.model.js extraído de models/index.js
        │   ├── schemas/
        │   └── services/
        │       ├── extrusionFacade.service.js       # Fachada compatible con controladores y tests actuales
        │       ├── extrusionFormula.service.js      # Fórmulas, colores, compatibilidad de máquina
        │       ├── extrusionMixing.service.js       # Preparación de mezclas, consumo de silos y WIP PP
        │       ├── extrusionQueue.service.js        # Cola de extrusoras, prioridades, traslados entre máquinas
        │       ├── extrusionRackPti.service.js      # Racks, carritos, ingreso PTI, transferencia a almacén/telares
        │       ├── extrusionShift.service.js        # Sesiones de turno, relevo (handoff), balance y programación
        │       ├── extrusionScrap.service.js        # Merma, purga, ajustes y conciliación
        │       └── extrusionReport.service.js       # Reportes e indicadores OEE/rendimiento de extrusión
        ├── telares/                         # Descomposición de telares.service.js (2,846 líneas):
        │   ├── telares.controller.js
        │   ├── telares.routes.js
        │   ├── models/
        │   └── services/
        │       ├── telaresBom.service.js            # Fichas técnicas, reglas denier/onzas, conversión metros-kg
        │       ├── telaresCreelWip.service.js       # Fileta, carga de bobinas PTI, disponibilidad FIFO
        │       ├── telaresRun.service.js            # Corridas, rollos viajeros, segmentos por operador, backflush
        │       └── telaresScrap.service.js          # Merma de telares y observaciones downstream
        ├── wip/                             # Procesos intermedios compartidos (Globo, Laminado, Corte)
        │   ├── globo/
        │   ├── laminado/
        │   ├── corte/
        │   └── shared/                      # rollTransformation.js, specificationCatalog.js, telaresScrapObservation.service.js
        ├── traceability/                    # Unificación de qrcodes + traceability
        │   ├── controllers/
        │   ├── services/
        │   │   ├── qrBatch.service.js
        │   │   ├── qrPrintPdf.service.js
        │   │   ├── qrTraceabilityTree.service.js
        │   │   └── traceabilityDomain.service.js
        │   └── models/
        └── dashboard/
```

---

## 3. Estructura Objetivo del Frontend (`frontend/src/`)

```text
frontend/src/
├── main.jsx                                 # Punto de entrada único (se eliminan src/App.jsx y src/app/App.jsx huérfanos)
├── app/
│   ├── router.jsx                           # Rutas con React.lazy() + <Suspense> por dominio y RouteErrorBoundary
│   ├── ProtectedRoute.jsx
│   ├── SuperAdminRoute.jsx
│   ├── AdminAlmRoute.jsx
│   └── PermissionRoute.jsx
├── core/
│   ├── api/                                 # Cliente HTTP único (apiClient.ts limpio de imports rotos comentados)
│   ├── error/                               # GlobalErrorBoundary
│   ├── platform/                            # EventBus, CapabilityRegistry, Scanner
│   ├── query/                               # QueryProvider (se elimina src/providers/AppQueryProvider.jsx duplicado)
│   └── runtime/                             # WorkflowEngine
├── design-system/                           # Componentes industriales validados en Light/Dark mode
├── components/
│   ├── auth/
│   ├── layout/
│   └── ui/                                  # Primitivas Shadcn/UI activas
├── shared/
│   ├── components/wip/                      # Modales y paneles transversales de transformación WIP
│   └── utils/
└── modules/                                 # Alineados 1:1 con los dominios del backend
    ├── auth/
    ├── users/
    ├── roles/
    ├── materials/
    ├── identity/                            # Unifica generación/impresión/historial de lotes QR (retirando DDD huérfano roto)
    ├── warehouse/                           # Inventario, Lotes, Recepción, Silos, ODC, Reportes
    ├── extrusion/                           # Unifica las páginas hoy dispersas entre modules/production y modules/extrusion:
    │   ├── pages/
    │   ├── containers/
    │   ├── presenters/                      # Sub-componentes <400 líneas extraídos de MixingTerminalForm y PtiIngressPresenter
    │   ├── hooks/
    │   │   ├── queries/                     # Consultas TanStack Query (separadas de mutaciones)
    │   │   └── mutations/                   # Mutaciones TanStack Query
    │   ├── services/
    │   └── types/
    ├── telares/                             # Subdivisión de TelaresCatalogPage (2,307 líneas) y TelaresTerminalPage (1,804 líneas)
    ├── globo/
    ├── laminado/
    ├── corte/
    ├── traceability/
    └── dashboard/
```

---

## 4. Plan de Migración Incremental (Sin Ruptura Operativa)

Para garantizar que ninguna funcionalidad ni regla de negocio se altere durante la futura reestructuración:

1. **Etapa 1 — Higienización de Código Muerto e Imports Rotos (Riesgo Muy Bajo)**:
   - Eliminar en Backend los 46 archivos huérfanos confirmados (`intermediate/`, `processes/`, `scrap/` legado, `catalogs/storageLocation*`, `errorHandler.js`) y en Frontend los 82 archivos huérfanos con imports rotos.
   - Reemplazar `fs.appendFileSync('error_log.txt')` y `fs.writeFileSync('validation_error.txt')` por logging a salida estándar.
   - Validar que `tsc --noEmit`, `vite build`, `vitest run` y `node --test` pasen al 100 %.
2. **Etapa 2 — Modularización de `database/models/index.js` (Riesgo Bajo)**:
   - Extraer `ExtrusionProductionAdjustment` a su propio archivo `.model.js`.
   - Mover las declaraciones de asociaciones a archivos `associations.js` por dominio invocadas desde `database/models/index.js`, verificando con un test de contrato que `Object.keys(db)` y `Model.associations` sean 100 % idénticos antes y después.
3. **Etapa 3 — Extracción por Estrangulamiento ("Strangler Fig") de Servicios Monolíticos (Riesgo Medio — Controlado por Tests)**:
   - En `extrusion.service.js` (8,303 líneas) y `telares.service.js` (2,846 líneas), extraer un subdominio a la vez (primero `extrusionShift.service.js`, luego `extrusionSilo.service.js`, `extrusionMixing.service.js`, `extrusionRackPti.service.js`), manteniendo los métodos públicos delegados en `ExtrusionService` para no romper controladores ni tests de integración existentes.
4. **Etapa 4 — Adelgazamiento de Controladores y Unificación de `apiResponse` (Riesgo Bajo)**:
   - Mover las consultas Sequelize de los 18 controladores señalados en `07_AUDITORIA_MVC.md` hacia sus servicios correspondientes.
5. **Etapa 5 — Subdivisión de Componentes Frontend >1,000 Líneas y Code-Splitting (Riesgo Bajo)**:
   - Extraer sub-componentes presentacionales de `MixingTerminalForm.tsx`, `TelaresCatalogPage.tsx`, `PtiIngressPresenter.tsx` y `TelaresTerminalPage.tsx`, y habilitar `React.lazy()` en `router.jsx`.
