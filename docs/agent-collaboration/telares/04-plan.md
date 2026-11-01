# 04 — Plan de Trabajo y Coordinación (Codex + Antigravity)

## 1. Estrategia de Ejecución
Para garantizar una versión estable, íntegra y verificable para las pruebas del cliente sin romper ningún flujo existente de Almacén, Extrusión ni Telares:

1. **Fase 0 y 1 (Completadas)**:
   - Reconocimiento no destructivo del repositorio, lectura de los 2 diagramas PDF del cliente (`FLUJO_EXT_2.pdf` y `FLUJO_TEJIDO_DE_BANDA.pdf`) y documentos técnicos (`ESPECIFICACIÓN DE TELA.pdf`, `TIPOS DE CINTA DE EXTRUSION.pdf`).
   - Auditoría completa de modelos, migraciones, servicios, controladores, rutas y pantallas de `telares`.
2. **Fase 2 (Completada)**:
   - Documentación de brechas y preguntas de negocio bajo `docs/agent-collaboration/telares/`.
3. **Fase 3 (Implementación Focalizada y Segura)**:
   - **Backend (`backend/src/modules/telares/`)**:
     - `telares.service.js`:
       - Ampliar `normalizeProductionRoute` para admitir los destinos reales de los Diagramas 1 y 2 (`LAMINADO`, `CORTE`, `LONAS`, `ALMACEN`, `VENTA`, `CONFECCION`, `GLOBO`), bloqueando `GLOBO` en `ROLLO_TELA` y bloqueando `GLOBO`/`LAMINADO` en `BANDA`/`CINTA`.
       - Sanitizar rutas heredadas en `startLoomRun` / `finishRollAndBackflush` si una ficha antigua de `ROLLO_TELA` tenía `GLOBO` en su `default_route`.
       - Validar en `saveBom` que las telas `PLANA` siempre tengan `tape_color = 'N/A'` (*"TODAS LAS TELAS PLANAS NO LLEVAN CINTA DE IDENTIFICACIÓN"*).
       - Implementar `finishLoomRun({ run_id, operator_id, notes })` para cerrar formalmente una corrida activa (`status = 'FINALIZADA'`, `finished_at = new Date()`) y devolver el telar a `DISPONIBLE` conservando su WIP en fileta.
       - Implementar `getRecentViajeroRolls(filters)` para consultar el historial reciente de rollos/bandas/cintillas producidos con su genealogía básica, operadores y supervisor.
     - `telares.controller.js` y `telares.routes.js`:
       - Exponer `POST /api/telares/runs/:id/finish` y `GET /api/telares/rolls`.
   - **Frontend (`frontend/src/modules/telares/`)**:
     - `services/telaresApi.ts` y `hooks/useTelaresQueries.ts`:
       - Conectar `finishLoomRun` y `getViajeroRolls` / `useViajeroRolls`.
     - `TelaresTerminalPage.tsx`:
       - Corregir detección de Telares Banda por nomenclatura/nombre de subárea (`TB` / `Banda`) además de `subarea_id === 7`.
       - Eliminar el aviso falso de descuento directo desde Rack Maestro cuando la fileta está vacía; guiar claramente al operador a **Cargar Fileta Creel**.
       - Filtrar los racks mostrados en el modal de **Cargar Fileta Creel** según la subárea del telar (`TR` vs `TB`) y `current_pti_product_id`.
       - Actualizar los botones de destino de ruta según el tipo de producto (`ROLLO_TELA`: Laminado → Corte, Corte Directo, Lonas, Venta, Almacén; `BANDA` / `CINTA`: Corte, Almacén, Venta).
       - Incorporar botón **"Finalizar Corrida / Cambiar Receta"** en el encabezado de corrida activa.
       - Incorporar panel **"Salidas / Rollos Recientes del Telar"** con reimpresión inmediata de etiqueta QR Viajero.
     - `TelaresCatalogPage.tsx`:
       - Corregir autocompletado de colores de cinta de identificación según Página 1 del PDF (`6.0 y 6.5 oz Tubular -> ROJO`, `7.2 y 8.0 oz Tubular -> AZUL`, `PLANA -> N/A`).
       - Actualizar selector de rutas por defecto para `ROLLO_TELA`, `BANDA` y `CINTA`.
     - `RoutingStationTerminalPage.tsx`:
       - Incluir estaciones `LONAS`, `ALMACEN` y `VENTA` para recepción de QRs viajeros.
     - `ViajeroTrackerPage.tsx`:
       - Mostrar listado de rollos/salidas recientes para consulta y reimpresión en 1 clic sin obligar a memorizar el código.
4. **Fase 4, 5 y 6 (Validación, Pruebas Automatizadas y Cierre)**:
   - Crear prueba automatizada `backend/test/telares.local.integration.test.js` verificando:
     - Reglas de especificación (`saveBom`: prohibición Denier 1800 en 6.5–8.0 oz, prohibición de cinta ID en tela `PLANA`, rutas válidas/inválidas para `ROLLO_TELA` y `BANDA`).
     - Flujo completo reversible en transacción: carga de fileta (`loadLoomCreel`) → inicio de corrida (`startLoomRun`) → cierre de rollo con backflush FIFO y código oficial (`finishRollAndBackflush`) → consulta de genealogía (`getViajeroDetails`) → cierre de corrida (`finishLoomRun`).
   - Ejecutar `node --test` en backend y `npm run build` en frontend.
   - Documentar resultados reales en `05-hallazgos.md`, `06-pruebas.md` y `07-handoff.md`.
