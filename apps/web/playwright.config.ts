// ============================================================================
// Playwright config — QA-1 (LIF-103). Browser E2E for @vida/web.
//
// Lives at the web-app ROOT (not e2e/) so `pnpm --filter @vida/web exec
// playwright test` (CWD = apps/web) discovers it; `testDir: './e2e'` scopes
// collection to the harness — NOT src/, whose *.test.ts are Vitest files that
// import 'vitest' and crash Playwright's collector.
//
// Chromium only (OPFS + FileSystemSyncAccessHandle). No COOP/COEP: the sync
// wa-sqlite build (AccessHandlePoolVFS) uses no SharedArrayBuffer (ADR-001).
// Port PINNED with --strictPort (Vite silently increments an occupied port →
// url mismatch → hang). workers:1 + fullyParallel:false — the specs share one
// OPFS origin; isolation is the per-test reset in e2e/fixtures.ts (Playwright
// does not reset OPFS between contexts — microsoft/playwright#29901).
// ============================================================================

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // Local escape hatch: on a Playwright-unsupported OS (e.g. macOS 12, which
    // can't download the bundled Chromium), point at a system Chromium-family
    // binary — `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`. Unset in
    // CI → uses the installed Chromium. Does not affect the shipped config.
    launchOptions: process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @vida/web dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
