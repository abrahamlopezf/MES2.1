export interface Loom {
  id: number;
  code: string;
  name: string;
  status: 'DISPONIBLE' | 'EN_PRODUCCION' | 'MANTENIMIENTO' | 'DETENIDO';
  active_warp_rack_id: number | null;
  active_weft_rack_id: number | null;
  current_bom_id: number | null;
  is_active: boolean;
  loom_number?: number | null;
  creel_capacity_spools: number;
  current_spools_count: number;
  current_wip_kg: number;
  total_rolls_produced: number;
  subarea_id?: number | null;
  subarea?: {
    id: number;
    name: string;
    nomenclature: string;
  } | null;
  model?: string;
  type?: string;
  rpm?: number;
  specifications?: string | null;
  supported_pti_types?: number[];
  supported_bom_ids?: number[];
  warpRack?: {
    id: number;
    rack_code: string;
    current_quantity: number;
    unit_weight_kg: number;
    currentPtiProduct?: {
      id: number;
      name: string;
      code: string;
    };
  } | null;
  weftRack?: {
    id: number;
    rack_code: string;
    current_quantity: number;
    unit_weight_kg: number;
    currentPtiProduct?: {
      id: number;
      name: string;
      code: string;
    };
  } | null;
  currentBom?: ProductionBom | null;
  runs?: LoomRun[];
}

export interface ProductionBomItem {
  id: number;
  bom_id: number;
  role: 'URDIMBRE' | 'TRAMA' | 'AMBOS' | 'REFUERZO';
  pti_product_id: number | null;
  material_id: number | null;
  ratio_percentage: number;
  consumption_g_per_m: number;
  required_quantity?: number | null;
  required_unit?: 'KG' | 'PIEZAS';
  notes?: string | null;
  ptiProduct?: {
    id: number;
    name: string;
    code: string;
    denier?: number;
    tape_type?: string;
    color?: string;
    unit_price?: number;
  } | null;
}

export interface ProductionBom {
  id: number;
  code: string;
  name: string;
  description?: string;
  target_width_cm: number;
  target_weight_g_per_m: number;
  warp_density?: string;
  weft_density?: string;
  output_product_name: string;
  subarea_id?: number | null;
  subarea?: { id: number; name: string; nomenclature: string } | null;
  product_kind?: 'ROLLO_TELA' | 'BANDA' | 'CINTA';
  output_color?: string | null;
  output_width_value?: number | null;
  output_width_unit?: string;
  output_denier?: number | null;
  tensile_strength_lb?: number | null;
  units_per_pallet?: number | null;
  packaging_type?: string | null;
  output_weight_kg?: number | null;
  is_provisional?: boolean;
  expected_output_quantity?: number;
  expected_output_unit?: string;
  standard_output_meters?: number | null;
  default_route: string[];
  ounces_yd2?: number | null;
  fabric_type: 'TUBULAR' | 'PLANA';
  tape_color: string;
  tape_denier?: number;
  tape_width_mm?: number;
  weft_denier?: string;
  warp_denier?: string;
  cost_transformation_index: number;
  general_considerations?: string;
  is_active: boolean;
  items?: ProductionBomItem[];
}

export interface LoomRun {
  id: number;
  folio: string;
  loom_id: number;
  bom_id: number;
  operator_id?: number | null;
  shift: string;
  status: 'EN_PROCESO' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA';
  warp_rack_id: number | null;
  weft_rack_id: number | null;
  meters_planned: number;
  weight_planned_kg?: number | null;
  meters_produced: number;
  total_weight_produced_kg: number;
  total_pti_consumed_kg: number;
  rolls_produced_count: number;
  started_at: string;
  ended_at?: string | null;
  notes?: string;
  loom?: Loom;
  bom?: ProductionBom;
  operator?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    numero_nomina?: string;
  };
}

export interface ViajeroRoll {
  id: number;
  qr_code: string;
  roll_code: string;
  run_id: number;
  loom_id: number;
  bom_id: number;
  product_kind?: 'ROLLO_TELA' | 'BANDA' | 'CINTA';
  output_product_name?: string | null;
  output_color?: string | null;
  output_width_value?: number | null;
  output_width_unit?: string | null;
  output_denier?: number | null;
  tensile_strength_lb?: number | null;
  units_per_pallet?: number | null;
  packaging_type?: string | null;
  operator_id?: number;
  shift_supervisor_id?: number | null;
  meters: number;
  weight_kg: number;
  width_cm: number;
  grammage_g_per_m: number;
  route: string[];
  current_stage: string;
  next_allowed_stage: string;
  loom_number?: number;
  shift_number?: number;
  roll_sequence?: number;
  operator_nomina?: string;
  cost_transformation_index?: number;
  calculated_roll_cost?: number;
  ounces_yd2?: number;
  fabric_type?: string;
  tape_color?: string;
  stages_history: Array<{
    stage: string;
    action: string;
    loom_code?: string;
    loom_number?: number;
    shift_number?: number;
    roll_sequence?: number;
    operator_nomina?: string;
    meters?: number;
    weight_kg?: number;
    calculated_roll_cost?: number;
    cost_transformation_index?: number;
    timestamp: string;
    operator_id?: number;
    notes?: string;
  }>;
  status: 'DISPONIBLE' | 'EN_PROCESO' | 'TRANSFORMADO' | 'RECHAZADO';
  is_active: boolean;
  created_at: string;
  loom?: Loom;
  bom?: ProductionBom;
  operator?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    numero_nomina?: string;
  };
  shiftSupervisor?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    numero_nomina?: string;
  } | null;
  operatorSegments?: Array<{
    id: number;
    operator_id: number;
    shift_number: number;
    meters_start: number;
    meters_end: number;
    weight_start_kg?: number | null;
    weight_end_kg?: number | null;
    notes?: string | null;
    operator?: {
      id: number;
      first_name: string;
      last_name: string;
      username: string;
      numero_nomina?: string;
    };
  }>;
  consumptions?: LoomBackflushConsumption[];
  routingLogs?: ViajeroRoutingLog[];
  cost_summary?: {
    total_roll_cost: number | null;
    cost_per_meter: number | null;
    cost_per_kg: number | null;
    cost_transformation_index: number;
    complete?: boolean;
    stages?: Array<{
      stage: string;
      status?: string;
      cost_status?: string;
      material_cost_mxn?: number | null;
      input_cost_mxn?: number | null;
      transformation_index?: number | null;
      transformation_added_mxn?: number | null;
      transformed_cost_mxn?: number | null;
    }>;
  };
  cost_data_complete?: boolean;
  genealogy_tree?: {
    extrusion_entries?: any[];
    raw_materials?: any[];
    exact_source_entries?: boolean;
    source_entry_count?: number;
  };
}

export interface LoomBackflushConsumption {
  id: number;
  viajero_roll_id: number;
  loom_run_id: number;
  rack_id: number;
  pti_product_id: number;
  role: string;
  theoretical_kg: number;
  spools_consumed: number;
  rack_balance_spools_before: number;
  rack_balance_spools_after: number;
  rack?: {
    id: number;
    rack_code: string;
  };
  ptiProduct?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface ViajeroRoutingLog {
  id: number;
  viajero_roll_id: number;
  from_stage: string;
  to_stage: string;
  area_id?: number;
  operator_id?: number;
  action: string;
  meters_in: number;
  meters_out: number;
  weight_in_kg: number;
  weight_out_kg: number;
  notes?: string;
  created_at: string;
  operator?: {
    id: number;
    first_name: string;
    last_name: string;
    numero_nomina?: string;
  };
}

export interface ValidateViajeroScanResponse {
  is_allowed: boolean;
  message: string;
  error_code?: 'ROLL_NOT_FOUND' | 'AREA_NOT_IN_ROUTE' | 'OUT_OF_SEQUENCE';
  roll?: {
    id?: number;
    roll_code: string;
    qr_code: string;
    meters?: number;
    weight_kg?: number;
    width_cm?: number;
    route: string[];
    current_stage: string;
    next_allowed_stage: string;
    bom_name?: string;
    loom_name?: string;
  };
}

export interface TejidoOperator {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  username: string;
  email?: string;
  telefono?: string;
  numero_nomina: string;
  role_id?: number;
  role_name: string;
  role_code?: string;
  area_name: string;
  is_active?: boolean;
  created_at?: string;
}

export interface WipSummaryMacro {
  total_wip_kg: number;
  total_spools: number;
  total_creel_capacity_spools?: number;
  free_creel_capacity_spools?: number;
  total_looms_active: number;
  total_looms_count: number;
  avg_creel_utilization_pct: number;
  active_carts_in_floor: number;
  total_valuation_mxn: number | null;
  valuation_complete?: boolean | null;
  allow_costs: boolean;
}

export interface LoomWipItem {
  id: number;
  loom_number: number;
  code: string;
  name: string;
  type: string;
  model: string;
  subarea_id?: number | null;
  subarea?: { id: number; name: string; nomenclature: string | null } | null;
  rpm: number;
  status: string;
  creel_capacity_spools: number;
  current_spools_count: number;
  current_wip_kg: number;
  pti_inventory: Array<{
    pti_product_id: number | null;
    code: string;
    name: string;
    color: string;
    denier: number | null;
    tape_width_mm: number | null;
    quantity_spools: number;
    quantity_kg: number;
    valuation_mxn: number | null;
    valuation_complete: boolean;
    source_carts: string[];
  }>;
  creel_utilization_pct: number;
  active_pti: {
    code: string;
    name: string;
    color: string;
    denier: number | null;
    cart_code: string;
  } | null;
  active_cart: string | null;
  active_run: {
    id: number;
    bom_code: string;
    bom_name: string;
    shift: string;
    operator_name: string | null;
    meters_planned: number;
    meters_produced: number;
  } | null;
  valuation_mxn: number | null;
  cost_data_complete?: boolean;
}

export interface AvailableCart {
  id: number;
  rack_code: string;
  qr_code: string;
  container_type: string;
  current_quantity: number;
  unit_weight_kg: number | null;
  tare_weight_kg: number | null;
  net_weight_kg: number | null;
  gross_weight_kg: number | null;
  status: string;
  pti_product: {
    id: number;
    code: string;
    name: string;
    color: string;
    denier: number | null;
    tape_width_mm?: number | null;
    extrusion_machine_number?: number | null;
  } | null;
  valuation_mxn: number | null;
}

export interface WipSummaryResponse {
  macro: WipSummaryMacro;
  transfer_mode: 'RACK_PARTIAL' | 'CART_FULL';
  available_carts: AvailableCart[];
  looms: LoomWipItem[];
}
