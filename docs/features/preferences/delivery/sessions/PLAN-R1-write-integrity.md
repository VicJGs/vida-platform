<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R1 · Write integrity (data plane)
     Source of scope: delivery/slice-map.md R1 (APPROVED by Victor 2026-10-21) · ledger rows B5 + F18 (lock half).
     No-Guessing: [FACT: path:line] · [INTERP — grounded] · [EXTERNAL: spec] · [UNKNOWN]. -->

# PLAN-R1 — Write integrity (data plane)

> **Status:** rev 2, 2026-10-21. rev 1 went to an independent critique (REVISE: 3 blocking, 5 nits); all are folded in (§7). Awaiting Approval 1.
> **Plane:** shared → **Verification Gate**. **Context baseline (§XXVI.1a):** `docs/infrastructure/web-client-runtime/current-*`
> read; BR-RT-D5 / BR-RT-COMPROOT / BR-RT-BOOT are the rules touched (`current-business-rules.md:54-66`). The code read is
> the source (cited below). No `docs/modules/*` context changes in R1.

## 1. Problem (ledger B5, STRUCTURAL; F18 lock half)

- Every Repository write runs in `db.transaction` `[FACT: packages/core/src/db/repository.ts:351,405,469]`, and so do
  most service-level writes (sessions :306, books :916, effects :44, economy/tasks handlers, notifications :379, all
  via `tx`/`createInTx`). **Exception:** `packages/core/src/services/gamification/service.ts:384` (`seedAchievements`) runs a
  bare `db.insert(...).run()` outside any transaction. It is not wired into apps/web today (`use-achievements.ts` stubbed),
  so it can't overlap yet; it is an edge to gamification-rescope (R1-BR-5). drizzle's `db.transaction` calls
  `this.session.transaction` `[FACT: drizzle-orm@0.45.1 sqlite-core/db.js:300]`, and every repo/service holds the one
  `db` from `apps/web/src/db/composition-root.ts:65`; nothing uses `db.session`/`db.batch` (only `_legacy`) or
  `tx.transaction` (no savepoints), so wrapping the instance's `transaction` intercepts every path.
- drizzle's sqlite-proxy `transaction` = `run('begin')` → `await callback(tx)` → `run('commit')` (or `rollback`), **each a
  separate async call with no mutex** `[FACT: node_modules/.pnpm/drizzle-orm@0.45.1…/sqlite-proxy/session.js:46-56]`.
  The proxy callback forwards each statement to the worker RPC `[FACT: packages/core/src/db/adapter.ts:182-199]`, and
  `WorkerDbClient` only correlates replies `[FACT: apps/web/src/db/client.ts:62-97]`.
- So two transactions in flight from any services interleave on the one connection: the second `begin` throws
  ("cannot start a transaction within a transaction"), or a foreign statement lands inside an open transaction and
  commits or rolls back with it. Preferences is the first consumer with routine concurrent multi-table writes
  (R2 queues × nav × ⌘K history × notes autosave).
- **Raw `driver.run` writes outside any transaction:** `composition-root.ts:53` (`deviceId`, inside `build()` before
  any service exists, so it cannot overlap) and **`onboarding/first-run-repo.ts:23`** (the first-run marker, which
  _can_ land inside an open transaction and roll back with it; onboarding would then re-show on reload).
- **F18, lock half:** `boot.ts:26` calls `client.terminate()` on `beforeunload` `[FACT: apps/web/src/db/boot.ts:22-27]`.
  `beforeunload` is cancelable, so a navigation cancelled at a "leave site?" prompt would leave a live page with a
  dead worker. The app registers no prompt today; one could come from an extension or future code
  `[EXTERNAL: HTML spec, beforeunload is cancelable]`. **Honest limit:** a drizzle transaction needs a main-thread round
  trip per statement, so once the document is gone `commit` is never sent and a half-done transaction rolls back however
  the worker dies. Only R2's `visibilitychange: hidden` flush, which runs while the page is alive, protects pending writes.

## 2. Business rules (what must be true after R1)

- **R1-BR-1 · One writer at a time.** At most one `db.transaction` callback runs at any moment app-wide. Concurrent callers
  queue FIFO and run to completion in order.
- **R1-BR-2 · Always released.** The lock is released in `finally`, whether the transaction commits, rolls back, or its
  RPCs reject (worker death / 15 s RPC timeout, `client.ts:50`). A failure in one transaction never wedges the queue.
- **R1-BR-3 · Never hangs silently.** A caller waiting on the lock longer than `LOCK_WAIT_TIMEOUT_MS` rejects with a typed
  `TransactionLockTimeoutError`, **and its slot still forwards the predecessor's release**, so a timed-out waiter never
  blocks the callers behind it. Failure mode, documented: a nested-call deadlock freezes all writes for up to 30 s, and every
  write queued in that window fails together. In dev only, a `console.warn` with the holder's stack fires when the lock has
  been held more than 5 s, so a deadlock surfaces early. This is the loud failure for the forbidden pattern R1-BR-4 (a nested `db.transaction`
  from inside a callback deadlocks by construction, because JS cannot tell a nested caller from a concurrent one without
  async context). `[INTERP — grounded: browsers have no AsyncLocalStorage; property 2 of ledger B5]`
- **R1-BR-4 · No re-entrancy (rule).** Inside a transaction callback, only `tx` / `*InTx` APIs. Today's code complies
  (B5 sweep). The rule is written into `packages/core/src/db/CLAUDE.md` (or the repository doc) and the web-client-runtime BRs.
- **R1-BR-5 · Every write is transactional or exclusive (rule).** After `build()`, every write is `db.transaction`, a
  `*InTx` API, or `writeLock.runExclusive(...)`, never a bare `db.insert/update/delete().run()` or `driver.run`.
  `writeFirstRunComplete` moves onto `runExclusive`. The `deviceId` write stays raw (it runs inside `build()` before any
  service exists; documented). `seedAchievements` (bare insert) is recorded as an edge on gamification-rescope.
- **R1-BR-6 · Accepted leak (documented, not fixed).** Non-transactional **reads** are not locked, so they can observe
  another transaction's uncommitted rows. On a rollback, such a read may cache a phantom value. R2's
  invalidate-on-empty-queue corrects it for preferences. Locking reads would serialize the whole app for no M1 gain.
- **R1-BR-7 · Per-table queues are still required** (R2). The lock serializes begin…commit, not the read-then-create
  before it (`service.ts:263-266`).
- **R1-BR-8 · Teardown on non-cancelable events only.** Replace `beforeunload → terminate()` with:
  - **`pagehide`:** if `event.persisted` (entering bfcache), `terminate()` the worker. A frozen page must not keep the
    exclusive OPFS handles (`AccessHandlePoolVFS`), or a new tab or a URL return would hit "in use" until eviction.
  - **`pageshow`:** if `event.persisted` (restored from bfcache), `location.reload()`. No respawn plumbing needed.
  - **A normal unload** (not persisted): no explicit terminate. The browser closes the dedicated worker when its document
    is discarded `[EXTERNAL: HTML Living Standard, "the worker's lifetime"]`. The reload path is already proven without
    an unload terminate: the e2e harness builds `new WorkerDbClient()` with no listener `[FACT: apps/web/e2e/harness.ts:53]`,
    and `db-persistence` / `data-plane-crud` reload + reopen green in CI.
  - `pagehide` is not cancelable, so the cancelled-navigation hole closes.

  This replaces the slice-map's "teardown waits for lock idle" (an unload handler cannot await) with the same intent (§6).

## 3. Design

- **`apps/web/src/db/write-lock.ts` (new, module singleton):**
  `createWriteLock({ waitTimeoutMs, holdWarnMs? })` → `{ runExclusive<T>(fn: () => Promise<T>): Promise<T>; isIdle(): boolean }`.
  It is a promise-chain FIFO mutex with a **forwarding rule**:
  1. Each call creates a `done` deferred; `prev = tail; tail = done`; `pending++`.
  2. `await Promise.race([prev, timer])`.
  3. **On timeout:** `prev.then(resolveDone)` (forward the predecessor's release to whoever queued behind this slot),
     never run `fn`, `pending--`, reject with `TransactionLockTimeoutError`.
  4. **On acquire:** clear the timer; `try { return await fn() } finally { pending--; resolveDone() }`.

  `isIdle()` = `pending === 0`. Exported singleton `writeLock` (the app has one connection). `isIdle()` serves R2's flush
  logic and tests.

- **`withTransactionLock(db, lock): DrizzleDb` (same file):** mutates the instance **in place** (a spread or copy would lose
  the prototype methods): `const orig = db.transaction.bind(db); db.transaction = ((cb, cfg) => lock.runExclusive(() =>
orig(cb, cfg))) as typeof db.transaction; return db`. The `as typeof` cast keeps the generic `<T>` signature. Every other
  method is untouched. It is applied once in
  `composition-root.ts` `build()`: `const db = withTransactionLock(createDrizzleProxy(driver), writeLock)`.
- **`LOCK_WAIT_TIMEOUT_MS = 30_000`**: a practical bound, **not** a proof. Normal writes are ms-scale; a pathological
  holder (a 15 s mid-transaction RPC timeout + a hung rollback) can exceed it, in which case the waiter fails loudly,
  which is the intended behavior. `[INTERP — grounded: client.ts:50 RPC_TIMEOUT_MS = 15 000]`
- **`first-run-repo.ts`:** `writeFirstRunComplete` → `writeLock.runExclusive(() => driver.run(...))`.
- **`boot.ts`:** replace the `beforeunload` listener with the `pagehide`/`pageshow` pair (R1-BR-8); keep
  `WorkerDbClient.terminate()`.
- **Home rationale:** apps/web `db/` (BR-RT-HOME). Mobile/desktop proxies will face the same drizzle-proxy property; that is
  recorded as an M4 portability note in `apps/web/src/db/CLAUDE.md` + `docs/infrastructure/web-client-runtime/current-spec.md`, not built now (YAGNI).

## 4. Acceptance (Verification Gate)

1. **Unit (Vitest, `apps/web/src/db/write-lock.test.ts`):** FIFO order under 5 concurrent `runExclusive` · release after a
   throwing body · a waiter past the timeout rejects with `TransactionLockTimeoutError` (fake timers) · **forwarding: A holds,
   B times out, C (queued after B) runs as soon as A releases** · `isIdle()` true only with nothing held or queued · the dev
   hold-warning fires past `holdWarnMs`.
2. **Unit (wrapper):** a fake driver records statement order; two concurrent `db.transaction` calls produce `begin…commit`
   blocks that **never interleave**. **Without** the wrapper, the same test shows interleaving (the regression proof). A
   throwing callback issues `rollback` and releases. **Worker death:** a driver that rejects or hangs mid-transaction →
   the lock releases, and queued transactions then run or fail loudly. A nested `db.transaction` inside a callback →
   `TransactionLockTimeoutError` (fake timers), not a hang.
3. **Unit (composition root):** with a fake driver, `getServices()` → two concurrent `notes.createPage` → no interleave.
   This proves `build()` applies the wrapper; nothing catches a dropped wrapper today.
4. **Unit:** `writeFirstRunComplete` waits for an in-flight transaction (ordering on the fake driver).
   `boot.ts` registers `pagehide`/`pageshow`, not `beforeunload` (listener spy).
5. **Regression:** the whole apps/web Vitest suite green · `@vida/core` suite green · `tsc` 0 · eslint 0.
6. **Live smoke on the real store** (Brave via the browser MCP on `pnpm dev:app`, real OPFS; macOS 12 can't run Playwright
   locally, e2e/CLAUDE.md). The services are reached from the devtools console via Vite dev
   `const { getServices } = await import('/src/db/composition-root.ts')`.
   - **(a) Bug before the fix:** on `main`, `Promise.all` of ~10 `notes.createPage` + `notes.ensureJournal` reproduces
     "cannot start a transaction within a transaction".
   - **(b) Fix:** the same burst on R1 → all succeed; reload → every row persists; console clean.
   - **(c) Teardown:**
     - 10 rapid reloads;
     - leave to another site and return by typing the URL;
     - Back/Forward (bfcache restore) then a write;
     - a second tab.

     Each boots with no `NoModificationAllowedError` / "in use". The second tab expects the existing exclusive-handle
     error screen (platform behavior, pass-8), not a hang.

   - **CI:** `apps/web/e2e/write-lock.spec.ts` drives the **app page** (`/`, not `harness.html`, which doesn't load the
     app) and runs (b) through the same dynamic import.

7. **Docs (§XXIX, same commit):**
   - web-client-runtime `current-business-rules.md` + `current-spec.md`: BR-RT-LOCK (R1-BR-1…8) + the BR-RT-D5 note +
     the M4 portability note.
   - `apps/web/src/db/CLAUDE.md`: the lock, the R1-BR-5 rule, and the teardown rule.
   - `packages/core/src/db/CLAUDE.md`: the R1-BR-4/5 rule.
   - `apps/web/e2e/CLAUDE.md`: the reload/bfcache handle note.
   - reconciliation B5: the gamification correction; F18 + the slice-map R1 row amended per §6.
   - R1-BR-6 cross-referenced into R2's plan inputs: R2 must inherit invalidate-on-empty-queue.

## 5. Risks

- **Perf:** writes are serialized app-wide. Each is ms-scale on OPFS; M1 is single-user, so negligible. Reads are unaffected.
- **A long transaction blocks others:** bounded by the RPC timeout; R1-BR-2 guarantees release.
- **Hidden nested callers:** the B5 sweep found none; R1-BR-3 makes any future one fail loudly in 30 s instead of hanging.

## 6. Deviation from the approved slice-map (for Approval 1)

_(rev 2: the design is the `pagehide`/`pageshow` pair, see R1-BR-8.)_
The slice-map's R1 done-when says "teardown waits for the lock to go idle · `pageshow` (persisted) respawns the worker".
An unload handler cannot await anything, so "teardown waits for the lock to go idle" is not implementable. The intent
(teardown never strands the OPFS handles or kills a live page's worker) is met by R1-BR-8: terminate only on a persisted
`pagehide`, reload on a persisted `pageshow`, and let the browser discard the worker on a normal unload. A half-done
transaction at unload rolls back regardless (§1, honest limit); R2's `visibilitychange` flush is what protects pending
writes. R2's `visibilitychange`/`pagehide` flush is unaffected. On
approval, the slice-map row and ledger F18 are amended to match (§XXVIII: recorded, not silent).

## 7. Gate record

- **rev 1 → independent critique: REVISE** (3 blocking, 5 nits). Folded:
  - B1: the mutex forwarding rule, plus the A/B/C unit test.
  - B2: R1-BR-8 redesigned as `pagehide`/`pageshow` (bfcache handle release), with the reload evidence (`harness.ts:53`)
    cited, live teardown checks added, and the honest "a transaction can't finish after unload" limit stated.
  - B3: the [FACT] corrected (gamification `seedAchievements` bare insert) and widened into rule R1-BR-5 + an edge.
  - Nits: in-place wrapper + cast · 30 s as a bound, not a proof, with the failure mode + dev hold-warning · acceptance adds
    worker death, a composition-root test, bug-before-fix live repro, the console import mechanism, and the e2e driving
    the app page · the Currency list completed · the R1-BR-6 → R2 cross-reference.

## 8. Verification Gate record — R1 (2026-10-21) · **PASS**

- **Unit (Vitest):** `write-lock.test.ts` 11 · `composition-root.test.ts` 1 (real `notes.createPage` ×2 over a fake driver) ·
  `boot.test.ts` 5 (jsdom) · `first-run-repo.test.ts` 6. All green.
  - **Regression proof:** without the wrapper, drizzle transactions interleave (test asserts it).
  - **Mutation check:** forwarding `void prev.then(resolveDone)` → `resolveDone()` fails the A/B/C test; restored from a copy → green.
- **Static:** `tsc --noEmit` 0 · eslint 0 errors (4 pre-existing `any` warnings in `client.test.ts`, untouched).
- **Suites:** web 690 / core 2011.
  - Under load (two dev servers + the browser): 18 web reds + 1 core red.
  - Quiet re-run: web 688/690. The 2 remaining (`App.integration` ⌘K, `App.test` guided-setup) pass alone on R1 **and**
    on `main` → load flakes (memory: heavy Tamagui shell tests).
  - Core red = `vault.test.ts` 1 MB → **F006** (environmental; 36/36 alone). R1 changes no core code.
- **Live smoke on real OPFS** (Brave via the browser MCP; isolated origins :5175 main / :5174 R1; Victor's :5173 vault untouched):
  - **Bug before the fix (main):** 10×(`createPage` + `ensureJournal`) concurrent → **19/20 rejected** `Failed query: begin`;
    1/10 notes persisted.
  - **Fix (R1):** 0 transaction failures; 10/10 notes persisted; persisted across reload; console clean across all navigations.
    The residual rejections were `ensureJournal` ×N for one day → `UNIQUE pages.journal_date` (read-then-create, R1-BR-7);
    integrity held (1 row). Edge recorded on notes-rescope.
  - **Teardown matrix:**
    - 10 rapid reloads → boot + write ✅
    - away + back by URL → boot + write ✅
    - Back/Forward → boot + write ✅. The browser did a full `back_forward` load; **no bfcache restore occurred**
      (DevTools-controlled page), so the `persisted` branch is proven by unit tests only.
    - second tab → the existing exclusive-handle error screen (no hang); tab 1 unaffected ✅
- **/critique (implementation): REVISE** (3 blocking, 10 nits) → folded:
  - B1: the e2e pre-creates today's journal on the **local** date (not UTC).
  - B2: the forwarding test asserts C does not run before A releases (proven by the mutation check).
  - B3: the R2 flush is relabelled `[INTENT]` in BR-RT-TEARDOWN.
  - Nits: timeout message · no-loop comment · stack assertion · `restoreAllMocks` · the `tx.transaction` savepoint path
    documented · the e2e landmark wait · the "same instance" overclaim removed.
- **e2e `write-lock.spec.ts`:** written for CI; not run locally (macOS 12; CI billing-blocked).
- **Currency (§XXIX):** web-client-runtime `current-business-rules.md` (BR-RT-LOCK, BR-RT-TEARDOWN, the D5 note) +
  `current-spec.md` · `apps/web/src/db/CLAUDE.md` · `packages/core/src/db/CLAUDE.md` · `apps/web/e2e/CLAUDE.md` ·
  reconciliation B5/F18 · slice-map R1/R2 rows + the notes edge.
- **/verify (pre-commit):** verified against drizzle-orm v0.45.1 (installed `sqlite-proxy/session.js:46-57`, `sqlite-core/db.js:300`) and
  MDN (`pagehide`, `PageTransitionEvent.persisted`). MDN: `beforeunload`/`unload` listeners **prevent bfcache inclusion**,
  and `pagehide` is bfcache-compatible. So the removed listener had been disqualifying the app from bfcache. Post-R1 the
  page is bfcache-eligible in normal browsing, which makes `pagehide(persisted) → terminate` the necessary handle release.
