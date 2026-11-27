# Matriz de QA

## Pruebas de código ejecutadas (26 Nov 2026)

| Comando/actividad | Resultado | Alcance y límite |
|---|---|---|
| `npm run test:frontend` | 18 archivos, 65 pruebas aprobadas | Pruebas unitarias/integración frontend existentes más 3 pruebas de preferencia de tema; no es E2E de cada ruta. |
| `npm --prefix frontend run build` | Aprobado; 1,870 módulos transformados | Bundle de producción compila; advertencia por chunk JS grande persiste. |
| `npm --prefix frontend run lint` | Fallido: 112 errores y 11 advertencias | Línea base conocida; incluye módulos no modificados, y script cubre `.js/.jsx`, no todos los TS/TSX. No se afirma que el repo esté limpio. |
| `npm run security:check` | Aprobado; 1,373 archivos, 0 hallazgos | Ejecución final luego de crear los documentos de auditoría. |
| `npx eslint src/store/themeStore.js src/store/themeStore.test.js` | Aprobado | Ejecución focalizada en `frontend/` para el store de tema y sus pruebas. |
| Inspección navegador Edge, `/login` | 5 tamaños simulados sin overflow horizontal | No prueba rutas privadas, interacciones de teclado/modal ni hardware físico. |

## Matriz de producto

| Cobertura | Denominador | Ejecutado | % verificado |
|---|---:|---:|---:|
| Declaraciones `path` de router, flujo E2E visual | 76 | 1 pantalla pública (`/login`) | 1.3% por declaración; conteo conservador, no deduplicado |
| Módulos, auditoría completa | 27 | 0 completos | 0% |
| Archivos `.tsx/.jsx`, revisión componente a componente | 288 | 0 completos | 0% |
| Viewports probados | 5 | 5 en login | 100% de esta submatriz limitada |
| Roles autenticados, visual/funcional | Por determinar con catálogo de usuarios QA | 0 | N/D |
| Temas con recorrido visual | 3 modos globales | 0 recorridos visuales completos | 0% |

## Pruebas no ejecutadas

- No se completaron flujos de registro, baja, consumo, mezcla, escaneo, ingreso PTI, transferencia o cualquier operación con side effects.
- No se ejecutaron pruebas backend/integración ni comandos de DB; esta tarea no modificó backend, esquema ni datos.
- Pruebas de teclado virtual, cámara, orientación, navegadores/dispositivos físicos y modales autenticados pendientes.

No combinar las 65 pruebas de código con la cobertura visual para crear un porcentaje artificial.
