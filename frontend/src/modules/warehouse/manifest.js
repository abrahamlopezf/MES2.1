export const WarehouseManifest = {
  capability: {
    id: "warehouse",
    purpose: "WAREHOUSE_INQUIRY",
    version: "1.0.0",
    displayName: "Inventario",
    icon: "Boxes",
    permissions: ["warehouse.read"]
  },

  runtime: {
    offline: true,
    telemetry: true,
    supportsScanner: true,
    supportsManualInput: true,
    supportsTablet: true,
    supportsDesktop: true
  },

  workspace: {
    // No usa workflow FSM estricto ya que es una pantalla de consulta, 
    // pero se registra igual en el CapabilityRegistry
    workflow: null
  }
};
