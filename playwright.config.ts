import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/navegador',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: process.platform === 'win32' ? 'msedge' : 'chromium',
    trace: 'retain-on-failure',
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
      env: { PORT: '3000', CORS_ORIGIN: 'http://localhost:5173' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview --workspace frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
});
