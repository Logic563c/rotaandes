import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
config({ path: 'backend/.env', quiet: true });

export default defineConfig({
  testDir: './tests/navegador',
  testIgnore: ['**/primeraEntrega.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 10000,
    channel: process.platform === 'win32' ? 'msedge' : 'chromium',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: 'npm run start --workspace backend',
      url: 'http://localhost:3000/api/health',
      env: { PORT: '3000', CORS_ORIGIN: 'http://localhost:5173', NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('base64url') },
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview --workspace frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
});
