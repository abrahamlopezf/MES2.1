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
  expected_yield_pieces: number;
  expected_yield_kg: number;
  allowed_extruders?: number[];
  restricted_extruders?: number[];
  is_active: boolean;
  ingredients?: FormulaIngredient[];
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
  quantity: number;
  mixture_qr?: string;
  notes?: string;
}
