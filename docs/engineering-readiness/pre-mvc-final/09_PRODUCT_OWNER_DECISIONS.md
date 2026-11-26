# 09 — CONTRATOS FUNCIONALES PENDIENTES Y PREGUNTAS CONCRETAS PARA PRODUCT OWNER (FASE I)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Referencia Previa:** [`../closure-audit/11_BUSINESS_RULES_DECISIONS.md`](../closure-audit/11_BUSINESS_RULES_DECISIONS.md) y [`../../qa/BUSINESS_RULES_PENDING.md`](../../qa/BUSINESS_RULES_PENDING.md)

> [!IMPORTANT]
> **Garantía de No Intervención (Fase I):** Ni el código funcional ni las pruebas asociadas a estos 4 casos fueron modificados. A continuación se delimita estrictamente qué está confirmado por documentación previa del cliente, qué corresponde a una implementación técnica en progreso en el árbol de trabajo y qué decisión concreta con ejemplo industrial debe tomar Producto antes de refactorizar esos módulos específicos.

---

## 1. Matriz de Delimitación: Confirmado por Cliente vs. Implementación Técnica vs. Decisión Pendiente

| Caso / ID | Lo que está Confirmado en Documentación Histórica | Lo que corresponde a Implementación Técnica / Hipótesis en el Código Actual | Lo que sigue siendo una Decisión Pendiente del Product Owner |
| :--- | :--- | :--- | :--- |
| **1. `QA-TEL-ROUTE-001` (Rutas de Salida de Telares hacia Globo/Liner)** | - **Confirmado (`Diagrama 2`):** Los productos de Tejido de **Banda y Cintilla** (`BANDA`, `CINTA`) jamás pasan por Globo ni Laminado; van directo a Corte, Almacén o Venta.<br>- **Documento inicial (`REQ-06` en `docs/agent-collaboration/telares/02-requisitos.md`):** Indicaba originalmente bloquear `GLOBO` en toda salida de Telares (`GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`).<br>- **Aclaración posterior (`15_CONTINUACION_BLINDAJE...` línea 19):** El usuario indicó que *algunos* rollos de tela sí pueden ir a Globo antes de Corte, pero aún no se ha cerrado la lista de fichas elegibles. | En `backend/src/modules/telares/productionRules.js` (líneas 32–52):<br>1. `normalizeProductionRoute` fue modificado para permitir la cola `['GLOBO', 'CORTE']` en **cualquier** salida de tipo `ROLLO_TELA`.<br>2. Para `BANDA` y `CINTA`, lanza el código `INVALID_BANDA_CINTA_ROUTE` (mientras el test `telares.rules.test.js:33` sigue esperando el código antiguo `GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`). | 1. Definir si la ruta `TELARES -> GLOBO -> CORTE` aplica a **todo** `ROLLO_TELA` o únicamente a un subconjunto de fichas (`production_boms`) / especificaciones.<br>2. Confirmar el código de error oficial para rutas inválidas de Banda/Cintilla (`INVALID_BANDA_CINTA_ROUTE` vs `GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`). |
| **2. `QA-ODC-PACK-001` (Surtido FIFO por Empaque Cerrado vs. Equivalencia de Materiales)** | - **Confirmado:** Almacén entrega materia prima en presentaciones cerradas (bultos/sacos de `10 kg`, `25 kg`, etc.) y el excedente respecto a la cantidad solicitada en la ODC debe registrarse automáticamente en el inventario WIP del área productiva.<br>- **Confirmado:** Existe una tabla de equivalencias (`material_tags` / `materialEquivalence.js`) que permite surtir materiales funcionalmente equivalentes en orden FIFO. | En `backend/src/modules/warehouse/consumptionPackageAllocator.js` (líneas 21–30):<br>Si el lote más antiguo en la cola FIFO (incluyendo materiales equivalentes como `MAS-001` frente a `MP-MAS-008`) tiene `presentation_quantity = null` o `0`, el código asume que ese lote se puede fraccionar a granel (`allocatedQuantity = Math.min(available, remainingDemand)`) y despacha `1 kg` exacto sin redondeo por costal ni excedente a WIP. | Definir cómo debe comportarse el surtido FIFO cuando el material solicitado exige empaque cerrado (`10 kg`), pero en la base de datos existen lotes antiguos de un material equivalente sin `presentation_quantity` capturada. |
| **3. Transferencia Corte-Laminado y Estados `PICKED` / `RECEIVED_BY_CUT` (`corteLaminadoFlow:71`)** | - **Confirmado:** Corte solicita rollos crudos para que pasen por Laminado (o Globo) antes de ser cortados; Laminado no puede tomar un rollo sin orden de Corte y confirmación de recogida física con QR (`CORTE_ORDER_PICKUP_REQUIRED`). | En `backend/src/modules/corte/corte.service.js`, la migración `20261124130000-...` y `LaminadoCutTransferPanel.tsx`:<br>Se implementó un cierre de ciclo donde, tras laminar el rollo, Laminado lo despacha de regreso a Corte (`AWAITING_DISPATCH` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `RECEIVED_BY_CUT`). Para que la orden siga visible durante ese trayecto, `CorteService.listOrders()` mantiene incluido el estado `'PICKED'`, lo cual hace fallar la aserción antigua de `corteLaminadoFlow.local.integration.test.js:71` que esperaba que al pasar a `'PICKED'` la orden desapareciera de `listOrders()`. | Confirmar si el endpoint de órdenes pendientes (`CorteService.listOrders()`) debe seguir incluyendo órdenes en estado `PICKED` hasta que alcancen `RECEIVED_BY_CUT` / `COMPLETED`, o si debe separarse la consulta de "Recogida Inicial Pendiente" de la de "Retorno a Corte Pendiente". |
| **4. Recepción Temprana / Tolerancia de Relevo de Turno en Extrusión (`shiftPolicy.js`)** | - **Confirmado:** El relevo de turno digital conserva las mezclas activas en máquina (`EXT-02`, `EXT-04`) y transfiere la custodia al supervisor entrante sin exigir re-pesaje de tolva activa. | En `backend/src/modules/extrusion/services/shiftPolicy.js`:<br>`isShiftStartReached` bloquea estrictamente recibir el turno entrante antes del minuto exacto de inicio programado (ej. `14:00` o `22:00` hora CDMX), sin ventana de tolerancia previa. | Confirmar si en planta los supervisores entrantes pueden recibir el relevo unos minutos antes del cambio de hora (ej. 15–30 min de traslape) o si la restricción estricta a la hora en punto es la regla definitiva. |

---

## 2. Preguntas Concretas para el Product Owner (con Ejemplos Industriales)

### Pregunta 1 — Elegibilidad de Rollos de Telares hacia Globo (`QA-TEL-ROUTE-001`)
- **Escenario Industrial:** Un supervisor en Telares da de alta o selecciona una ficha técnica (`BOM`) para tejer un **Rollo de Tela Circular (`ROLLO_TELA`)** y elige como ruta operativa `TELARES -> GLOBO -> CORTE` (para que al rollo tejido se le inserte el liner/globo antes de pasar a la máquina de corte).
- **Pregunta para Producto:**
  1. ¿Cualquier ficha de tipo `ROLLO_TELA` puede elegir la ruta `TELARES -> GLOBO -> CORTE`, o solo ciertas fichas/códigos PTI específicos tienen permitido ir a Globo? (Si es solo un subconjunto, ¿qué atributo de la ficha o lista de códigos lo determina?).
  2. Para los productos de **Banda y Cintilla** (`BANDA` / `CINTA`), el sistema ya bloquea `GLOBO` y `LAMINADO` devolviendo el código `INVALID_BANDA_CINTA_ROUTE`: ¿autoriza actualizar el test unitario antiguo para que valide ese código de error en lugar de `GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`?

### Pregunta 2 — Regla de Empaque Cerrado en Lotes Equivalentes Antiguos (`QA-ODC-PACK-001`)
- **Escenario Industrial (Caso Real Reproducido en `ORD-202611-036`):**
  - El área de Globo solicita en una ODC **`1 kg`** de Masterbatch Blanco `MP-MAS-008` (cuya presentación es costal cerrado de **`10 kg`**).
  - La pantalla le informa al supervisor: *"Se surtirá 1 costal de 10 kg; se usarán 1 kg en la orden y quedarán 9 kg en tu WIP"*.
  - Al surtir en Almacén, el sistema busca por FIFO y encuentra primero un lote antiguo `LOT-MB-BCO-09006` del material equivalente `MAS-001` que fue dado de alta sin tamaño de costal (`presentation_quantity = null`). Como no tiene tamaño de costal, el sistema surte solo **`1 kg`** en lugar de **`10 kg`**, dejando al área sin los `9 kg` de WIP prometidos.
- **Pregunta para Producto:**
  - Cuando un lote antiguo en FIFO no tenga capturado su tamaño de empaque (`presentation_quantity = null`), ¿qué debe hacer el sistema al surtir una ODC?
    - **Opción A:** Aplicar el tamaño de empaque estándar del material solicitado en la ODC (`10 kg`), entregando el costal completo y enviando los `9 kg` restantes al WIP del área.
    - **Opción B:** Ignorar en el surtido por empaque los lotes que no tengan `presentation_quantity` configurada (o exigir regularizar ese dato en Almacén antes de surtirlos).

### Pregunta 3 — Visibilidad de Órdenes `PICKED` en el Flujo Corte $\leftrightarrow$ Laminado (`corteLaminadoFlow:71`)
- **Escenario Industrial:**
  - **Paso 1:** Corte crea una orden pidiendo 1 rollo de tela para que sea laminado y luego regrese a Corte.
  - **Paso 2:** El operador escanea y recoge el rollo crudo (`status = 'PICKED'`).
  - **Paso 3:** Laminado procesa el rollo, genera el rollo laminado y lo despacha de vuelta hacia Corte (`IN_TRANSIT`).
  - **Paso 4:** Corte confirma la recepción del rollo laminado (`RECEIVED_BY_CUT`).
- **Pregunta para Producto:**
  - Entre el **Paso 2 (`PICKED`)** y el **Paso 4 (`RECEIVED_BY_CUT`)**, ¿es correcto que la orden permanezca incluida en la consulta de órdenes activas/pendientes (`CorteService.listOrders()`) hasta que Corte reciba de vuelta el rollo laminado? *(De confirmarse que sí, la prueba automatizada `corteLaminadoFlow.local.integration.test.js` se actualizará para verificar que la orden sigue activa en el Paso 2 y solo se cierra tras el Paso 4).*

### Pregunta 4 — Ventana de Tolerancia para Recepción de Relevo de Turno en Extrusión
- **Escenario Industrial:** El Turno 2 de Extrusión está programado para iniciar a las `14:00 hrs`. El supervisor saliente del Turno 1 deja listo el relevo a las `13:50 hrs` y el supervisor entrante del Turno 2 ya está frente a la terminal a las `13:52 hrs` para recibir la custodia de las mezclas activas en las Extrusoras 2 y 4.
- **Pregunta para Producto:**
  - ¿Debe el sistema bloquear la recepción del turno hasta que el reloj marque exactamente las `14:00:00 hrs` (comportamiento actual), o debe permitir una ventana de anticipación (por ejemplo, hasta `15` o `30` minutos antes de la hora de inicio programada) siempre que el turno saliente ya haya marcado el relevo como listo para entrega?
