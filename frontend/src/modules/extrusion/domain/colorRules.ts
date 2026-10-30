const COLOR_NAMES = [
  'amarillo',
  'azul',
  'blanco',
  'naranja',
  'negro',
  'verde',
  'rojo',
  'morado',
  'natural',
  'gris',
  'cafe',
  'beige',
  'rosa',
  'violeta',
];

const COLOR_LABELS: Record<string, string> = {
  amarillo: 'Amarillo', azul: 'Azul', blanco: 'Blanco', naranja: 'Naranja',
  negro: 'Negro', verde: 'Verde', rojo: 'Rojo', morado: 'Morado',
  natural: 'Natural', gris: 'Gris', cafe: 'Café', beige: 'Beige',
  rosa: 'Rosa', violeta: 'Violeta',
};

const SPECIAL_COLOR_LABELS = [
  { match: /\bamarillo\s+antiestatico\b/, label: 'Amarillo antiestático' },
  { match: /\bamarillo\s+huevo\b/, label: 'Amarillo huevo' },
  { match: /\bverde\s+optico\b/, label: 'Verde óptico' },
  { match: /\bnatural\s+antiestatico\b/, label: 'Natural antiestático' },
];

const normalizeColorText = (value: unknown): string => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\bblanca\b/g, 'blanco')
  .replace(/\bamarilla\b/g, 'amarillo')
  .replace(/\bnegra\b/g, 'negro')
  .replace(/\broja\b/g, 'rojo')
  .replace(/\bmorada\b/g, 'morado');

export const getNamedColors = (value: unknown): string[] => {
  const normalized = normalizeColorText(value);

  return COLOR_NAMES.filter((color) => new RegExp(`(^|[^a-z])${color}([^a-z]|$)`).test(normalized));
};

/** Return the single, user-facing output color encoded by a formula. */
export const getFormulaColorLabel = (formula: any): string | null => {
  const normalized = normalizeColorText([formula?.code, formula?.name, formula?.description].filter(Boolean).join(' '));
  const special = SPECIAL_COLOR_LABELS.find(({ match }) => match.test(normalized));
  if (special) return special.label;
  const color = getNamedColors(normalized)[0];
  return color ? COLOR_LABELS[color] : null;
};

export const colorNamesMatch = (left: unknown, right: unknown): boolean => {
  const leftColors = getNamedColors(left);
  const rightColors = getNamedColors(right);
  return leftColors.length === 1 && rightColors.length === 1 && leftColors[0] === rightColors[0];
};
