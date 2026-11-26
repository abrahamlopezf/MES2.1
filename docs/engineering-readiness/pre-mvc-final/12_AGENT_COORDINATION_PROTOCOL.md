# 12 — PROTOCOLO DEFINITIVO DE COORDINACIÓN MULTI-AGENTE (`CODEX` & `ANTIGRAVITY`) (FASE K)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Referencia Previa:** [`../closure-audit/12_CONCURRENT_WORK_PROTECTION.md`](../closure-audit/12_CONCURRENT_WORK_PROTECTION.md)

---

## 1. Arquitectura de Ramas y Git Worktrees (SinEjecución en Esta Fase)

Para eliminar definitivamente el riesgo de colisión de archivos, sobreescritura de configuraciones (`.env`, `package.json`, `dbGuard.js`) o contención sobre la base de datos durante la ejecución de las Unidades de Refactorización MVC, se establece el siguiente modelo operativo:

### 1.1 Topología de Ramas y Directorios (`git worktree`)

| Entorno de Trabajo | Ruta en Disco Propuesta | Rama Git Asignada | Responsable | Base de Datos Asignada |
| :--- | :--- | :--- | :---: | :--- |
| **Árbol Principal de Integración** | `c:\Users\maicr\OneDrive\Desktop\Demo` | `main` (o `integration/pre-mvc`) | **Humano (Tech Lead)** | `sistema_enterprise` (`APP_ENV=local`) |
| **Worktree Agente Antigravity** | `c:\Users\maicr\OneDrive\Desktop\Demo-wt-agy` | `refactor/mvc-unit-<N>-agy` | **Antigravity** | `sistema_enterprise_test` (`APP_ENV=test`) |
| **Worktree Agente Codex** | `c:\Users\maicr\OneDrive\Desktop\Demo-wt-codex` | `fix/qa-contract-<ID>-codex` | **Codex** | Instancia QA dedicada (`sistema_enterprise_codex_qa`) |

*(Nota: Conforme a la Fase K, no se han creado ramas ni worktrees todavía; los comandos se ejecutarán únicamente tras el commit de línea base autorizado por el Tech Lead).*

---

## 2. Matriz de Propiedad Exclusiva y Delimitación de Módulos (Ownership Matrix)

Durante la ejecución de cada etapa, **queda estrictamente prohibido que dos agentes editen simultáneamente el mismo archivo o módulo**:

| Unidad / Dominio | Agente Responsable Propuesto | Archivos Autorizados para Edición | Archivos Estrictamente Bloqueados (Read-Only para ese Agente) |
| :--- | :---: | :--- | :--- |
| **Unidad MVC 1:** Desacoplamiento de Controladores de Catálogos, Dashboard, Usuarios, Roles, Permisos y Áreas | **Antigravity** | `backend/src/modules/{areas,catalogs,dashboard,permissions,roles,users}/*` | `backend/src/modules/{extrusion,telares,warehouse,corte,laminado,globo,traceability}/*`, `backend/src/config/*`, `frontend/*` |
| **Unidad MVC 2:** Modularización de Asociaciones de `database/models/index.js` | **Antigravity** *(en ventana exclusiva sin otro agente tocando modelos)* | `backend/src/database/models/index.js`, `backend/src/database/models/associations/*.js` | Todos los controladores, servicios y rutas (`backend/src/modules/**`) |
| **Unidad MVC 3:** Desacoplamiento de los 12 Controladores Operativos Restantes | **Antigravity** | `backend/src/modules/*/*.controller.js` y métodos delegados en sus `*.service.js` | `backend/src/config/*`, `backend/src/database/models/*`, reglas de dominio `*.rules.js` |
| **Unidad 4 (Contratos Funcionales QA):** Resolución de `QA-TEL-ROUTE-001`, `QA-ODC-PACK-001` y Transferencia Corte-Laminado (una vez confirmados por Producto) | **Codex** (o agente asignado por el usuario) | `productionRules.js`, `consumptionPackageAllocator.js`, `corte.service.js` y sus 3 archivos de test en `backend/test/` | Módulos en refactorización estructural por Antigravity |
| **Archivos Transversales Compartidos (`package.json`, `backend/package.json`, `AGENTS.md`, `dbGuard.js`, `routes/index.js`)** | **Bloqueo Mutuo (Solo con Autorización Humana Explícita)** | Ningún agente puede modificarlos sin orden directa del usuario en el prompt. | Protegidos por comparación de hash SHA-256 antes y después de cada turno. |

---

## 3. Protocolo de Trabajo, Registro de Cambios y Revisión Cruzada por Unidad

Cada intervención de un agente sobre una Unidad MVC deberá cumplir los siguientes 6 pasos:

1. **Verificación Pre-Vuelo (Pre-Flight Check):**
   - Ejecutar `git status --porcelain=v1` y `node backend/src/scripts/dev-check.js`.
   - Si algún archivo dentro del alcance de la unidad presenta modificaciones no registradas o si `dev-check.js` falla, **abortar inmediatamente y reportar al usuario**.
2. **Captura de Hashes de Entrada:**
   - Registrar en un manifiesto local el hash SHA-256 de todos los archivos que serán intervenidos en la unidad.
3. **Intervención Acotada:**
   - Modificar exclusivamente los archivos listados en la especificación de la Unidad MVC autorizada.
   - Respetar al 100% los contratos HTTP, nombres de modelos, alias de asociaciones y fronteras transaccionales.
4. **Validación Obligatoria Post-Unidad:**
   - `node backend/src/scripts/dev-check.js` (`8/8 OK`, Master Data SHA-256 `36db9b70...e241`).
   - `node backend/src/scripts/security-check.js` (`0` hallazgos).
   - `npm --prefix backend run test:unit` (0 regresiones respecto a la línea base de `93/96 PASS`).
   - `npm --prefix frontend run build` y `npm --prefix frontend run test -- --run` (`31/31 PASS`).
5. **Revisión Cruzada y Registro:**
   - Documentar la lista exacta de archivos tocados (`before SHA-256` $\rightarrow$ `after SHA-256`) y `git diff --stat`.
6. **Aprobación Humana de Integración:**
   - Ningún agente ejecuta `git commit` o `git merge` sin revisión y aprobación explícita del ingeniero responsable.

---

## 4. Condiciones Obligatorias Antes de Comenzar la Unidad MVC 1

1. **Estabilización del Árbol de Trabajo Actual en Git:**
   - El responsable humano debe decidir si consolida en un commit de línea base (o mantiene controlado) el estado actual de los `74` archivos funcionales modificados (`M`), los `19` archivos funcionales nuevos (`??`), las `4` desvinculaciones del índice (`D `) y las `115` eliminaciones físicas (` D`) de scripts obsoletos.
2. **Paridad de la Migración #164 en DEV (`sistema_enterprise`):**
   - Ejecutar el comando de 1 paso documentado en [`07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md`](./07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md) cuando se desee igualar `sistema_enterprise` a `164` migraciones.
3. **Ventana Exclusiva sin Ejecución Paralela sobre los Archivos de la Unidad 1:**
   - Confirmar que ningún otro agente esté editando `backend/src/modules/{areas,catalogs,dashboard,permissions,roles,users}/` mientras se ejecuta la Unidad MVC 1.
4. **Autorización Expresa del Usuario:**
   - Recibir la instrucción explícita del usuario aprobando la compuerta [`14_FINAL_MVC_AUTHORIZATION_GATE.md`](./14_FINAL_MVC_AUTHORIZATION_GATE.md).
