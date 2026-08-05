import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
      thresholds: {
        'src/core/platform/EventBus/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/core/runtime/WorkflowEngine/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/core/platform/CapabilityRegistry/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/testing/harness/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/core/platform/Scanner/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/design-system/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/design-system/components/**': { statements: 90, branches: 90, functions: 90, lines: 90 }
      }
    }
  }
});
