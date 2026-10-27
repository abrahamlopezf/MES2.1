export interface RecipeLine {
  material_id: number;
  quantity: number | string;
  unit: string;
  notes?: string | null;
}

export interface GroupedRecipeLine<T extends RecipeLine> {
  line: T;
  count: number;
  totalQuantity: number;
}

export function groupIdenticalRecipeLines<T extends RecipeLine>(
  lines: readonly T[],
): GroupedRecipeLine<T>[] {
  const groups = new Map<string, GroupedRecipeLine<T>>();

  for (const line of lines) {
    const quantity = Number(line.quantity);
    const key = JSON.stringify([
      line.material_id,
      quantity,
      line.unit,
      line.notes ?? null,
    ]);
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      existing.totalQuantity += quantity;
      continue;
    }

    groups.set(key, {
      line,
      count: 1,
      totalQuantity: quantity,
    });
  }

  return Array.from(groups.values());
}
