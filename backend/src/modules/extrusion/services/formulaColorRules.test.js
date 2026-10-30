'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getFormulaOutputColorLabel, normalizeOutputColor, validateRequestedOutputColor } = require('./formulaColorRules');

test('formula output color preserves named shades for recipe/masterbatch selection', () => {
  assert.equal(getFormulaOutputColorLabel({ code: 'F-EXT-1-AMARILLO-ANTI', name: 'Mezcla Amarillo Antiestático' }), 'Amarillo antiestático');
  assert.equal(getFormulaOutputColorLabel({ code: 'F-EXT-VERDE-OPT', name: 'Verde Óptico' }), 'Verde óptico');
  assert.equal(getFormulaOutputColorLabel({ code: 'F-EXT-2-BLANCA', name: 'Mezcla Blanca Extrusora 2' }), 'Blanco');
});

test('color matching ignores accents and surrounding whitespace', () => {
  assert.equal(normalizeOutputColor('  Verde Óptico  '), normalizeOutputColor('verde optico'));
});

test('colorless formulas stay without a selected color', () => {
  assert.equal(getFormulaOutputColorLabel({ code: 'F-EXT-PURGANTE', name: 'Purga de extrusión' }), null);
});

test('the backend rejects a requested color that does not match the formula recipe', () => {
  const formula = { code: 'F-EXT-1-AZUL', name: 'Mezcla Azul' };
  assert.equal(validateRequestedOutputColor(formula, 'azul'), 'Azul');
  assert.throws(() => validateRequestedOutputColor(formula, 'Rojo'), { statusCode: 409 });
});
