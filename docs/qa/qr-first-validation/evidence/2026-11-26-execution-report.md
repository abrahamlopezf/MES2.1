# Ejecución QA QR-First — 2026-11-26

## Resultado

**Estado global: PARCIAL / E2E BLOQUEADO POR GATE DE PROTECCIÓN QA.** Esta intervención comprobó conexión, aislamiento, permisos, huellas, tests automatizados y compilación. No ejecutó escrituras operativas, autenticaciones sintéticas ni corridas industriales.

## Evidencia de entorno (solo lectura)

| Control | Observado | Estado |
|---|---|---|
| QA efectiva | `sistema_enterprise_test` en `127.0.0.1:5432`, rol `traceflow_app_test` | PASS |
| Privilegios runtime QA | Sin superuser, create DB/role, replication, bypass RLS, create schema ni membresía elevada | PASS |
| Aislamiento DEV ↔ QA | runtime QA no puede conectar DEV; `db:verify:privileges` confirma bloqueo de conexión en ambas direcciones | PASS |
| Master Data DEV/QA v2 | 2,972 filas/30 tablas; hash global igual `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83` | PASS: paridad |
| Tabla `extrusoras_formulas` | Existe en DEV y QA; 44 filas y 7 columnas | PASS: huella incluida |
| Triggers QA Master Data | 58/60 habilitados en 29/30 tablas | FAIL: falta `extrusoras_formulas` |
| Gate de escritura | `readyForWrites=false` | BLOCKED |
| Migraciones | DEV 163; QA 164 | Diferencia pendiente: solo QA tiene `20261124130000-add-laminado-cut-transfer-confirmations.js` |
| Neon/producción | No se conectó | PASS: fuera de alcance |
| Datos de DEV/QA | Sin DML/DDL operativo en esta intervención | PASS |

Los fingerprints completos se encuentran en `master-data-dev-v2.json` y `master-data-qa-v2.json`. La huella histórica v1 de 2,928 filas no cubría `extrusoras_formulas`; permanece solo como registro histórico.

## Pruebas ejecutadas

| Prueba | Resultado | Clasificación |
|---|---:|---|
| `backend npm run dev:check` | 8/8 | PASS |
| `backend npm run db:verify:privileges` | 20/20 | PASS |
| backend aislamiento + fingerprint + lote QR | 17/17 | PASS |
| frontend Vitest | 49/49 en 12 archivos | PASS |
| Vite build | completó; 1,865 módulos | PASS con advertencia: bundle JS 3.71 MB minificado |
| backend `npm run test:unit` | 92/96 | FAIL, motivos abajo |
| backend HTTP caracterización | health 200, 404, login inválido 400, endpoints protegidos 401 | PASS |
| fingerprint DEV vs QA | 30/30 tablas, mismo hash v2 | PASS |

Los cuatro casos backend fallidos son:

1. **QA protección Master Data:** test de solo lectura reporta 58 triggers/29 tablas, cuando el criterio de este perfil exige 60/30. Se cambió la prueba para retirar un intento de `DELETE` y el error por variable `t` no definida; la aserción ahora describe el fallo real sin DML.
2. **Tres expectativas de ruta Telares→Globo:** dos pruebas permiten rutas que otra prueba bloquea. La política confirmada dice que solo algunas fichas pueden ir a Globo, pero no se proporcionó la lista. No se alteraron las reglas ni expectativas para ocultar la discrepancia.

## RBAC y QR

- El test de la política de lote QR confirma que los roles permitidos por código son Superadmin, Admin General y Admin de Almacén; operadores, supervisores y otros administradores de área se rechazan. Esto es validación unitaria de la política/middleware, no llamada API autenticada.
- **Defecto estático confirmado:** `users.routes.js` concede GET/POST/PUT a `SUPERVISOR_EXTRUSION` y `SUPERVISOR_TELARES`, contradiciendo la directiva vigente que prohíbe administración de usuarios a supervisores. No se cambió código funcional ni se hicieron cambios de usuario.
- No se probaron precios, protección del último responsable, manipulación de `area_id`, acceso transversal de genealogía ni permisos por respuesta HTTP debido a la ausencia de una QA habilitada para escrituras y de cuentas sintéticas.

## Trabajo de prueba no ejecutado

| Escenario | Estado | Motivo |
|---|---|---|
| E2E Almacén→Mezcla→Extrusión→Telares | NOT EXECUTED | requiere writes operativos y QA aislada apta |
| Laminado con salida QR y genealogía | NOT EXECUTED | mismo bloqueo de QA; ninguna ruta probada desde UI |
| Globo/Liner | BLOCKED | no están identificadas las fichas habilitadas para ruta a Globo |
| Auditoría visual autenticada | NOT EXECUTED | no se creó sesión sintética ni se usó una real |
| Asignación QR concurrente/duplicados | NOT EXECUTED | requiere instancia desechable con escritura |
| Veinte multicorridas | 0/20 | no se ejecutaron; no se cuentan pruebas unitarias como corridas |
| Genealogía persistida completa | NOT EXECUTED | requiere producción sintética en QA aislada |

## Cambio mínimo para desbloquear corridas

1. Provisionar una base local desechable separada, no `sistema_enterprise` ni `sistema_enterprise_test`, con nombre de perfil QA aceptado por `dbGuard` (sufijo `_test`, `_qa`, `_e2e` o `_verify`), snapshot restaurado/verificado y rol runtime no administrativo sin acceso a DEV.
2. Instalar en esa base exclusivamente desechable el par de triggers de protección faltante para `extrusoras_formulas`; verificar 60 triggers/30 tablas antes de habilitar DML. No tocar triggers de bases existentes sin autorización adicional.
3. Aplicar a QA la migración que actualmente solo está en QA o recrear la base desde un esquema versionado consistente; verificar igualdad de migraciones antes de iniciar E2E.
4. Preparar cuentas sintéticas de los roles solicitados dentro del disposable; comprobar RBAC por HTTP/UI y persistencia.
5. Confirmar con Producto las fichas de Telares que permiten ruta a Globo.

## Archivos de esta ejecución

- `backend/src/scripts/master-data-fingerprint.js`: corrección de relación física, versión v2 y fallo cerrado.
- `backend/test/master-data-fingerprint.test.js`: casos de relación física, falta de tabla y comparación de versiones.
- `backend/src/scripts/qa-readiness-check.js`: verificación read-only de identidad, privilegios, triggers y diferencia de migraciones.
- `backend/test/characterization.contracts.test.js`: comprobación read-only 60/30 en lugar de `DELETE` y corrección de `t` no definido.
- `docs/engineering-readiness/03_MASTER_DATA_INTEGRITY.md`: distingue línea histórica v1 de línea vigente v2.
- `docs/qa/qr-first-validation/05_E2E_AND_VISUAL_VALIDATION.md` y `09_EXECUTIVE_REPORT.md`: resultados actuales, diferenciados de los históricos.

## Dictamen

No se autoriza iniciar la refactorización MVC en módulos con reglas o RBAC fallidos. La preparación estática de bajo riesgo puede continuar en paralelo, pero cualquier refactorización que toque administración de usuarios, permisos, rutas Telares→Globo, schema/DB QA o QR industrial debe permanecer bloqueada hasta corregir/confirmar los puntos anteriores y ejecutar evidencia API/E2E.

## Anexo de continuación — 2026-11-26

Se ejecutó una continuación con cambios RBAC autorizados, sin escribir en PostgreSQL. Se cerraron en código los bypasses de administración de usuarios para supervisores, se restringieron las ediciones de fichas de Extrusión/Telares/Globo a administración y perfiles globales, y la visibilidad general de costos dejó de permitir roles `ADMIN_*` no reconocidos o `FINANCE`. La desactivación o cambio de rol de un responsable usa ahora un advisory lock transaccional por área/tipo para evitar dos bajas simultáneas. La política de último responsable aún no se ha probado con concurrencia en QA.

Resultados nuevos: backend unitario 92/96 al habilitar ejecución local de sockets; las cuatro caracterizaciones HTTP que antes arrojaban `EACCES` pasaron. Permanecen un fallo de triggers QA (58/60 en 29/30 tablas) y tres discrepancias Telares→Globo por fichas sin identificar. Tests dirigidos RBAC/QR: 14/14; frontend: 53/53; build Vite: PASS (1,865 módulos, warning de bundle grande); security scan: 0 hallazgos de 1,271 archivos.

La ejecución escalada de `dev:check` fue rechazada por la revisión automática con la explicación de que podría ejecutar `CREATE TABLE` en bases existentes. Se respetó el rechazo; no se intentó otra vía. No hubo DDL/DML, usuarios sintéticos, API autenticada, UI por rol, corrida industrial ni multicorridas. El estado de huella, privilegios, migraciones y triggers indicado en la sección anterior es evidencia de la auditoría previa, no una revalidación en esta continuación.

La QA desechable sigue sin estar disponible: no hay Docker/Podman ni credencial administrativa local configurada. Requisito para continuar: instancia PostgreSQL independiente con puerto/volumen y credenciales locales propios, restore verificable, runtime/migrador aislados y autorización de acceso a esa instancia. Hasta entonces se bloquean escrituras QA, protección trigger, migración DEV, E2E autenticada y multicorridas. Dictamen histórico a esa fecha: **QR-FIRST PARCIALMENTE VALIDADO**.

## Anexo de reanudación Playwright — 2026-11-26

### Seguridad y runtime QA

La revalidación de solo lectura mediante `backend/src/scripts/qa-readiness-check.js` confirmó `sistema_enterprise_test`, rol runtime `traceflow_app_test`, dirección PostgreSQL `127.0.0.1/32:5432`, sin superuser/roles elevados ni conexión a DEV, `extrusoras_formulas` presente (44 filas, 7 columnas), 60 triggers habilitados sobre 30 tablas y `readyForWrites=true`. DEV tiene 163 migraciones y QA 164; únicamente QA registra `20261124130000-add-laminado-cut-transfer-confirmations.js`. No se ejecutaron migraciones.

La huella de solo lectura de QA volvió a dar 2,972 filas en 30 tablas y SHA-256 `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`. El hash coincide con el previamente informado.

El backend QA se ejecuta en el puerto 4001 ligado a `127.0.0.1`; Vite QA en `127.0.0.1:5176`, en modo `qa`, con el cliente servido apuntando a `http://localhost:4001/api`. La URL 5174 no se utilizó para operaciones porque el proceso preexistente allí usa `APP_ENV=local` y `sistema_enterprise` (DEV); no se hicieron clics ni escrituras en ese proceso. No se consultó Neon.

### Sesiones y actividad

Playwright/CDP verificó siete procesos Chrome distintos, cada uno con perfil persistente propio y puerto CDP loopback independiente: Almacén, Extrusión, Telares, Laminado, Lainer pendiente, Corte y Globo. Todas las páginas apuntan a QA y permanecen en `/login`; no hay cookies/sesiones autenticadas nuevas en estos perfiles. Capturas sin credenciales en `docs/qa/evidence/2026-11-26-qrfirst-restart/` (`almacen-login.png`, `extrusion-login.png`, `telares-login.png`, `laminado-login.png`, `lainer-pendiente-login.png`, `corte-login.png`, `globo-login.png`). No se probó una operación industrial desde UI en esta reanudación y no se crearon solicitudes, corridas, lotes ni PTI. La separación de perfiles sí fue verificada; la autenticación por rol sigue pendiente de intervención manual del operador.

### Validaciones automatizadas de esta reanudación

- Frontend Vitest: 65/65 en 18 archivos.
- Build Vite: PASS, 1,870 módulos; sigue el aviso de chunk JS de 3,714.20 kB sin gzip.
- `npm run security:check`: PASS, 8,116 archivos, 0 hallazgos.
- Backend unitario completo ejecutado previamente durante esta intervención: 97/100; siguen 3 fallos en expectativas contrapuestas de rutas Telares→Globo. No se modificaron esas reglas ni pruebas.
- No se ejecutó integración con escritura ni E2E autenticado en esta reanudación.

### Cambio de seguridad durante la preparación

La primera instancia de backend QA apareció ligada a `::` debido a que `server.js` usa `app.listen(PORT)` sin host. Se detuvo esa instancia y se reinició solo el proceso QA del puerto 4001 con bind explícito de loopback; DEV no fue detenido ni cambiado. Este ajuste se aplicó al comando de ejecución, sin modificar código fuente ni la base.

### Estado

Gate de escritura QA: **PASS**. Integridad Master Data: **PASS**. E2E industrial autenticado: **PENDIENTE**, en espera de inicio manual de sesión en los perfiles etiquetados. La divergencia de migraciones es conocida y bloquea DDL, no las escrituras operativas ordinarias autorizadas por el gate.

## Anexo de sesiones — 2026-11-27

El usuario reportó iniciar Extrusión, Laminado, Almacén y Telares, y faltar Corte/Globo. La verificación visual de las ventanas disponibles encontró que las cuatro sesiones efectivas observables apuntaban a `http://127.0.0.1:5174/dashboard` (DEV), no a QA: Extrusión, Almacén, Laminado y Corte. No había una sesión de Telares visible en esa inspección y no se efectuaron operaciones en esas ventanas.

Se prepararon seis procesos Chrome visibles con perfiles persistentes independientes para Almacén, Extrusión, Telares, Laminado, Corte y Globo, bajo `tmp/traceflow-qa-profiles-20261127/`. Cada perfil usa un puerto CDP distinto (56001–56006) ligado a loopback y su única página fue comprobada en `http://127.0.0.1:5176/login?qa_context=<área>`. Las seis páginas siguen en login; no se capturaron credenciales ni se autenticó un usuario. El acceso manual requerido es: `admin_alm`, `SUPREL`, `sup_tel_1150`, `SUPLAM`, `QACOR` y `SUPGLO`, respectivamente. No se requiere abrir un perfil de producción para Lainer mientras QA no tenga cuenta/área Lainer identificada; Lainer no se equipara automáticamente a Globo bajo QR-First V2.0.

Esta comprobación no realizó escrituras. Mantener sesiones antiguas en 5174 sin acciones y completar la autenticación en los seis perfiles nuevos de 5176 antes de continuar con operaciones QA.
