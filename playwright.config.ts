import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --mode e2e`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      // Fake backend: every request to this host is intercepted by tests/e2e/mockSupabase.ts
      VITE_SUPABASE_URL: 'http://supabase.e2e.test',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
})
