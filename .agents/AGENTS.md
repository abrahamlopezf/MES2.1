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
