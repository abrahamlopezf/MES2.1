export interface MaterialRef {
  id: number;
  name: string;
  code?: string;
  sku?: string;
}

export interface FormulaIngredient {
  id: number;
  formula_id: number;
  material_id: number;
  percentage?: number;
  weight_kg: number;
  is_restricted_on_machine_4: boolean;
  material?: MaterialRef;
}

export interface Formula {
  id: number;
  name: string;
  code: string;
  description?: string;
  batch_size_kg: number;
  cost_index?: number;
  raw_materials_cost?: number;
  transformed_mixture_value?: number;
  suggested_pti_unit_price?: number;
  expected_yield_pieces: number;
  expected_yield_kg: number;
  allowed_extruders?: number[];
  restricted_extruders?: number[];
  is_active: boolean;
  ingredients?: FormulaIngredient[];
  ptiProducts?: PtiProduct[];
}

export interface PtiProduct {
  id: number;
  code: string;
  name: string;
  specifications?: string;
  unit_weight_kg: number;
  unit_price: number;
  formula_id: number;
  material_id?: number | null;
  is_active: boolean;
  formula?: Formula;
  material?: MaterialRef;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePtiProductPayload {
  code?: string;
  name: string;
  specifications?: string;
  unit_weight_kg?: number;
  unit_price?: number;
  formula_id: number;
  material_id?: number | null;
  is_active?: boolean;
}

export interface UpdatePtiProductPayload {
  code?: string;
  name?: string;
  specifications?: string;
  unit_weight_kg?: number;
  unit_price?: number;
  formula_id?: number;
  material_id?: number | null;
  is_active?: boolean;
}

export interface UpdateFormulaPayload {
  name?: string;
  description?: string;
  cost_index?: number;
  batch_size_kg?: number;
  expected_yield_pieces?: number;
  expected_yield_kg?: number;
  is_active?: boolean;
}

export type RackStatus = 'VACIO' | 'DISPONIBLE' | 'LLENO';

export interface PtiRack {
  id: number;
  rack_code: string;
  qr_code: string;
  current_pti_type_id: number | null;
  current_quantity: number;
  min_capacity: number;
  max_capacity: number;
  status: RackStatus;
  currentPtiType?: MaterialRef | null;
  notes?: string;
  unit_price?: number;
  unit_weight_kg?: number;
  total_value?: number;
}

export type QueueStatus = 'EN_ESPERA' | 'ACTIVA' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA';

export interface ExtruderQueue {
  id: number;
  extruder_id: number;
  consumption_order_qr_id: string;
  formula_id: number;
  priority: number;
  status: QueueStatus;
  notes?: string;
  formula?: Formula;
  created_at?: string;
  updated_at?: string;
}

export interface ExtruderMachineInfo {
  id: number;
  name: string;
  type: 'FIXED' | 'DYNAMIC';
  description: string;
}

export interface MachineQueueGroup {
  machine: ExtruderMachineInfo;
  active: ExtruderQueue | null;
  paused: ExtruderQueue[];
  waiting: ExtruderQueue[];
  total_in_queue: number;
}

export interface BackflushingIngredientBreakdown {
  material_id: number;
  material_name: string;
  consumed_kg: number;
}

export interface BackflushingResult {
  pieces_entered: number;
  theoretical_piece_weight_kg: number;
  pieces_raw_material_kg: number;
  transition_scrap_kg: number;
  total_raw_material_consumed_kg: number;
  ingredients_breakdown: BackflushingIngredientBreakdown[];
}

export interface ScanRackPtiResponse {
  message: string;
  rack: PtiRack;
  backflushing: BackflushingResult | null;
}

export interface SwitchQueuePriorityPayload {
  queue_id: number;
  scrap_weight_kg?: number;
}

export interface EnqueueMixPayload {
  extruder_id: number;
  consumption_order_qr_id: string;
  formula_id: number;
  priority?: number;
  notes?: string;
}

export interface ScanRackPtiPayload {
  rack_qr: string;
  pti_material_id: number;
  quantity?: number;
  weight_kg?: number;
  unit_price?: number;
  mixture_qr?: string;
  scrap_weight_kg?: number;
  scrap_reason?: string;
  notes?: string;
}

export interface ScrapDetail {
  id: number;
  extruder_id: number;
  from_mixture_qr_id: string;
  scrap_weight_kg: number;
  reason: string;
  notes?: string;
  createdAt?: string;
}

export interface MassBalanceData {
  mixture_qr: string;
  batch_size_kg: number;
  total_scrap_kg: number;
  scrap_percentage: number;
  estimated_useful_kg: number;
  estimated_yield_percentage: number;
  scrap_status: 'OPTIMO' | 'NORMAL' | 'ELEVADO' | 'CRITICO';
  scrap_records_count: number;
  scrap_details: ScrapDetail[];
}

export interface ExtrusionValuation {
  cost_index: number;
  queued_mixes_value: number;
  active_mixes_value: number;
  pti_racks_value: number;
  total_extrusion_wip_value: number;
  queued_items_count: number;
  active_items_count: number;
  racks_count: number;
  racks: Array<{
    id: number;
    rack_code: string;
    current_quantity: number;
    unit_price: number;
    unit_weight_kg: number;
    total_value: number;
    pti_type: string;
  }>;
}

export interface SplitContainerItem {
  container_number?: number;
  weight_kg?: number;
}

export interface SplitContainersPayload {
  parent_mixture_qr: string;
  containers: SplitContainerItem[];
  notes?: string;
}

export interface MixtureTransitionPayload {
  extruder_id: number;
  from_mixture_qr?: string;
  to_mixture_qr?: string;
  transition_scrap_kg: number;
  last_pti_quantity?: number;
  first_pti_quantity?: number;
  reason?: string;
  notes?: string;
}
