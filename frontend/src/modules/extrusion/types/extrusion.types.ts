export interface MaterialRef {
  id: number;
  name: string;
  code?: string;
  sku?: string;
}

export interface FormulaIngredient {
  id: number;
  formula_id: number;
  output_pti_product_id?: number | null;
  output_pti_color?: string | null;
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
  raw_materials_cost?: number | null;
  transformed_mixture_value?: number | null;
  suggested_pti_unit_price?: number | null;
  expected_yield_pieces: number;
  expected_yield_kg: number;
  allowed_extruders?: number[];
  restricted_extruders?: number[];
  extruder_assignment_mode?: 'EXTRUDER_1' | 'DYNAMIC' | 'FIXED';
  is_active: boolean;
  ingredients?: FormulaIngredient[];
  ptiProducts?: PtiProduct[];
}

export interface PtiProduct {
  id: number;
  code: string;
  name: string;
  specifications?: string;
  unit_weight_kg: number | null;
  unit_price: number;
  extrusion_machine_number: number | null;
  tape_type: string | null;
  color: string | null;
  denier: number | null;
  tape_count: number | null;
  tape_count_tolerance: number;
  tape_width_mm: number | null;
  transformed_cost_index: number;
  formula_id: number | null;
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
  extrusion_machine_number?: number;
  tape_type?: string;
  color?: string;
  denier?: number;
  tape_count?: number;
  tape_count_tolerance?: number;
  tape_width_mm?: number;
  transformed_cost_index?: number;
  unit_weight_kg?: number | null;
  unit_cost_per_kg?: number | null;
  unit_price?: number;
  formula_id?: number | null;
  material_id?: number | null;
  is_active?: boolean;
}

export interface UpdatePtiProductPayload {
  code?: string;
  name?: string;
  specifications?: string;
  extrusion_machine_number?: number | null;
  tape_type?: string | null;
  color?: string | null;
  denier?: number | null;
  tape_count?: number | null;
  tape_count_tolerance?: number;
  tape_width_mm?: number | null;
  transformed_cost_index?: number;
  unit_weight_kg?: number | null;
  unit_price?: number;
  formula_id?: number | null;
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
  current_pti_product_id?: number | null;
  current_quantity: number;
  min_capacity: number;
  max_capacity: number;
  status: RackStatus;
  currentPtiType?: MaterialRef | null;
  notes?: string;
  unit_price?: number;
  unit_weight_kg?: number | null;
  unit_cost_per_kg?: number | null;
  total_value?: number;
  transformed_cost_value?: number | null;
  currentPtiProduct?: PtiProduct | null;
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
  container_remaining_quantity_kg?: number | null;
  preparation?: { id: number; remaining_quantity_kg: number | null } | null;
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
  active_formula_group?: { formula_id: number; output_pti_product_id?: number | null; output_pti_color?: string | null; formula_name: string | null; batch_count: number; quantity_kg: number; mixture_qrs: string[] } | null;
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
  racks?: Array<PtiRack & { pieces_added?: number }>;
  created_racks?: Array<PtiRack & { pieces_added?: number }>;
  backflushing: BackflushingResult | null;
  production_entries?: any[];
  queue_completion?: QueueCompletion | null;
}

export interface QueueCompletion {
  completed: boolean;
  reason?: string;
  completed_queue?: ExtruderQueue;
  next_queue?: ExtruderQueue | null;
}

export interface SwitchQueuePriorityPayload {
  queue_id: number;
  scanned_qr?: string;
  prioritize_formula_id?: number;
  purge_percentage?: number;
  notes?: string;
  scrap_weight_kg?: number;
  scrap_items?: { category: 'MEZCLA_ANTERIOR' | 'MEZCLA_NUEVA' | 'MEZCLA_MIXTA' | 'MATERIAL_PURGA'; estimated_weight_kg: number; color?: string; from_mix_share?: number; to_mix_share?: number; source_material_id?: number; source_lote_id?: number; shift_code?: string; notes?: string }[];
  shift_code?: string;
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
  estimated_scrap_weight_kg?: number;
  scrap_category?: string;
  scrap_reason?: string;
  scrap_color?: string;
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
  good_output_kg?: number;
  good_output_pieces?: number;
  good_output_cost?: number | null;
  pti_output_cost?: number | null;
  estimated_useful_kg: number;
  estimated_yield_percentage: number;
  expected_output_kg?: number;
  expected_output_pieces?: number | null;
  output_piece_variance?: number | null;
  remaining_mixture_kg?: number;
  unexplained_variance_kg?: number;
  production_entries?: any[];
  scrap_logs?: any[];
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
  scrap_items?: { category: 'MEZCLA_ANTERIOR' | 'MEZCLA_NUEVA' | 'MEZCLA_MIXTA' | 'MATERIAL_PURGA'; estimated_weight_kg: number; color?: string; from_mix_share?: number; to_mix_share?: number; source_material_id?: number; source_lote_id?: number; notes?: string }[];
  last_pti_quantity?: number;
  first_pti_quantity?: number;
  reason?: string;
  notes?: string;
}
