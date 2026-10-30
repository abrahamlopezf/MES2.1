import { describe, expect, it } from 'vitest';
import { getFormulaColorLabel, getNamedColors } from './colorRules';

describe('extrusion formula color selection', () => {
  it('recognizes special shades before their base color', () => {
    expect(getFormulaColorLabel({ code: 'F-EXT-1-AMARILLO-ANTI', name: 'Mezcla Amarillo Antiestático' }))
      .toBe('Amarillo antiestático');
    expect(getFormulaColorLabel({ code: 'F-EXT-VERDE-OPT', name: 'Verde Óptico' }))
      .toBe('Verde óptico');
  });

  it('normalizes feminine color adjectives without treating them as a second color', () => {
    expect(getFormulaColorLabel({ code: 'F-EXT-2-BLANCA', name: 'Mezcla Blanca Extrusora 2' }))
      .toBe('Blanco');
    expect(getNamedColors('Rafia Amarilla')).toEqual(['amarillo']);
  });

  it('returns no selectable color for a formula without a color in its identity', () => {
    expect(getFormulaColorLabel({ code: 'F-EXT-PURGANTE', name: 'Purga de extrusión' })).toBeNull();
  });
});
