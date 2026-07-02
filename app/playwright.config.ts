import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'https://localhost:5173',
    ignoreHTTPSErrors: true, // dev server uses a self-signed certificate
  },
  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:5173',
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
