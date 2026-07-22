# ADR-001: Adopción de Shadcn UI y TailwindCSS

**Estado:** Aprobado (Sprint A)
**Fecha:** 2026-07-19

## Contexto y Motivación
El frontend padecía de una severa deuda técnica visual, incluyendo el uso de clases globales, múltiples sistemas de estilo compitiendo (`globals.css` vs `Tailwind`) y colores hardcodeados. Se necesitaba una base escalable y consistente para soportar la expansión del ERP a múltiples módulos (Almacén, Producción, QR, etc.).

## Decisión
Adoptamos **Shadcn UI** como nuestro único ecosistema de componentes UI, sustentado por **TailwindCSS v4** y un sistema de variables de tokens semánticos (Light/Dark Mode).

## Consecuencias
- **Positivas:** 
  - Control total sobre el código fuente del componente (no es una dependencia cerrada).
  - Integración nativa con variables CSS de Tailwind.
  - Accesibilidad integrada (Radix UI bajo el capó).
- **Negativas / Riesgos:**
  - Requiere disciplina estricta de no fragmentar los componentes base.
  - La instalación es bajo demanda (no todo a la vez), lo cual requiere atención durante nuevos requerimientos.
