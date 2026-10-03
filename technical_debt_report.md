# Análisis de Deuda Técnica (End-to-End)

Se ha realizado una revisión automatizada de la base de código (Backend y Frontend) contrastándola contra las Reglas de Oro (Golden Rules) establecidas en tu `AGENTS.md`.

## 🚨 Violaciones a las "Golden Rules" (Arquitectura)

Se han detectado violaciones directas a los principios inquebrantables de la arquitectura:

### 1. Frontend Calculando (Violación a Reglas #2 y #6)
La regla estipula: *"Frontend NEVER calculates quantities (e.g. balance, yield, efficiency, scrap). El backend calcula, el frontend visualiza."*
Se detectaron los siguientes cálculos ilegales en el Frontend:

- `frontend/src/modules/production/presentation/pages/ProductionDashboard.jsx:75`
  ```javascript
  const scrapRatio = totalScrapAmount > 0 ? (totalScrapAmount / ((kpisOp?.production?.value || 0) + totalScrapAmount)) * 100 : 0;
  ```
  **Solución Requerida:** El endpoint del dashboard debe devolver `scrapRatio` ya calculado por el backend.

- `frontend/src/modules/production/presentation/components/MixingTerminalForm.tsx:208`
  ```javascript
  Total Mezcla: {inputs.reduce((acc, curr) => acc + curr.quantity, 0)} kg
  ```
- `frontend/src/modules/warehouse/presentation/components/ConsumoBottomSheet.container.tsx:161`
  ```javascript
  const totalQuantity = useMemo(() => items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0), [items]);
  ```

### 2. Deuda de Pruebas Automatizadas (Testing Debt)
- **Backend:** `package.json` **no tiene configurado un framework de pruebas** (Jest/Mocha). No hay pruebas unitarias para los casos de uso (Use Cases) ni para los Servicios de Dominio (Domain Services). El testing actualmente depende al 100% de scripts de simulación QA manuales (como el que acabamos de construir).
- **Frontend:** Aunque existe configuración para `vitest` y existen pruebas para la capa `Runtime` e `Integration`, hay una carencia total de pruebas de renderizado o validación para los **componentes visuales** (Páginas, Dashboards y Formularios).

### 3. Tareas Pendientes (TODOs) Críticos
Existen **22 comentarios `// TODO:`** en el código esparcidos entre el backend y frontend que representan deuda técnica consciente introducida por desarrolladores anteriores:
- **Falta de Tipado estricto:** Hay llamadas API en `IdentityRepository.ts` tipadas como `Promise<any[]>` con el comentario `// TODO: Tipar DTO`.
- **Acoplamientos Circulares:** En `UsersPage.tsx` hay un comentario: `// TODO: Refactorizar a Shadcn UI Select en un PR futuro para evitar dependencias circulares`.
- **Integraciones Falsas:** En `scrap.listeners.js` del backend, se detectan hooks disparados al aire con el comentario `// TODO: Integración futura con el módulo Warehouse`.

---

## 🎯 Plan de Acción Recomendado
Si deseas priorizar la limpieza de esta deuda técnica antes de continuar agregando funcionalidades (como las fórmulas de extrusión), podemos abordarlo en el siguiente orden:

1. **(Crítico)** Trasladar los cálculos matemáticos de Yield, Scrap y Totales desde el React Dashboard hacia el controlador del backend.
2. **(Alta Prioridad)** Tipar los DTOs pendientes en TypeScript para evitar problemas de undefined en la interfaz.
3. **(Mantenibilidad)** Instalar Jest/Supertest en el backend y convertir nuestro `qa-warehouse-flow.js` en un suite formal de pruebas.

¿Te gustaría que empiece limpiando las **Violaciones de Arquitectura (Frontend Calculando)** para que el código quede 100% puro bajo tus reglas, o prefieres enfocarte primero en la lógica de extrusión y dejamos esta deuda documentada para después?
