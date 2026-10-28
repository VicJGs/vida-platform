// ============================================================================
// Playwright config — PRODUCTION-BUILD boot smoke (LIF-250 fix-data-plane-boot-open).
//
// The dev config (`playwright.config.ts`) serves `vite dev` and drives the DB through the test-only harness, which
// BYPASSES the app's boot. That is how the boot defect stayed latent: no production build had ever been booted against
// OPFS. This config builds the app (`vite build`) and serves `dist/` (`vite preview`), and its specs drive the REAL app
// boot (`App.tsx` → `ensureDbReady` → worker `open` + migrate) on a clean OPFS origin.
//
// Own port (4174, pinned + --strictPort) so it never collides with the dev suite's 5173. Chromium only (OPFS +
// FileSystemSyncAccessHandle). Same local escape hatch as the dev config: on macOS 12 point PW_EXECUTABLE_PATH at a
// Chromium-family binary (Brave).
// ============================================================================

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // A first-run boot applies every migration (measured 9–27 s end to end on a loaded dev machine).
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4174',
    launchOptions: process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite build && pnpm exec vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    // `vite build` of the full app takes minutes on a slow machine.
    timeout: 900_000,
  },
})
