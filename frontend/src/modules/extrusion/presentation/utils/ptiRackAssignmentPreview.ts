export interface RackAssignmentCandidate {
  id: number;
  current_quantity?: number | string | null;
  max_capacity?: number | string | null;
  current_pti_product_id?: number | null;
  destination_route?: string | null;
  destination_subarea_id?: number | null;
  custody_shift_session_id?: number | null;
  locked_until_shift_close?: boolean;
  available_for_active_shift?: boolean;
}

export interface RackAssignmentPreview<T extends RackAssignmentCandidate> {
  allocations: Array<{ rack: T; pieces: number }>;
  remaining: number;
}

export function buildPtiRackAssignmentPreview<T extends RackAssignmentCandidate>({
  racks,
  ptiProductId,
  expectedRoute,
  pieces,
  selectedRackId,
}: {
  racks: T[];
  ptiProductId: number | null;
  expectedRoute: string | null;
  pieces: number;
  selectedRackId: number | null;
}): RackAssignmentPreview<T> {
  if (!ptiProductId || !pieces || !expectedRoute) return { allocations: [], remaining: pieces };

  const eligible = racks.filter((rack) => {
    if (rack.locked_until_shift_close || rack.available_for_active_shift === false
      || (rack.custody_shift_session_id != null && rack.available_for_active_shift !== true)) return false;
    const occupied = Number(rack.current_quantity || 0);
    if (occupied <= 0) return true;
    return Number(rack.current_pti_product_id) === ptiProductId
      && rack.destination_route === expectedRoute
      && rack.destination_subarea_id == null;
  });

  const selectedRack = selectedRackId == null ? null : eligible.find((rack) => rack.id === selectedRackId) || null;
  if (selectedRackId != null && !selectedRack) return { allocations: [], remaining: pieces };

  const firstChoice = selectedRack || [...eligible]
    .sort((a, b) => Number(b.current_quantity || 0) - Number(a.current_quantity || 0) || Number(a.id) - Number(b.id))
    .find((rack) => Number(rack.current_quantity || 0) < Number(rack.max_capacity || 100));
  const allocationOrder = firstChoice
    ? [firstChoice, ...eligible.filter((rack) => rack.id !== firstChoice.id).sort((a, b) => Number(a.id) - Number(b.id))]
    : [];
  let remaining = pieces;
  const allocations: Array<{ rack: T; pieces: number }> = [];
  for (const rack of allocationOrder) {
    const available = Math.max(0, Number(rack.max_capacity || 100) - Number(rack.current_quantity || 0));
    const assigned = Math.min(remaining, available);
    if (assigned > 0) allocations.push({ rack, pieces: assigned });
    remaining -= assigned;
    if (remaining <= 0) break;
  }
  return { allocations, remaining: Math.max(0, remaining) };
}
