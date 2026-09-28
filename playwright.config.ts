import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', headless: true },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://notes-test.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', VITE_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com', VITE_GOOGLE_APP_ID: '123', VITE_GOOGLE_API_KEY: 'test-picker-key' },
  },
})
