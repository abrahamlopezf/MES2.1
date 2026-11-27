const { defineConfig } = require('@playwright/test');
const path = require('node:path');

const baseURL = process.env.TRACEFLOW_E2E_BASE_URL || 'http://127.0.0.1:5173';

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.cjs',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    launchOptions: { channel: 'msedge' },
    trace: 'retain-on-failure',
  },
  webServer: {
    cwd: path.resolve(__dirname, '../..'),
    command: 'npm --prefix frontend run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
