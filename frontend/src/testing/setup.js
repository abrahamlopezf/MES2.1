import '@testing-library/jest-dom';
// import { toHaveNoViolations } from 'jest-axe';
// import { expect } from 'vitest';

// expect.extend(toHaveNoViolations);

// Mock básico para APIs del navegador (e.g. navigator.vibrate)
if (!global.navigator.vibrate) {
  global.navigator.vibrate = () => {};
}
