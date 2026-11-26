# Industrial ERP / MES Master Guidelines

## Core Philosophy
- **Target Audience**: Plant operators, supervisors, QA, and managers (Ages 40-60+).
- **Core Principles**: SPEED, LEGIBILITY, CONTRAST, CONSISTENCY, OPERATION > Aesthetics/Minimalism.
- **Rule of Thumb**: "Can a 55-year-old operator understand this screen in under 5 seconds?" If not, redesign it.
- **Backend Supremacy**: The frontend is strictly a visual representation of the backend logic. NEVER alter industrial operational flows (Traceability, States, Routing) to make the UI simpler. 

## The 14 Golden Rules (Frontend Constitution)
1. **Frontend NEVER modifies state locally.** State changes come ONLY from the backend.
2. **Frontend NEVER calculates quantities.** (e.g. balance, yield, efficiency, scrap). The backend calculates, the frontend visualizes.
3. **Buttons are driven by `allowed_actions`.** NEVER hardcode `if (status === 'RECIBIDO') renderButton()`. Always map UI actions to the `allowed_actions` array provided by the backend endpoint.
4. **The QR Dictates the Flow.** (Escanear -> Backend responde -> Frontend muestra -> Click -> Siguiente acción). No complex 20-page navigations for operators.
5. **El Frontend debe validarse antes de considerarse terminado.** Toda nueva estación, componente o flujo debe incluir validación de compilación, ejecución, rutas críticas, estados UI y entregar un Validation Report.
6. **Los indicadores también pertenecen al Backend.** Frontend NUNCA calcula (ej. scrapPercentage, yield, OEE). El backend entrega los valores calculados y el frontend solo visualiza.
7. **Build Integrity.** Ningún módulo nuevo puede introducir imports hacia archivos inexistentes. Toda nueva dependencia interna debe ser validada mediante `npm run build` antes de integrarse.
8. **Runtime Integrity.** Un módulo no está terminado hasta demostrar que puede fallar sin dejar al operador frente a una pantalla blanca. Todo fallo (red, backend, permisos) debe ser capturado por un Boundary o un ErrorState explícito.
9. **Contract Integrity.** Todo módulo nuevo debe respetar los contratos existentes de exportación, importación y comunicación entre capas. Aplica a Componentes, Hooks, API Clients, Rutas, y Middlewares.
10. **Design System Acceptance.** Ningún módulo puede considerarse terminado sin validar compatibilidad completa con el Design System y ambos temas visuales (Light/Dark Mode).
11. **Visual Consistency (Golden Rule #11).** Ningún módulo puede considerarse terminado sin validar compatibilidad completa con el Design System y ambos temas visuales.
12. **Domain Color Integrity (Golden Rule #12).** Los colores del sistema representan significado operacional. Ningún componente puede alterar la semántica visual definida por el dominio. (Ej. Scrap SIEMPRE es Danger, Producción SIEMPRE es Primary).
13. **Business Logic Prohibition (Golden Rule #13).** El frontend nunca inventará lógica de negocio. Toda regla operacional deberá existir en el backend. El frontend únicamente validará la experiencia del usuario (campos requeridos, formatos, navegación y retroalimentación visual), pero nunca tomará decisiones que puedan afectar la integridad de los datos.
14. **Frontend is a Runtime, not just Views.** Ningún componente de interfaz podrá contener reglas de negocio. Toda decisión existirá en Workflow Engine, Domain Services, Use Cases o Capability Registry.
15. **QR/Search Driven Operation.** Todo proceso operativo deberá poder ejecutarse únicamente mediante un escaneo QR o una búsqueda universal. El operador no navega por menús tradicionales (Sidebar eliminado).
16. **Capability Registration First.** Todo módulo nuevo deberá registrarse en el Runtime (Capability Registry) antes de existir visualmente.
17. **Industrial Design System Purism (Golden Rule #17).** Todo componente del Design System deberá existir porque resuelve un problema operativo identificado dentro de la planta. Ningún componente se desarrollará por razones exclusivamente estéticas o por reutilización hipotética.
18. **Component Contracts (Golden Rule #18).** Todo componente del Design System deberá tener un contrato funcional, restricciones de uso y criterios de accesibilidad antes de implementarse. La implementación es un detalle; el contrato define el comportamiento esperado y garantiza la consistencia de la plataforma.
19. **Quality is Architecture (Golden Rule #19).** Ningún componente, Runtime Service o Workspace podrá considerarse terminado hasta que su contrato, accesibilidad, interacción y comportamiento dentro del Runtime hayan sido validados por la infraestructura de pruebas. La calidad es un requisito de la arquitectura, no una etapa posterior del desarrollo.
20. **Workspace Constraints (Golden Rule #20).** Los Workspaces son consumidores del Runtime, nunca orquestadores del sistema. Un Workspace únicamente representa el estado actual del Workflow, despacha Commands y renderiza componentes del Design System. Toda coordinación entre módulos pertenece al Runtime, a los Workflows o a los Domain Services.

## Strict Prohibitions
- NO Glassmorphism, transparencies, or blurred backgrounds.
- NO white text on light backgrounds or low contrast elements.
- NO excessive animations (Max 150-200ms for state changes/modals).
- NO thin typography. 
- NO huge unorganized layouts; maximize useful information density using a consistent grid.

## Technical Stack Mandate
- **Framework**: React + Vite + TypeScript.
- **Styling**: TailwindCSS
- **Components**: Shadcn/UI (Strictly consistent).
- **Data Fetching**: TanStack Query (React Query). MUST separate queries and mutations.
- **Forms**: React Hook Form + Zod.
- **Icons**: Lucide React.

---

## Backend MVC & Engineering Readiness Constitution (Mandatory Rules for AI Agents)

All AI agents working on TraceFlow MES MUST read and follow the engineering baseline in `docs/engineering-readiness/` before modifying any file.

### 1. Approved Modular MVC Architecture
- **Layer Hierarchy**: `Routes (*.routes.js)` -> `Middlewares` -> `Controllers (*.controller.js)` -> `Application Services (*.service.js)` -> `Domain Rules (*.rules.js)` & `Repositories (*.repository.js)` -> `Sequelize Models (database/models/*)`.
- **Zero ORM in Controllers**: Controllers MUST NEVER import `database/models`, `sequelize`, or `Op`. Controllers only extract HTTP inputs, invoke an Application Service, and format the HTTP response.
- **Pure Domain Rules**: Industrial formulas, routing rules, package allocation (`consumptionPackageAllocator`), and weight calculations (`calculateFabricWeightKg`) belong in pure, deterministic rule modules (`rules/`) with zero database or HTTP dependencies.
- **Facade Compatibility During Refactoring**: When decomposing large services (`extrusion.service.js`, `traceability.service.js`, `telares.service.js`, `warehouse.service.js`) or `database/models/index.js`, always keep the original module as a re-exporting facade until all consumers are migrated and verified.

### 2. Environment Isolation (`APP_ENV` & `dbGuard.js`)
- **Fail-Closed Local Shield**: `backend/src/config/dbGuard.js` enforces strict environment boundaries via `APP_ENV` (`local`, `test`, `uat`, `production`). NEVER bypass, weaken, or remove `dbGuard.js`.
- **Absolute Remote Block in Local/Test**: No local development process, CLI command, migration, seeder, or test may ever connect to Neon Cloud (`*.neon.tech`) or any non-loopback host (`127.0.0.1` / `localhost`).
- **Database Separation**:
  - `APP_ENV=local` connects exclusively to `sistema_enterprise` (`127.0.0.1:5432`).
  - `APP_ENV=test` (and `NODE_ENV=test`) connects exclusively to `sistema_enterprise_test` (`127.0.0.1:5432`). Never run integration or destructive tests against `sistema_enterprise`.

### 3. Client Master Data Protection
- **Inviolable Master Data**: The 30 Master Data tables (`2,928` baseline records, Global SHA-256 `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` documented in `docs/engineering-readiness/03_MASTER_DATA_INTEGRITY.md`) MUST NEVER be truncated, deleted, or overwritten with synthetic fixtures.
- **Mandatory Verification**: Before and after any database or refactoring task, run `npm --prefix backend run db:verify:local` to confirm the Master Data SHA-256 fingerprint remains intact.
- **Test DB Triggers**: Keep the 58 `[QA_MASTER_DATA_GUARD]` triggers active on `sistema_enterprise_test` at all times.

### 4. Secrets & Repository Hygiene
- **Zero Hardcoded Credentials**: NEVER write literal passwords, JWT secrets, QR keys, or database URLs in source code, test scripts (`.codex-e2e-*`), seeders, or GitHub workflows. Always read credentials from environment variables.
- **Mandatory Security Scan**: Run `npm run security:check` before concluding any intervention. Keep `.git/hooks/pre-commit` intact.

### 5. Transaction Boundaries
- **Atomic Industrial Operations**: Multi-table operations (lot consumption, WIP creation, inventory movement, custody transfer, shift handoff, genealogy registration) MUST execute inside a single `sequelize.transaction(...)` opened at the Application Service boundary.
- **Explicit Transaction Propagation**: Every repository or helper call inside a transactional flow MUST receive and pass `{ transaction }`. Never execute unlocked or out-of-transaction writes inside a composite operation.

### 6. Characterization Tests, Concurrent Work & Mandatory Consultation
- **Test Before & After Refactoring**: Never refactor a module without first running `npm run test:integrity` (`envIsolationGuard.test.js` + `characterization.contracts.test.js`) and `npm run test:unit`. Every refactoring unit in `docs/engineering-readiness/11_REFACTORING_ROADMAP.md` must leave all tests green (`npm run validate`).
- **Protect Concurrent Work in Progress**: Always inspect `git status` first. NEVER run destructive commands (`git reset --hard`, `git checkout -- .`, `git clean -fd`) or overwrite uncommitted changes from other developers.
- **Prohibition on Unauthorized Business Logic Changes**: NEVER alter business rules, industrial routing, tolerances, or financial/mass calculations without explicit user authorization. When encountering an ambiguity between code and tests (such as `QA-TEL-ROUTE-001` or `QA-ODC-PACK-001`), document the evidence and ask the user before changing the rule.
