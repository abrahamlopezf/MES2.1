// No renderiza ni importa React, puramente descriptivo
import { ReceptionWorkflow } from './ReceptionWorkflow';

export const ReceptionManifest = {
  capability: {
    id: "reception",
    purpose: "RECEPTION",
    version: "1.0.0",
    displayName: "Recepción de Material",
    icon: "PackagePlus",
    permissions: ["reception.execute"]
  },

  runtime: {
    offline: true,
    telemetry: true,
    supportsScanner: true,
    supportsManualInput: true,
    supportsTablet: true,
    supportsDesktop: false
  },

  workspace: {
    // Para evitar carga síncrona innecesaria, se puede inyectar el componente en el índice del módulo.
    // Aquí declaramos el flujo de estados.
    workflow: ReceptionWorkflow
  }
};
