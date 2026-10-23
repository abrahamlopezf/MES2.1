'use strict';

const {
  sequelize,
  Material,
  MaterialType,
  MaterialFamily,
  MaterialBrand,
  Location,
  Subarea,
  Area,
  Formula,
  FormulaIngredient,
  ProcessFormula,
  ProcessFormulaItem,
} = require('../database/models');

const RAW_MATERIALS_TO_ENSURE = [
  {
    name: 'POLIPROPILENO (A)',
    description: 'Resina Polipropileno Tipo A (Laminación / Rafia)',
    internal_code: 'MP-POL-007',
    code_id: 8708,
  },
  {
    name: 'POLIPROPILENO (B)',
    description: 'Resina Polipropileno Tipo B de alta densidad (PROHIBIDO EN EXTRUSORA 4)',
    internal_code: 'MP-POL-008',
    code_id: 8708,
  },
  {
    name: 'POLIPROPILENO (C)',
    description: 'Resina Polipropileno Tipo C (Sujeto a disponibilidad / Almacén Unidad Externa)',
    internal_code: 'MP-POL-009',
    code_id: 8708,
  },
  {
    name: 'POLIETILENO 808AA',
    description: 'Polietileno Baja Densidad (PEBD A / Laminado F 7)',
    internal_code: 'MP-PE-808AA',
    code_id: 806,
  },
  {
    name: 'CARBONATO DE CALCIO',
    description: 'Carbonato de Calcio (PE con Carga)',
    internal_code: 'MP-CARB-001',
    code_id: 8703,
  },
  {
    name: 'CONCENTRADO UVPP20',
    description: 'Concentrado Aditivo Anti-UV UVPP20',
    internal_code: 'MP-UV-PP20',
    code_id: 8704,
  },
  {
    name: 'CONCENTRADO AE-18',
    description: 'Concentrado Antiestático AE-18',
    internal_code: 'MP-ANTI-AE18',
    code_id: 8706,
  },
  {
    name: 'MASTERBATCH BLANCO',
    description: 'Pigmento Masterbatch Blanco RPMB-4204',
    internal_code: 'MP-MB-BLANCO',
    code_id: 792,
  },
  {
    name: 'MASTERBATCH NEGRO',
    description: 'Pigmento Masterbatch Negro MBNEPE-4020 / 40-20',
    internal_code: 'MP-MB-NEGRO',
    code_id: 799,
  },
  {
    name: 'MASTERBATCH AZUL',
    description: 'Pigmento Masterbatch Azul MBPEAZ-91135',
    internal_code: 'MP-MB-AZUL',
    code_id: 800,
  },
  {
    name: 'MASTERBATCH ROJO',
    description: 'Pigmento Masterbatch Rojo MBPERO-118398 / LyondellBasell',
    internal_code: 'MP-MB-ROJO',
    code_id: 802,
  },
  {
    name: 'MASTERBATCH NARANJA',
    description: 'Pigmento Masterbatch Naranja MBPENA-114059',
    internal_code: 'MP-MB-NARANJA',
    code_id: 801,
  },
  {
    name: 'MASTERBATCH AMARILLO HUEVO',
    description: 'Pigmento Masterbatch Amarillo Huevo MBPEAM-96382',
    internal_code: 'MP-MB-AMAR-HUEVO',
    code_id: 804,
  },
  {
    name: 'MASTERBATCH AMARILLO-VERDE',
    description: 'Pigmento Masterbatch Amarillo-Verde MBPEAM-113896',
    internal_code: 'MP-MB-AMAR-VERDE',
    code_id: 803,
  },
  {
    name: 'MASTERBATCH VERDE',
    description: 'Pigmento Masterbatch Verde para Rafia',
    internal_code: 'MP-MB-VERDE',
    code_id: 800,
  },
  {
    name: 'MASTERBATCH MORADO',
    description: 'Pigmento Masterbatch Morado para Rafia',
    internal_code: 'MP-MB-MORADO',
    code_id: 800,
  },
  {
    name: 'MASTERBATCH VERDE OPTICO',
    description: 'Pigmento Masterbatch Verde Óptico para Rafia',
    internal_code: 'MP-MB-VERDE-OPT',
    code_id: 800,
  },
  {
    name: 'MASTERBATCH AMARILLO',
    description: 'Pigmento Masterbatch Amarillo Estándar',
    internal_code: 'MP-MB-AMARILLO',
    code_id: 804,
  },
];

const FORMULAS_DATA = [
  {
    code: 'F-EXT-LIQ-ROJO',
    name: 'MEZCLA COLOR ROJO (LIQUITANK)',
    description: 'Fórmula exclusiva Liquitank Rojo 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.12, is_restricted: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'MASTERBATCH ROJO', quantity: 5.2, percentage: 1.04, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-LIQ-NEGRO',
    name: 'MEZCLA COLOR NEGRO (LIQUITANK)',
    description: 'Fórmula exclusiva Liquitank Negro 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.12, is_restricted: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'MASTERBATCH NEGRO', quantity: 5.2, percentage: 1.04, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-BLANCO',
    name: 'BLANCO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Blanco 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 335.6, percentage: 67.12, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'MASTERBATCH BLANCO', quantity: 6.0, percentage: 1.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-VERDE',
    name: 'VERDE - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Verde 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 340.8, percentage: 68.16, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH VERDE', quantity: 3.0, percentage: 0.60, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-AZUL',
    name: 'AZUL - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Azul 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 339.8, percentage: 67.96, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH AZUL', quantity: 4.0, percentage: 0.80, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-ROJO',
    name: 'ROJO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Rojo 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 339.6, percentage: 67.92, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH ROJO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-AMARILLO',
    name: 'AMARILLO HUEVO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Amarillo Huevo 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 337.8, percentage: 67.56, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH AMARILLO HUEVO', quantity: 6.0, percentage: 1.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-NARANJA',
    name: 'NARANJA - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Naranja 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 340.0, percentage: 68.00, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH NARANJA', quantity: 3.8, percentage: 0.76, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-NEGRO',
    name: 'NEGRO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Negro 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 334.8, percentage: 66.96, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'MASTERBATCH NEGRO', quantity: 11.0, percentage: 2.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-NATURAL',
    name: 'NATURAL ANTIESTÁTICO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Natural Antiestático 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 334.8, percentage: 66.96, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-1-AMARILLO-ANTI',
    name: 'AMARILLO ANTIESTÁTICO - RAFIA PARA CINTURÓN',
    description: 'Extrusora 1 - Rafia para cinturón Amarillo Antiestático 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 335.0, percentage: 67.00, is_restricted: false },
      { name: 'POLIETILENO 808AA', quantity: 50.0, percentage: 10.00, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.20, is_restricted: false },
      { name: 'MASTERBATCH AMARILLO HUEVO', quantity: 1.0, percentage: 0.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 3.0, percentage: 0.60, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-2-BLANCA',
    name: 'MEZCLA BLANCA EXTRUSORA 2',
    description: 'Extrusora 2 - Mezcla Blanca 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 385.6, percentage: 77.12, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'MASTERBATCH BLANCO', quantity: 6.0, percentage: 1.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-4-BLANCA',
    name: 'MEZCLA BLANCA EXTRUSORA 4',
    description: 'Extrusora 4 - Mezcla Blanca SIN Polipropileno B (Autorizada en Ext 4) 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 485.6, percentage: 97.12, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'MASTERBATCH BLANCO', quantity: 6.0, percentage: 1.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-5-BLANCA',
    name: 'MEZCLA BLANCA EXTRUSORA 5',
    description: 'Extrusora 5 - Mezcla Blanca 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 385.6, percentage: 77.12, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'MASTERBATCH BLANCO', quantity: 6.0, percentage: 1.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-AZUL',
    name: 'MEZCLA COLOR AZUL',
    description: 'Extrusión - Mezcla Color Azul 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 490.0, percentage: 98.00, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH AZUL', quantity: 3.8, percentage: 0.76, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-VERDE',
    name: 'MEZCLA COLOR VERDE',
    description: 'Extrusión - Mezcla Color Verde 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 492.8, percentage: 98.56, is_restricted: false },
      { name: 'MASTERBATCH VERDE', quantity: 3.0, percentage: 0.60, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-MORADO',
    name: 'MEZCLA COLOR MORADO',
    description: 'Extrusión - Mezcla Color Morado 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 492.3, percentage: 98.46, is_restricted: false },
      { name: 'MASTERBATCH MORADO', quantity: 3.5, percentage: 0.70, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-ROJO',
    name: 'MEZCLA COLOR ROJO',
    description: 'Extrusión - Mezcla Color Rojo 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 491.6, percentage: 98.32, is_restricted: false },
      { name: 'MASTERBATCH ROJO', quantity: 4.2, percentage: 0.84, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-NEGRO',
    name: 'MEZCLA COLOR NEGRO',
    description: 'Extrusión - Mezcla Color Negro 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 382.8, percentage: 76.56, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH NEGRO', quantity: 11.0, percentage: 2.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-VERDE-OPT',
    name: 'MEZCLA COLOR VERDE ÓPTICO',
    description: 'Extrusión - Mezcla Color Verde Óptico 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 5],
    restricted_extruders: [4],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 384.8, percentage: 76.96, is_restricted: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.00, is_restricted: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, is_restricted: false },
      { name: 'MASTERBATCH VERDE OPTICO', quantity: 4.0, percentage: 0.80, is_restricted: false },
      { name: 'MASTERBATCH AMARILLO', quantity: 5.0, percentage: 1.00, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-AMARILLO-ANTI',
    name: 'MEZCLA AMARILLO ANTIESTÁTICO',
    description: 'Extrusión - Mezcla Amarillo Antiestático 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 484.0, percentage: 96.80, is_restricted: false },
      { name: 'CARBONATO DE CALCIO', quantity: 1.0, percentage: 0.20, is_restricted: false },
      { name: 'MASTERBATCH AMARILLO HUEVO', quantity: 1.0, percentage: 0.20, is_restricted: false },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.20, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 3.0, percentage: 0.60, is_restricted: false },
    ],
  },
  {
    code: 'F-EXT-NATURAL',
    name: 'MEZCLA CINTA COLOR NATURAL',
    description: 'Extrusión - Mezcla Cinta Color Natural 500kg',
    batch_size_kg: 500.00,
    expected_yield_pieces: 4900.00,
    expected_yield_kg: 485.00,
    allowed_extruders: [1, 3, 4, 5],
    restricted_extruders: [],
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 495.8, percentage: 99.16, is_restricted: false },
      { name: 'CONCENTRADO UVPP20', quantity: 4.2, percentage: 0.84, is_restricted: false },
    ],
  },
];

async function seedFormulasAndMaterials() {
  console.log('🚀 Iniciando actualización integral de Fórmulas y Catálogo de Almacén...');

  const t = await sequelize.transaction();

  try {
    // 1. Asegurar Subáreas para los 2 Almacenes
    const [subPpal] = await sequelize.query(`
      INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
      VALUES (1, 'Almacén Principal (Planta)', 'ALM_PPAL', true, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, { transaction: t });

    const [subExt2] = await sequelize.query(`
      INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
      VALUES (1, 'Almacén 2 (Otra Unidad de Negocio)', 'ALM_EXT2', true, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, { transaction: t });

    console.log('✅ Subáreas de los 2 almacenes verificadas.');

    // 2. Asegurar Ubicación para Almacén 2 en material_locations
    await sequelize.query(`
      INSERT INTO material_locations (code, name, description, area_id, is_active, created_at, updated_at)
      VALUES ('ALM2-GENERAL', 'Almacén 2 - Unidad Externa', 'Ubicación de materiales pertenecientes a la 2da unidad de negocio', 1, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `, { transaction: t });

    const [locAlm2] = await sequelize.query(`
      SELECT id FROM material_locations WHERE code = 'ALM2-GENERAL' LIMIT 1;
    `, { transaction: t });
    const alm2LocationId = locAlm2[0]?.id || 1;

    console.log(`✅ Ubicación de Almacén 2 asignada: ID ${alm2LocationId}`);

    // 3. Renombrar material 1227 a 'POLIPROPILENO (A)' para que coincida exactamente con las fórmulas
    await sequelize.query(`
      UPDATE materials
      SET name = 'POLIPROPILENO (A)', description = 'Resina Polipropileno Tipo A (Laminación / Rafia)'
      WHERE id = 1227;
    `, { transaction: t });

    // 4. Crear/Asegurar las Materias Primas en Almacén
    const materialMap = {};

    for (const raw of RAW_MATERIALS_TO_ENSURE) {
      let [existing] = await sequelize.query(`
        SELECT id, name FROM materials 
        WHERE (name ILIKE '${raw.name}' OR internal_code = '${raw.internal_code}') 
          AND deleted_at IS NULL 
        LIMIT 1;
      `, { transaction: t });

      let matId;
      if (existing && existing.length > 0) {
        matId = existing[0].id;
      } else {
        const [maxConsec] = await sequelize.query(`
          SELECT COALESCE(MAX(CASE WHEN internal_consecutive ~ '^[0-9]+$' THEN CAST(internal_consecutive AS INTEGER) ELSE 0 END), 0) AS max_c
          FROM materials
          WHERE family_id = 43 AND material_code_id = ${raw.code_id};
        `, { transaction: t });
        const nextConsec = String((maxConsec[0]?.max_c || 0) + 1).padStart(3, '0');

        const [inserted] = await sequelize.query(`
          INSERT INTO materials (
            family_id, material_code_id, internal_consecutive, internal_code,
            name, description, brand_id, type_id, default_location_id,
            status, is_active, created_at, updated_at, version
          ) VALUES (
            43, ${raw.code_id}, '${nextConsec}', '${raw.internal_code}',
            '${raw.name}', '${raw.description}', 34, 4120, ${alm2LocationId},
            'ACTIVE', true, NOW(), NOW(), 1
          ) RETURNING id;
        `, { transaction: t });
        matId = inserted[0].id;
        console.log(`  ➕ Material creado: ${raw.name} (ID: ${matId}, Consec: ${nextConsec})`);
      }
      materialMap[raw.name] = matId;
    }

    console.log('✅ Catálogo de materias primas asegurado:', Object.keys(materialMap).length, 'materiales.');

    // 5. Poblar 'formulas' y 'formula_ingredients'
    for (const f of FORMULAS_DATA) {
      const allowedExt = JSON.stringify(f.allowed_extruders);
      const restrictedExt = JSON.stringify(f.restricted_extruders);

      const [upsertFormula] = await sequelize.query(`
        INSERT INTO formulas (
          code, name, description, batch_size_kg, expected_yield_pieces, expected_yield_kg,
          allowed_extruders, restricted_extruders, is_active, created_at, updated_at
        ) VALUES (
          '${f.code}', '${f.name}', '${f.description}', ${f.batch_size_kg}, ${f.expected_yield_pieces}, ${f.expected_yield_kg},
          '${allowedExt}', '${restrictedExt}', true, NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          batch_size_kg = EXCLUDED.batch_size_kg,
          expected_yield_pieces = EXCLUDED.expected_yield_pieces,
          expected_yield_kg = EXCLUDED.expected_yield_kg,
          allowed_extruders = EXCLUDED.allowed_extruders,
          restricted_extruders = EXCLUDED.restricted_extruders,
          is_active = true,
          updated_at = NOW()
        RETURNING id;
      `, { transaction: t });

      const formulaId = upsertFormula[0].id;

      // Borrar ingredientes previos
      await sequelize.query(`DELETE FROM formula_ingredients WHERE formula_id = ${formulaId};`, { transaction: t });

      // Insertar ingredientes nuevos
      for (const ing of f.ingredients) {
        const matId = materialMap[ing.name];
        if (!matId) {
          throw new Error(`Material no encontrado en mapa: ${ing.name}`);
        }

        const isRestr4 = ing.is_restricted ? 'true' : 'false';
        const restrMach = ing.is_restricted ? '[4]' : '[]';

        await sequelize.query(`
          INSERT INTO formula_ingredients (
            formula_id, material_id, quantity, percentage, unit,
            is_restricted_on_machine_4, restricted_machine_ids, created_at, updated_at
          ) VALUES (
            ${formulaId}, ${matId}, ${ing.quantity}, ${ing.percentage}, 'KG',
            ${isRestr4}, '${restrMach}', NOW(), NOW()
          );
        `, { transaction: t });
      }

      // 6. Sincronizar en 'process_formulas' y 'process_formula_items'
      const [upsertProcFormula] = await sequelize.query(`
        INSERT INTO process_formulas (
          code, name, target_area_id, description, status, is_active, version, created_at, updated_at
        ) VALUES (
          '${f.code}', '${f.name}', 2, '${f.description}', 'ACTIVA', true, 1, NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          target_area_id = 2,
          description = EXCLUDED.description,
          status = 'ACTIVA',
          is_active = true,
          updated_at = NOW()
        RETURNING id;
      `, { transaction: t });

      const procFormulaId = upsertProcFormula[0].id;

      // Borrar items previos
      await sequelize.query(`DELETE FROM process_formula_items WHERE formula_id = ${procFormulaId};`, { transaction: t });

      let sortOrder = 1;
      for (const ing of f.ingredients) {
        const matId = materialMap[ing.name];
        await sequelize.query(`
          INSERT INTO process_formula_items (
            formula_id, material_id, material_role, calculation_type,
            quantity, percentage, unit, sort_order, is_required, created_at, updated_at
          ) VALUES (
            ${procFormulaId}, ${matId}, 'BASE', 'FIXED_QUANTITY',
            ${ing.quantity}, ${ing.percentage}, 'KG', ${sortOrder++}, true, NOW(), NOW()
          );
        `, { transaction: t });
      }
    }

    console.log(`✅ Las 22 recetas y 17 fórmulas han sido actualizadas perfectamente en 'formulas' y 'process_formulas'.`);

    await t.commit();
    console.log('🎉 Transacción completada con éxito.');
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error('❌ Error durante la actualización de fórmulas:', err);
    process.exit(1);
  }
}

seedFormulasAndMaterials();
