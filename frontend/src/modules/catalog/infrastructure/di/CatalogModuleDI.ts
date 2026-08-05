// Mock temporal de catalogFacade para evitar errores de compilación
// ya que el módulo original fue removido durante la reestructuración

export const catalogFacade = {
  getAllProcessDefinitions: async () => {
    return [
      { id: 'F-001', name: 'Fórmula Base PE', type: 'MIX_FORMULA', ingredients: [{ materialId: 'MAT-PE-HD' }] }
    ];
  },
  
  getAllStations: async () => {
    return [
      { id: 'ST-MIX-01', name: 'Mezcladora 01', machineType: 'MIXER', areaId: 'AREA-01', capabilities: ['MIXING'], machines: [] },
      { id: 'ST-EXT-01', name: 'Extrusora 01', machineType: 'EXTRUDER', areaId: 'AREA-02', capabilities: ['EXTRUSION'], machines: [] }
    ];
  }
};
