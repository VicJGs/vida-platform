# Fix: data-plane boot — the DB worker `open` times out (intermittent in dev · never completes in the production build)

Status: **open — filed 2026-10-22** (Victor: "file it as a fix needed … in the plan and also in the order")
Classification: **[UNKNOWN] root cause — ISOLATED vs STRUCTURAL is decided at this unit's triage** (the analysis below is
the evidence, not a diagnosis). Severity: **blocks a production build from opening its database at all**; dev degrades
to a Retry.
Found: 2026-10-22, by the fe-calendar #19 S7 live Visual Gate (Playwright Chromium; `cc0e350`, PR #157).
Owner unit: **`fix-data-plane-boot-open` (LIF-250)** (`.claude/tasks/fix-data-plane-boot-open.md`) — a repair of the Done
`data-plane-wiring` (#59, LIF-237, PR #148). Homed in M1.2.4 by the golive-replan placement rule (g3-order §1).

## Findings
1. **Dev server — intermittent `open` timeout.** On a page load `/calendar` showed *"Failed to open the local database:
   DB worker RPC 1 (open) timed out after 15000ms"* (the client's RPC budget `RPC_TIMEOUT_MS = 15_000`
   [FACT: apps/web/src/db/client.ts:50,94-96]). It recurred on several loads (with and without a vite dependency
   re-optimize reload). The app's own **Retry** (boot clears its memo on failure [FACT: apps/web/src/db/boot.ts:33-42])
   opened the DB every time with the seeded data intact. Worker script 200, no `pageerror`, no worker console output.
2. **Production build — `open` never completes.** `vite build` + `vite preview` on a FRESH origin (no prior data, no
   reload): the same timeout on the first load. Network: the worker chunk loads (200 `/assets/worker-*.js`) but the
   **wasm is never requested**, though the build emits and references it (`/assets/wa-sqlite-*.wasm`, referenced from the
   worker chunk). The worker's `open` = `adapter.open({ dbName })` [FACT: apps/web/src/db/worker.ts:21-22,72-73]; the
   wasm handling is configured for dev (`optimizeDeps.exclude: ['wa-sqlite']`, `assetsInclude: ['**/*.wasm']`, a `worker`
   block) [FACT: apps/web/vite.config.ts:10-18].
3. **Consequence — the Year range could not be timed in production.** In dev the Year switch takes 1.5–2.6 s with its
   data in 6 ms (render-bound: ~500 Tamagui nodes, YearView V12) — over the 1 s budget fe-calendar S7 set (PLAN-S7 G3/R10).
   Dev React is several × slower than prod, so the number is not a verdict; it must be re-measured on a booting prod build.

## Facets
- **Hypotheses (UNKNOWN until reproduced — label, don't assume):** (a) the previous document's worker still holds the
  exclusive `AccessHandlePoolVFS` OPFS sync-access handles when the next page's worker opens (fits the dev intermittency +
  Retry recovering); (b) the production worker's wasm locate/instantiate path differs from dev (`import.meta.url`
  resolution in the worker chunk) and stalls before the fetch (fits "never requested"); (c) an automated-Chromium quirk.
  (a) and (b) may both be true — two defects, one symptom.
- **Why latent:** every Visual Gate before S7 ran a standalone harness that BYPASSES the DB boot, and the only live
  OPFS runs (#150/#151) used Brave on the dev server. No production build had ever been booted against OPFS.
- **Reproduction:** dev — `pnpm --filter @vida/web dev`, open `/calendar`, reload a few times → the timeout screen, Retry
  recovers. Prod — `vite build && vite preview`, open `/` on a fresh origin → the timeout; DevTools Network shows no
  `.wasm` request.
- **Blast radius:** the whole live app (every surface sits behind BR-RT-BOOT) — dev is degraded, prod is broken.

## Files
- `apps/web/src/db/{client,boot,worker,web-driver,web-adapter}.ts` · `apps/web/vite.config.ts` (the build's worker + wasm
  config). S7 changed none of them (empty diff).

## Acceptance (the fix unit's Verification Gate)
- [ ] Root cause stated for EACH symptom (dev intermittency · prod never opening), labelled FACT, with a reproduction.
- [ ] A production build boots and opens OPFS on a fresh origin AND on a reload, in Brave/Chromium, 10/10 loads; dev 10/10.
- [ ] If (a) holds: the worker releases the VFS handles on page hide/unload, or the client retries `open` with backoff
      before surfacing an error (no user-facing timeout on a plain reload).
- [ ] **Re-time the Year range on the booting prod build** (fe-calendar PLAN-S7 G3/R10: switch settle ≤ 1 s). Over budget →
      a YearView performance follow-up homed at that point (render-bound, not data — the reads take 6 ms).
- [ ] A Playwright OPFS smoke on the PRODUCTION build (the CI `E2E (Playwright + OPFS)` job serves the DEV server — `pnpm --filter @vida/web dev` [FACT: apps/web/playwright.config.ts:35-36; .github/workflows/ci.yml:73-90]) so this
      cannot regress silently.
