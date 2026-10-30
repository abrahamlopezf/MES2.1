'use strict';

const normalizeColorText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\bblanca\b/g, 'blanco')
  .replace(/\bamarilla\b/g, 'amarillo')
  .replace(/\bnegra\b/g, 'negro')
  .replace(/\broja\b/g, 'rojo')
  .replace(/\bmorada\b/g, 'morado');

const COLOR_NAMES = ['amarillo', 'azul', 'blanco', 'naranja', 'negro', 'verde', 'rojo', 'morado', 'natural', 'gris', 'cafe', 'beige', 'rosa', 'violeta'];
const COLOR_LABELS = {
  amarillo: 'Amarillo', azul: 'Azul', blanco: 'Blanco', naranja: 'Naranja',
  negro: 'Negro', verde: 'Verde', rojo: 'Rojo', morado: 'Morado', natural: 'Natural',
  gris: 'Gris', cafe: 'Café', beige: 'Beige', rosa: 'Rosa', violeta: 'Violeta',
};
const SPECIAL_COLORS = [
  { expression: /\bamarillo\s+antiestatico\b/, label: 'Amarillo antiestático' },
  { expression: /\bamarillo\s+huevo\b/, label: 'Amarillo huevo' },
  { expression: /\bverde\s+optico\b/, label: 'Verde óptico' },
  { expression: /\bnatural\s+antiestatico\b/, label: 'Natural antiestático' },
];

const getFormulaOutputColorLabel = (formula) => {
  const normalized = normalizeColorText([formula?.code, formula?.name, formula?.description].filter(Boolean).join(' '));
  const special = SPECIAL_COLORS.find(({ expression }) => expression.test(normalized));
  if (special) return special.label;
  const color = COLOR_NAMES.find((name) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(normalized));
  return color ? COLOR_LABELS[color] : null;
};

const normalizeOutputColor = (value) => normalizeColorText(value).trim();

const validateRequestedOutputColor = (formula, requestedColor) => {
  const formulaColor = getFormulaOutputColorLabel(formula);
  if (requestedColor && normalizeOutputColor(requestedColor) !== normalizeOutputColor(formulaColor)) {
    throw Object.assign(new Error(`El color seleccionado (${requestedColor}) no corresponde a la fórmula ${formula?.code || formula?.name || ''}.`), { statusCode: 409 });
  }
  return formulaColor;
};

module.exports = { getFormulaOutputColorLabel, normalizeOutputColor, validateRequestedOutputColor };
