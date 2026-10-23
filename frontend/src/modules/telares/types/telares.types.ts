export interface Loom {
  id: number;
  code: string;
  name: string;
  status: 'DISPONIBLE' | 'EN_PRODUCCION' | 'MANTENIMIENTO' | 'DETENIDO';
  active_warp_rack_id: number | null;
  active_weft_rack_id: number | null;
  current_bom_id: number | null;
  is_active: boolean;
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
  ptiProduct?: {
    id: number;
    name: string;
    code: string;
    denier?: number;
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
  expected_output_quantity?: number;
  expected_output_unit?: string;
  default_route: string[];
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
  };
}

export interface ViajeroRoll {
  id: number;
  qr_code: string;
  roll_code: string;
  run_id: number;
  loom_id: number;
  bom_id: number;
  operator_id?: number;
  meters: number;
  weight_kg: number;
  width_cm: number;
  grammage_g_per_m: number;
  route: string[];
  current_stage: string;
  next_allowed_stage: string;
  stages_history: Array<{
    stage: string;
    action: string;
    loom_code?: string;
    meters?: number;
    weight_kg?: number;
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
  };
  consumptions?: LoomBackflushConsumption[];
  routingLogs?: ViajeroRoutingLog[];
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
