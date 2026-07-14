export const demoMaterials = [
  {
    code: "PP-001",
    name: "Polipropileno",
    quantity: 100,
    unit: "KG",
    location: "ALMACEN MP",
  },
  {
    code: "PE-001",
    name: "Polietileno",
    quantity: 50,
    unit: "KG",
    location: "ALMACEN MP",
  },
];

export const demoFormula = {
  code: "FORM-EXT-HILO-NEGRO-030",
  name: "Fórmula Hilo PP Negro 0.30 mm",
  components: [
    {
      material: "PP-001",
      quantity: 500,
      unit: "KG",
    },
    {
      material: "Pigmento negro",
      quantity: 12,
      unit: "KG",
    },
    {
      material: "Aditivo UV",
      quantity: 8,
      unit: "KG",
    },
  ],
};

export const demoRuns = [
  {
    code: "RUN-20260714-9JZ4",
    machine: "Extrusora 01",
    status: "EN_PROCESO",
    material: "MI-20260714-001",
    production: 120,
    scrap: 5,
  },
];

export const demoWaste = [
  {
    type: "GENERACION",
    quantity: 50,
    unit: "KG",
  },
  {
    type: "TRASLADO",
    quantity: 20,
    unit: "KG",
  },
  {
    type: "SALIDA_RECICLAJE",
    quantity: 10,
    unit: "KG",
  },
];
