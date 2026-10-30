<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R1 · Write integrity
     Implements PLAN-R1-write-integrity.md rev 2 (Approval 1: Victor 2026-10-21). Build steps are TDD-ordered. -->

# IMPLEMENTATION-PLAN-R1 — Write integrity

> **Status:** rev 3, 2026-10-21. /preflight: 2 gaps folded → **PASSED**. Critique (§XXVI step 5): REVISE, 2 blocking + 8 nits → folded (§Gate record). Awaiting **Approval 2**.
> **Verification of record:** the live browser-MCP smoke (macOS 12 can't run Playwright; CI billing-blocked). The e2e spec is for CI when it returns.
> **Env:** worktree `preferences-rescope`, Node 24 (`PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"`), deps installed,
> `@vida/{types,ui,editor,core}` built. Commands run from the worktree root.

## Files (in build order)

| #   | File                                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/web/src/db/write-lock.test.ts`             | **new**: unit tests for the lock + the wrapper (PLAN §4.1, §4.2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2   | `apps/web/src/db/write-lock.ts`                  | **new**: `TransactionLockTimeoutError`, `createWriteLock`, `writeLock` singleton, `withTransactionLock`, `LOCK_WAIT_TIMEOUT_MS`, `LOCK_HOLD_WARN_MS`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3   | `apps/web/src/db/composition-root.test.ts`       | **new**: `getServices()` applies the wrapper (PLAN §4.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 4   | `apps/web/src/db/composition-root.ts`            | `const db = withTransactionLock(createDrizzleProxy(driver), writeLock)` + the header note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5   | `apps/web/src/onboarding/first-run-repo.test.ts` | extend: the marker write waits for an in-flight exclusive section (PLAN §4.4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6   | `apps/web/src/onboarding/first-run-repo.ts`      | `writeFirstRunComplete` → `writeLock.runExclusive(...)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | `apps/web/src/db/boot.test.ts`                   | **new**: `getDbClient()` registers `pagehide`/`pageshow`, not `beforeunload`; persisted `pagehide` → `terminate()`; persisted `pageshow` → `location.reload()`; non-persisted → neither                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8   | `apps/web/src/db/boot.ts`                        | replace the `beforeunload` listener (R1-BR-8) via an exported `registerTeardown(target, client, reload)` helper (testable; `getDbClient` calls it with `window`, the client and `() => location.reload()`)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 9   | `apps/web/e2e/write-lock.spec.ts`                | **new**: drives the app page `/`, a burst of concurrent writes via `await import('/src/db/composition-root.ts')`, reload, rows persist (CI; macOS 12 can't run it locally)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 10  | docs (§XXIX)                                     | `docs/infrastructure/web-client-runtime/current-business-rules.md` (BR-RT-LOCK) + `current-spec.md` (lock + teardown + M4 note) · `apps/web/src/db/CLAUDE.md` · `packages/core/src/db/CLAUDE.md` (R1-BR-4/5 rule) · `apps/web/e2e/CLAUDE.md` (handle note) · `delivery/reconciliation.md` B5 (gamification correction) + F18 + `delivery/slice-map.md` R1 row (amended per PLAN §6) · **`delivery/slice-map.md` R2 row gains an "inherits from R1" note** (R1-BR-6: invalidate-on-empty-queue corrects phantom reads; R1-BR-7: per-table queues still required) · `current-business-rules.md` also gets the **BR-RT-D5 note** (writes are serialized by BR-RT-LOCK) |

## Build steps

1. **Lock tests first (red):**
   - FIFO order: 5 concurrent `runExclusive` calls push 1..5.
   - Release after throw: the next caller runs.
   - Timeout (`vi.useFakeTimers`): a waiter past `waitTimeoutMs` rejects with `TransactionLockTimeoutError`.
   - **Forwarding:** A holds, B times out, C (queued after B) resolves right after A releases.
   - `isIdle()` across the states.
   - Hold-warning: an injected `warn` spy fires after `holdWarnMs`, and its message **includes the holder's stack**
     (`new Error().stack` captured at acquire). Production wiring passes `warn` only when `import.meta.env.DEV`.
2. **Wrapper tests (red):** a fake `SqliteDriver` logs `[sql]` and returns `[]` from `values`, with an optional per-call
   delay or throw. `createDrizzleProxy(fake)` then:
   - **without** the wrapper, two `Promise.all` `db.transaction` calls (each: an `insert`-like `tx.run(sql\`…\`)`with an
awaited delay) → the log shows interleaving (assert`begin, begin` adjacency or a foreign statement between a
     begin/commit pair);
   - **with** the wrapper → strict `begin…commit` blocks;
   - a throwing callback → `rollback` logged + lock idle after;
   - a driver rejecting mid-transaction (worker death) → the caller rejects (assert the rejection, **not** the message:
     drizzle's `rollback` also hits the dead driver and replaces the error), the lock is idle, and a queued transaction
     then completes. **"Hangs"** is covered upstream: `client.ts`'s 15 s RPC timeout turns a hang into a rejection, and the
     existing `client.test.ts` timeout test plus this reject test cover it together;
   - a nested `db.transaction` inside a callback → `TransactionLockTimeoutError`, driven with
     `await vi.advanceTimersByTimeAsync(30_000)` (fake timers also fake the driver delays); inject a `warn` spy so the 5 s
     hold-warn doesn't pollute output.
   - The interleave without the wrapper is deterministic even with no delays: each `driver.run` is async, so `Promise.all`
     logs `begin, begin` before either callback runs. The fake implements all six `SqliteDriver` methods
     (`adapter.ts:60-85`).
3. **Implement `write-lock.ts` (green).** Exactly the PLAN §3 forwarding algorithm; no dependencies.
4. **Composition-root test (red → green):** a single test, so the module singleton is fresh.
   - `vi.mock('./boot', …)`: `ensureDbReady` resolves; `getDbClient()` returns `{ driver: fake }`. The fake `query` returns
     `[{ value: 'dev-1' }]` (the `device_id` read), `values` returns `[]`, and `run` logs.
   - **Don't mock `@vida/core`:** `initVault` must run for real (`sodium.ready` loads in node).
   - `const s = await getServices()`, then `Promise.all([s.notes.createPage({ type: 'note', title: 'a' }),
s.notes.createPage({ type: 'note', title: 'b' })])`. The non-journal path has no reads
     (`services/notes/service.ts:106-124`), so empty `values` is fine.
   - Assert the log has two strict `begin…commit` blocks.
5. **Wire the composition root** (one line + the header note).
6. **First-run marker:** test (the marker write logs only after an in-flight `runExclusive` body finishes) → implement.
7. **Boot teardown:** `boot.test.ts` with the `// @vitest-environment jsdom` docblock (the apps/web default is `node`, where
   `typeof window === 'undefined'` and the test would pass for the wrong reason).
   - `vi.mock('./client', () => ({ WorkerDbClient: class { terminate = h.terminate; driver = {} } }))`. The real ctor
     spawns a `Worker`, which neither node nor jsdom has (`client.ts:52-55`).
   - Test `registerTeardown(window, client, reload)` directly, with a `reload` spy. Never spy on `location.reload`: it's
     unforgeable in jsdom.
   - Dispatch `new PageTransitionEvent('pagehide', { persisted: true|false })` + `pageshow`.
   - Plus one `getDbClient()` test (`vi.resetModules()` + dynamic `import('./boot')`) asserting that it calls
     `registerTeardown` and that no `beforeunload` listener is added.
8. **e2e spec** (`write-lock.spec.ts`, from `./fixtures`): **request the `db` fixture** (it resets OPFS on the never-opened
   harness page, `fixtures.ts:21`), then `page.goto('/')`. Do **not** call `db.open`, since the app opens the DB itself.
   Assert module identity: two `import('/src/db/composition-root.ts')` evaluations return the same `getServices`.
   **Wait for the onboarding or home screen to render before the import**, so the app's own `ensureDbReady` has opened
   the DB (no racing the first open).
9. **Gates:**
   - `pnpm --filter @vida/web test` (whole suite; re-run any Tamagui shell test alone before calling it a flake, memory)
   - `pnpm --filter @vida/web typecheck` (`tsconfig` includes `src` only, so the e2e spec isn't type-checked, the same as
     the existing specs)
   - `pnpm --filter @vida/web lint` + `pnpm --filter @vida/web exec eslint e2e`
   - `pnpm --filter @vida/core test` + `typecheck` (core is untouched; this is a regression check; check better-sqlite3 vs
     Node 24 first)
10. **Live smoke** (Brave/Chromium via the browser MCP on `pnpm dev:app`):
    - **Bug before the fix:** in a **throwaway `git worktree` at `origin/main`** (it needs its own `pnpm install` + the
      `@vida/*` builds) served on a **different port** (a different origin gives clean, separate OPFS; same-port runs would
      share storage), console `Promise.all` of 10 × (`notes.createPage` + `notes.ensureJournal(today)`) shows "cannot start a
      transaction within a transaction". Record the console text.
    - **Module identity first:** two console `import()`s return the same `getServices`, and the devtools threads list
      shows one DB worker.
    - **Fix:** the same burst on R1 → all resolve; reload → `listPages` count matches; console clean.
    - **Teardown matrix:** 10 rapid reloads · away + back by URL · Back/Forward then a write · a second tab (expect the
      existing exclusive-handle error screen, not a hang). Capture screenshots + console logs as evidence in the gate record.
11. **Docs** (step 10 of Files) in the same commit. Then `/critique` on the changed files → the Verification Gate record →
    commit `feat(web): R1 write integrity — app-wide transaction lock + bfcache-safe teardown (preferences-rescope)`
    _(commit only on Victor's say-so)_.

## Done = PLAN-R1 §4 acceptance 1–7 all evidenced in a gate record appended to PLAN-R1 §7.

## Gate record

- **rev 1 → /preflight: 2 gaps** (e2e OPFS reset via the `db` fixture · console-import module identity) → folded → PASSED.
- **rev 2 → critique (§XXVI step 5): REVISE** (2 blocking, 8 nits). Folded:
  - B1: the boot test runs under jsdom, with a mocked `WorkerDbClient` and a `registerTeardown` seam (no `location.reload`
    spy).
  - B2: the R1→R2 cross-reference + the BR-RT-D5 note are now explicit build items.
  - Nits: step 4 resolved to `createPage` ×2 (no `buildDb` fallback) · the hang case is covered by `client.ts`'s timeout ·
    `advanceTimersByTimeAsync` + an injected `warn` · the holder stack is asserted · the gates use the package scripts ·
    the throwaway worktree runs on a separate port · the e2e waits for the first render · the worker-death test asserts the
    rejection, not the message.

## Risks / watch

- **Tamagui shell tests flake under load** (memory): re-run alone before treating a failure as a regression.
- **better-sqlite3 ABI vs Node 24** (memory): rebuild `@vida/core`'s native dep if the core suite fails at load.
- **A dynamic `import()` of a `/src` path is Vite-dev only.** The e2e and live smoke run against `vite dev`, which is how
  `playwright.config.ts`'s `webServer` runs.
