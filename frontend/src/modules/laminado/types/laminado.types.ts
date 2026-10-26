export interface LaminadoSpecificationMaterial {
  id?: number;
  laminado_spec_id?: number;
  material_id: number;
  quantity: number;
  unit: string;
  notes?: string;
  material?: {
    id: number;
    internal_code: string;
    name: string;
    status: string;
  };
}

export interface LaminadoLoomRollRequirements {
  allowed_bom_ids: number[];
  accepts_from_globo: boolean;
  min_width_cm?: number;
  max_width_cm?: number;
  fabric_type: 'TUBULAR' | 'PLANA' | 'CUALQUIERA';
  meters_per_output: number;
  notes?: string;
}

export interface LaminadoSpecification {
  id: number;
  code: string;
  name: string;
  description?: string;
  lamination_type: 'EXTRUSION_COATING' | 'MONOCAPA' | 'BICAPA' | 'BOPP_FILM' | 'PAPEL_KRAFT';
  target_width_cm: number;
  coating_grammage_g_per_m2: number;
  output_product_name: string;
  expected_output_quantity: number;
  expected_output_unit: string;
  standard_output_meters?: number;
  standard_waste_percentage: number;
  cost_transformation_index?: number;
  loom_roll_requirements: LaminadoLoomRollRequirements;
  is_active: boolean;
  materials?: LaminadoSpecificationMaterial[];
  allowed_boms?: Array<{
    id: number;
    code: string;
    name: string;
    target_width_cm: number;
    target_weight_g_per_m: number;
    output_product_name: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface LaminadoWipRoll {
  id: number;
  roll_code: string;
  qr_code: string;
  loom?: { id: number; code: string; name: string } | null;
  bom?: { id: number; code: string; name: string } | null;
  meters: number;
  weight_kg: number;
  width_cm: number;
  grammage_g_per_m: number;
  current_stage: string;
  next_allowed_stage: string;
  route: string[];
  status: string;
  operator: string;
  created_at: string;
}

export interface LaminadoWarehouseWipMaterial {
  id: number;
  material_id: number;
  internal_code: string;
  name: string;
  folio_lote: string;
  qr_code: string;
  amount_kg: number;
  unit_cost_mxn?: number;
  total_cost_mxn?: number;
  received_at: string;
}

export interface LaminadoRecentTransformed {
  id: number;
  roll_code: string;
  qr_code: string;
  bom_name: string;
  meters_out: number;
  weight_out_kg: number;
  operator: string;
  notes?: string;
  finished_at: string;
}

export interface LaminadoWipSummary {
  macro: {
    total_rolls_in_floor: number;
    total_rolls_incoming: number;
    total_meters_in_floor: number;
    total_weight_fabric_kg: number;
    total_warehouse_materials_kg: number;
    total_valuation_mxn: number | null;
  };
  rolls_in_floor: LaminadoWipRoll[];
  rolls_incoming: LaminadoWipRoll[];
  warehouse_materials: LaminadoWarehouseWipMaterial[];
  recent_transformed: LaminadoRecentTransformed[];
  specifications: LaminadoSpecification[];
}
