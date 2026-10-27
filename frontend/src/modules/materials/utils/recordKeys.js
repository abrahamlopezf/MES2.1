export const getMaterialKey = (material, index) =>
  material?.uuid ?? material?.id ?? material?.internal_code ?? material?.material_code?.code ?? `material-${index}`;

export const getMaterialTagKey = (tag, index) =>
  tag?.uuid ?? tag?.id ?? tag?.code ?? tag?.name ?? `tag-${index}`;
