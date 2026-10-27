# Fix: data-plane boot — the DB worker `open` times out (intermittent in dev · never completes in the production build)

Status: **fixed 2026-10-22 — plan approved (Victor), built, verified; PR pending** (filed 2026-10-22; Victor: "file it as a fix needed … in
the plan and also in the order"). Triage, the corrected findings and the plan are in **§ Triage** onward; the sections
from Findings to Acceptance are the **filing record** (kept as written; corrections in § Triage → Corrections).
Classification: **ISOLATED — root cause FACT (§ Triage).** At filing it was UNKNOWN; the analysis below was the evidence,
not a diagnosis. Severity: **blocks a production build from opening its database at all**; dev degrades
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

---

## Triage (2026-10-22 · bug-fix Steps 1–2)

**Reproduction** (worktree `fix-data-plane-boot-open` @ `8f2542b`, Brave headless via Playwright, an init script timing every
worker RPC from the main thread, temporary phase marks inside the worker — reverted):

| Condition | Result | `open` RPC round-trip |
|---|---|---|
| dev, fresh origin, `/calendar` | **5 of 7 timed out**; Retry opened 4/4 | the timed-out `open` replied **ok=true at 16 764–26 852 ms** |
| dev, reload (migrated) | 4/4 opened | 6.5–7.0 s |
| prod (`vite build` + `vite preview`), fresh, idle | 2/2 opened | 9 365 ms |
| prod, reload | 3/3 opened | 1 268–1 527 ms |
| prod, fresh, 3 boots in parallel (load) | **3/3 timed out** | (wasm requested 1.4–1.7 s after spawn in every run) |

Phase breakdown of a fresh dev `open` (inside the worker): module graph evaluation **5.0–8.7 s** (up to 12.2 s under load;
prod ≈ 0.4 s) · wasm factory + VFS `isReady` 0.3–0.5 s · `adapter.open` 0.4 s · **`migrate` 8.0–8.6 s** (32 migrations,
≈ 258 DDL statements, 32 commits; commits ≈ half).

**Root cause [FACT].** `WorkerDbClient.request()` arms one fixed `RPC_TIMEOUT_MS = 15_000` per request at `postMessage`
(`apps/web/src/db/client.ts:50,90-97`), for every op including `open`. The worker's `open` = module evaluation (before the
message is even read) + wasm + VFS + **every pending migration** (`worker.ts:21-28`, by design: BR-RT-BOOT, ADR-002:4010).
A first-run `open` therefore takes 9.4 s (prod, idle) to 27 s (dev / load) and is **failed by the client while the worker is
alive and succeeding**. Retry "recovers" only because the first `open` completes in the background. The budget dates from
AR-4 (`955a255`, 2026-07-30), when `open` ran 3 migrations ("15s is generous vs a local read", `client.ts:48-50`); there are
now 32. Both filed symptoms (dev intermittent · prod) are this one defect; prod times out under load, not on every load.

**Secondary [FACT].** Retry re-sends `open` to the same worker; `worker.ts:21-22` re-runs `adapter.open` and overwrites
`driver` without closing the first connection, and `web-adapter.ts:37-53` sets `api` only after its awaits (two
concurrent first calls each bootstrap a module + VFS). This violates BR-RT-D5 "spawned once + **opened once**".
`composition-root.ts:135` caches a rejected `build()` forever (`buildPromise ??=`), homed here by preferences-rescope
`PLAN-R3-boot-appearance.md` R3-BR-2 limit (2).

**Corrections to the filing record:**
- Finding 2 "production build — `open` never completes … the wasm is never requested": **contradicted** — prod opened
  5/5 unloaded and requested the wasm in 10/10 runs, including the 3 timeouts.
- Hypotheses (a) OPFS handles held by the previous document · (b) prod wasm locate path · (c) automated-Chromium quirk:
  **refuted** (7/7 reload boots opened; a locked handle rejects fast, it does not hang; reproduces in Brave).
- Finding 3 / Acceptance "S7 budget ≤ 1 s (PLAN-S7 G3/R10)": **no such budget in PLAN-S7** — R10 defines the Year spans;
  §D says "Year settle measured and recorded". The governing targets are `performance-strategy.md` §1.
- Acceptance item 3 (release VFS handles on pagehide/unload **or** retry `open` with backoff): **deviation (§XXVIII)** — it
  targeted hypothesis (a), which is refuted; retry-with-backoff would re-send `open` to a busy worker (the BR-RT-D5
  violation above). Page teardown is preferences-rescope R1 (`registerTeardown`, BR-8).

## Governing rules (the fix restores these; nothing here is a new decision)
| Rule | Source |
|---|---|
| Per-request timeout, **no hang**; reject on worker crash; error+retry state; open-memo cleared on failure | `infrastructure/web-client-runtime/current-spec.md:77-79` |
| Spawned once + **opened once** | BR-RT-D5 (`web-client-runtime/current-business-rules.md:54-59`) |
| No query before DB-ready; `open` migrates internally | BR-RT-BOOT (`:76-77`) · ADR-002:4010 · BR-DB7-3 |
| Boot error+retry = the shipped error precedent; degrade, never crash | `core/architecture/state-conventions.md` §1, §3 |
| Boot shows the neutral "Loading…" surface until ready | UI-4 `s4-onboarding.md` S4-BR-c · `performance-strategy.md` §6 |
| Every entity close runs live on real OPFS | ELC-7 (`golive-replan/process.md:41`) |

## Resolution — the change table
| File | Today | Change | Ends up |
|---|---|---|---|
| `apps/web/src/db/worker.ts` | `open` re-runs on every call; `driver` overwritten; no receipt signal | post `{ id, ack: true }` on receipt of `open`/`migrate`; `open` memoized (`opening ??= …`, cleared on failure and by `close`) | one open per worker (BR-RT-D5); the client knows the worker is alive |
| `apps/web/src/db/client.ts` | one 15 s timer per request from `postMessage` | `open`/`migrate`: a **receipt watchdog** (`OPEN_ACK_TIMEOUT_MS`) that runs only until the ack, then no wall-clock (crash → `onerror`, failure → error reply). Every other op: unchanged 15 s. Ack messages never settle a request | "no hang" kept for a dead/never-started worker; a live, migrating `open` is never failed |
| `apps/web/src/db/web-adapter.ts` | `ensureModule` sets `api` after awaits | memoize the bootstrap **promise** (cleared on failure and by `destroy`) | single-flight module + VFS bootstrap |
| `apps/web/src/db/composition-root.ts` | `buildPromise ??= build()` caches a rejection | clear `buildPromise` on rejection (the `boot.ts:36-46` rule) | a failed build is retried by the next `getServices()` |
| `apps/web/src/db/client.test.ts` | `:96-107` asserts `open` rejects at 15 s (encodes the defect) | rewrite: a read still rejects at 15 s · `open` rejects only without an ack · an acked `open` resolving after 30 s+ succeeds · crash after ack rejects · ack never settles | the contract under test |
| `apps/web/src/db/{worker,web-adapter}` tests | none for idempotency | worker-level test of repeated/concurrent `open` → one `adapter.open` (mocked adapter) | BR-RT-D5 proven |
| `apps/web/src/db/composition-root.singleton.test.ts` | build-once only | + a rejected build is retried | memo rule proven |
| `apps/web/playwright.prod.config.ts` + `e2e-prod/boot.spec.ts` (new) | E2E serves the dev server only (`playwright.config.ts:35-36`) | `vite build && vite preview` on its own port; a route-served blank same-origin page wipes OPFS (no app boot); spec: fresh boot reaches the app (no error, not Loading) → reload → boots again; console clean | the production boot can't regress silently |
| `apps/web/package.json` | no `e2e` script → `turbo run e2e` (`ci.yml:89`) runs nothing | `"e2e"`: dev suite + prod suite (`test:e2e` kept) | CI's E2E job actually runs |
| docs | F007 "root cause UNKNOWN, press Retry" · `current-spec.md:66-67` stale seam note · `worker.ts:23` "applies 001/002/003" | F007 → root cause + fix · `web-client-runtime/current-*` (resilience + D5 + BR-RT-BOOT) · comment fixed · `decisions.md` entry | §XXIX current |

`OPEN_ACK_TIMEOUT_MS` = **60 000** [INTERP — grounded]: the docs fix "no hang" but no value (`current-spec.md:77`); the ack
can only be sent after the worker module evaluates, measured at up to 12.2 s in dev under load, so the receipt watchdog
must sit well above that; 60 s ≈ 5×. A crash or module load failure still rejects immediately through `onerror`.

## Acceptance (revised — replaces the filing's list)
- [x] Root cause stated per symptom with reproduction, FACT-labelled (§ Triage).
- [x] Dev 10/10 and prod 10/10 boots, fresh origin + reload, **including 3-parallel load** (the condition that reproduced
      the prod timeout), Brave; no timeout screen; console clean. → dev fresh 10/10 (under build load; 6 opens >15 s) ·
      dev reload 10/10 · prod fresh 10/10 · prod reload 10/10 · prod 3-parallel ×3 = 9/9 (was 0/3).
- [x] Retry after a forced failure opens without a second connection (one `adapter.open` per worker). → proven at unit
      level (`worker.test.ts`, mutation-checked); not live — the fixed app no longer reaches the Retry screen.
- [x] `getServices()` recovers after a rejected build. → `composition-root.singleton.test.ts` (mutation-checked).
- [x] Year range settle **measured and recorded** on the booting prod build (PLAN-S7 §D), read against
      `performance-strategy.md` §1. → Month→Year ×7: 1 495 (first, incl. the lazy chunk) / 347 / 348 / 329 / 373 / 245 /
      210 ms — median 347 ms; fresh vault (S7 found the range render-bound, reads ≈ 6 ms).
- [x] Prod-build Playwright OPFS smoke green locally (`PW_EXECUTABLE_PATH` = Brave on macOS 12); `e2e` script wired.
      → `test:e2e:prod` green; `/favicon.ico` 404 answered in-spec (docs: noise, fe-notes envision.md:21,99).
- [x] `@vida/web` suite + tsc + eslint green; `@vida/core` untouched. → 759/771 in the loaded full run; the 12 failures
      (UI files, vitest timeouts while other sessions ran suites) all pass in isolation and none import `src/db`; tsc 0;
      eslint 0 errors.
- [x] §XXIX currency (F007 · web-client-runtime `current-*` · db + e2e `CLAUDE.md` · decisions).

## Build steps (ordered; each leaves the tree green)
1. `web-adapter.ts` single-flight bootstrap — no deps — risk: `destroy` must reset it (covered).
2. `worker.ts` ack + idempotent `open` + worker test — dep 1 — risk: `close` then `open` in one worker must reopen (memo reset in `close`).
3. `client.ts` per-op deadline + `client.test.ts` rewrite — dep 2 (protocol) — risk: an ack arriving after the final
   reply must be ignored (the pending entry is gone → no-op).
4. `composition-root.ts` memo-on-reject + singleton test — no deps — risk: none (success path unchanged).
5. Prod Playwright config + spec + `e2e` script — dep 1–3 — risk: OPFS isn't reset between contexts (playwright#29901) → the route-served reset page.
6. Verify: boot loop 10/10 dev + prod incl. load · Retry probe · Year re-time · suites/tsc/eslint — dep 1–5.
7. Currency + commit/PR — dep 6.

## Out of scope
Page teardown / bfcache (preferences-rescope R1) · the `App.tsx` boot gate and boot frame (R3) · first-run migration cost
(no doc budget; measured above, recorded) · `@vida/core` migration runner · anything M2–M4 (crypto, sync, multi-device).
