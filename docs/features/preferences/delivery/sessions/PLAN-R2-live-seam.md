<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R2 · Preferences live seam
     Scope: delivery/slice-map.md R2 (APPROVED 2026-10-21) · ledger rows B1 B3 A4 C1 C2 C3(mirror) C4 C5(mechanism) C6 C7
     C9 C10 C11 F1 F2 F10 F11(default) F18(queue half) · inherits R1-BR-6/7. No-Guessing: [FACT: path:line] · [INTERP] · [UNKNOWN]. -->

# PLAN-R2 — Preferences live seam

> **Status:** rev 2, 2026-10-21. rev 1 went to an independent critique (REVISE: 5 blocking, 12 nits); all are folded in (§6). Awaiting Approval 1.
> **Plane:** shared (+ backend F11) → **Verification Gate**, plus a regression check (Settings renders persisted values).
> **Context baseline (§XXVI.1a):** `docs/modules/preferences/current-*` (Step 0) + web-client-runtime `current-*` (updated by R1).
> R2 changes **no visible UI**. Panes keep binding the stores; R3–R6 move each pane onto the seam.

## 1. Problem (as-built)

- `preferences` is not registered `[FACT: apps/web/src/db/composition-root.ts:36-39,81]`.
- `usePreferences` returns the two Zustand stores + a hard `state:'success'`, and `useUpdatePreferences` has a no-op persist
  and no callers `[FACT: apps/web/src/settings/use-preferences.ts:22-43]`.
- The stores are the in-session source (drift, gate A6) `[FACT: stores/preferences-store.ts:68-94; stores/theme-store.ts:26-33]`.
- `QueryClientProvider` wraps only the router branch; the first-run Onboarding (mutually exclusive) and the guided-setup
  overlay sit outside it `[FACT: App.tsx:~101-130]`.
- `feature_gamification` defaults to `true` against GM-1 opt-in `[FACT: packages/core/src/services/preferences/service.ts:88]`.
- The service's singleton create is read-then-create, with no DDL uniqueness `[FACT: service.ts:263-266]`, and `updatePreferences`
  replaces whole JSON columns `[FACT: fe-settings seam-contract.md:60-68]`.

## 2. Business rules (after R2)

- **R2-BR-1 · Source of truth = React Query over SQLite** (A6). Two **non-overlapping** keys under one family prefix:
  `['preferences','user']` → `getMergedPreferences()` and `['preferences','nav']` → `getNavPreferences()`. Every per-table
  cancel/invalidate targets its exact key, so a user-table invalidate never refetches nav mid-patch.
  `['preferences']` is used only for a family-wide invalidate. Cache category **low-volatility: `staleTime` 5 min · `gcTime`
  30 min** `[FACT: docs/core/architecture/performance-strategy.md:242,263-268; BR-RT-5]`.
- **R2-BR-2 · One view, never `undefined`.** A pure mapper builds `PreferencesView` from the two merged rows (PR-2):
  - `theme 'system'` → mode `light` (N9);
  - `compact_mode` ↔ density;
  - the `dashboard_layout.{theme, arrangement, moduleNames, transition}` sub-keys, each validated with a per-sub-key
    fallback (unknown preset → `THEME_DEFAULT.preset`; unknown arrangement → `journalFirst`; non-string name → dropped);
  - scalar degrade (`week_starts_on ∉ {0,1}` → 1; `date_format` outside the 3 options → `YYYY-MM-DD`);
  - persona `null` ↔ the `'unset'` sentinel (no `PERSONA` collision, `user.ts:13-20`).

  `defaultView()` is the mapper over the service DEFAULTS, so parity holds by construction (C10/IR-7).

- **R2-BR-3 · ONE merge function per table.** `applyUserPatch(merged, patch)` / `applyNavPatch(merged, patch)` are the
  only way a patch is applied. They are used for the optimistic cache **and** for the in-queue merge against the freshly
  read row, so the two can never diverge.
  - Map-valued fields merge **as maps**: `module_visibility` and `dashboard_layout.moduleNames`, so `{a}` then `{b}` keeps
    both.
  - Every other `dashboard_layout` sub-key merges per key.
- **R2-BR-4 · The writer owns cache truth (one model, `preferences-writer.ts`).** Per table it keeps `confirmed` (the last
  good DB result or read) and `pending` (enqueued patches not yet confirmed). **The cache is always
  `applyPending(confirmed)`.**
  - **On enqueue:** `cancelQueries` on the exact key, then set the cache.
  - **On batch success:** `confirmed = result`, drop the batch's patches, set the cache to `applyPending(confirmed)` (so a
    patch still in the debounce is never wiped, IR-11). **Invalidate the exact key only when that table's queue is idle**
    (this also corrects R1-BR-6 phantom reads).
  - **On batch failure:** every caller in the batch rejects with the same typed error; drop the batch's patches; set the
    cache to `applyPending(confirmed)`, so the DB state plus any _later_ patches remains, never a stacked per-call snapshot.

  Because this lives in the writer (over the `lib/query-client.ts` singleton), **writes from outside React (F10 consumers)
  keep the cache correct too.** The hook keeps only the echo check + `saveState`.

- **R2-BR-5 · One serial write queue per singleton table**, with 500 ms debounce batching (PR-4). The batch's merge runs
  **inside** the queued task against a fresh read, then writes once via `updatePreferences` / `updateNavPreferences`
  (`setModuleVisibility` unused). That gives no lost update and no first-write double-create (IR-10/A4). R1's lock
  serializes the transaction; the queue owns read-then-write (R1-BR-7).
- **R2-BR-6 · No echo writes** (IR-1/C7): a patch equal to the current cached view is dropped before enqueue; hydration
  never writes.
- **R2-BR-7 · Flush while alive** (F18 queue half). On `visibilitychange: hidden` (first) and `pagehide`, every queue
  flushes its debounce immediately. Registered once by the bridge's `useEffect` (cleanup on unmount), not at import.
  - **Expected limit, stated up front:** a _reload_ inside the window can still lose the write. One write needs at least 4
    worker round trips (`repository.ts:405-451`) and the main-thread event loop stops at unload; a bfcache `pagehide`
    also terminates the worker (R1).
  - The deterministic guarantee is: **hide without unload → written immediately.** A hard reload within ~the RPC time of
    a change is the recorded known limit (F18).
- **R2-BR-8 · One exported write path** (F10): `writePreferences(patch)`, `writeNavPreferences(patch)`,
  `patchDashboardLayout(subPatch)`, `patchModuleNames(partial)`, `setModuleVisibilityMap(partial)`. Every
  `user_preferences` writer in any unit uses these; the cache stays correct by R2-BR-4.
- **R2-BR-9 · `saveState` under debounce:**
  - `'saving'` runs from enqueue (including the debounce wait) until the batch carrying the last call settles; it then
    becomes `'saved'` or `'error'`.
  - A view patch spanning both tables aggregates the two (any error → `error`; both done → `saved`).
  - `lastError: { kind: 'validation' | 'lock-timeout' | 'unknown'; cause: unknown }` (Zod failures throw a plain `Error`
    from the service; `TransactionLockTimeoutError` is already typed).
- **R2-BR-10 · Transitional mirror** (C3). `preferences-store` stays a mirror under `<PreferencesBridge/>`, hydrated **only
  after both keys succeed** and **only the fields whose DB value changed since the last hydrate** (a field diff), so a
  `setQueryData` for one field never wipes another pane's in-session edit. Each pane slice (R3/R5/R6) moves its fields;
  R6 deletes the store.
  - Remaining honest limit: an in-session edit to a not-yet-moved pane isn't persisted until its slice.
  - `refetchOnWindowFocus` is false, so re-hydration is rare.
- **R2-BR-11 · `feature_gamification` defaults to `false`** (GM-1; gate F11). The service DEFAULTS change. The schema
  `.default(true)` and migration 013's `DEFAULT 1` stay, because the service always writes full defaults on create.
  **Both docblocks are amended** to record the deliberate divergence (`service.ts:45-48` claims "mirrors EXACTLY"). No
  visible change: `isFeatureEnabled` is still stubbed fail-closed.

## 3. Design (new feature home `apps/web/src/preferences/`, the notes precedent `apps/web/src/notes/use-*.ts`)

| File                     | Role                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preferences-keys.ts`    | `PREFERENCES_FAMILY = ['preferences']`, `USER_PREFS_KEY = ['preferences','user']`, `NAV_PREFS_KEY = ['preferences','nav']`, `PREFERENCES_STALE_MS`, `PREFERENCES_GC_MS`                                                                                       |
| `preferences-view.ts`    | `PreferencesView` + the pure mapper: `toView(merged, nav)`, `defaultView()`, `toUserPatch(viewPatch)` / `toNavPatch`, **`applyUserPatch` / `applyNavPatch` (the one merge, map-aware)**, sub-key + scalar degrade, persona sentinel, `system→light`           |
| `write-queue.ts`         | `createWriteQueue({ debounceMs, write })`: per-table serial + debounced batching; `enqueue(merge)`, `flush()`, `isIdle()`. Plus `registerFlushOnHide(queues)`                                                                                                 |
| `preferences-writer.ts`  | the module-singleton writer over `getServices().preferences` + the `queryClient` singleton: per table `confirmed` + `pending` + its queue; cache = `applyPending(confirmed)`; success/failure sync (R2-BR-4); the exported write path (R2-BR-8); `flushAll()` |
| `use-preferences.ts`     | `usePreferences()` → `{ view, state, error }` (both keys) · `useUpdatePreferences()` → `{ update(viewPatch), saveState, lastError }`: an echo check + the writer call + saveState (R2-BR-6/9); no cache logic                                                 |
| `preferences-bridge.tsx` | `<PreferencesBridge/>`: under QCP; field-diff hydration of `preferences-store` after both keys succeed (R2-BR-10); registers the hide-flush once (R2-BR-7). Mounted once in App                                                                               |

Changes elsewhere:

- **`db/composition-root.ts`:** `Services.preferences` + `createPreferencesService({ db, deviceId })`, appended after
  `deviceId` (no service deps; ELC-3).
- **`App.tsx`:** hoist `<QueryClientProvider>` to wrap the Onboarding/router branch **and** the overlay + `ToastProvider`
  (B3, N7); mount `<PreferencesBridge/>`.
- **`settings/use-preferences.ts`:** removed. `settings-surface.tsx` reads `usePreferences().state` from the new module.
  `state` now really goes loading/error/success; the surface's existing error branch stays until R3 rebuilds EC-7
  (R3/D1). **Regression note:** Settings may briefly show its existing (pre-R3) error copy on a read failure. That is
  honest, unlike today's hard `success`.
- **`packages/core/.../preferences/service.ts`:** `feature_gamification: false` + its test (`preferences-service.test.ts:128`).
  Rebuild `@vida/core` dist.
- **Tests:** a new `apps/web/src/test/preferences-test-utils.tsx` exports `createPrefsWrapper()` + `compositionRootMock()`.
  `vi.mock` can't run inside a helper, so each test does
  `vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())`.
  `App.test.tsx` gains that mock (the bridge would otherwise call the real `build()`, which needs a Worker). The other N11
  files get the wrapper only where they now need it (F1).

## 4. Acceptance (Verification Gate)

1. **Mapper (unit):**
   - round-trip `view → patch → merged → view` for every field;
   - `system → light`;
   - every sub-key/scalar degrade case;
   - the persona sentinel both ways;
   - `defaultView()` = the store defaults;
   - map merges keep both keys (`module_visibility`, `moduleNames`);
   - through the real `UpdatePreferencesSchema` (catches a misnamed key, which Zod would otherwise strip).
2. **Queue (unit, fake timers):**
   - serial order;
   - 3 patches within 500 ms → one write;
   - a patch during an in-flight write → a second write, never concurrent;
   - a failing write rejects every caller in its batch, and the queue continues;
   - `flush()` and `isIdle`.
3. **Writer (unit, fake service that `await`s between `findAll` and `create`):**
   - **IR-10:** two concurrent first writes on a fresh fake → one create.
   - **IR-2:** `patchDashboardLayout({theme})` then `({arrangement})`, and `patchModuleNames({a})` then `({b})` → all survive.
   - **IR-11:** patch A; advance > 500 ms (A in flight); patch B; resolve A → the cache shows B.
   - **Failure restore:** 3 patches batch, the write fails → the cache = the DB state before the batch (+ later pending), not
     a stacked snapshot.
   - **Cross-table:** a nav patch pending while a user write settles → the nav optimistic value holds (no prefix refetch).
   - **F10:** `writePreferences` called outside React → a mounted `useQuery` sees the new value.
4. **Hook (RTL + wrapper):**
   - state `loading → success`, and `error` on a rejecting read;
   - an identical patch → no write;
   - `saveState` `saving` during the debounce → `saved`;
   - `error` + typed `lastError` on a rejection;
   - aggregated across tables.
5. **Bridge:** it hydrates only after both keys succeed, and only changed fields (an in-session edit to another field survives
   a `setQueryData`); the hide-flush is registered once, with cleanup.
6. **Composition root + core:** `getServices().preferences` exists; `feature_gamification` default false (test updated);
   core preferences suite green; `@vida/core` dist rebuilt.
7. **Regression:** the apps/web suite green with the wrapper/mocks (reds triaged as in R1); `tsc` 0; eslint 0.
8. **Live smoke on the real store** (browser MCP, a fresh isolated origin; console import of `/src/preferences/preferences-writer.ts`):
   - rapid mixed writes across both tables from a fresh vault → row count == 1 in each;
   - sub-keys + map entries survive;
   - reload → persisted;
   - **`visibilitychange: hidden` (simulated, no unload) right after a write → the row is written immediately**;
   - **reload inside the 500 ms window: run and record the outcome.** If lost, it is F18's known limit, not a gate failure;
   - Settings renders a persisted value through the bridge after reload;
   - console clean.
9. **Docs (§XXIX, same commit):**
   - `docs/modules/preferences/current-*` (② seam live; the DEFAULTS divergence; the cache category);
   - web-client-runtime: BR-RT-11 Providers (hoisted QCP), BR-RT-COMPROOT (`preferences` appended), **BR-RT-HOME amended**
     (feature folders `notes/`, `home/`, `preferences/` are practice), the **BR-RT-4 EC-7 exception**;
   - the `composition-root.ts` header "App.tsx untouched" and the `App.tsx:21` "Onboarding needs neither … the query client"
     comments;
   - the new `apps/web/src/preferences/CLAUDE.md`;
   - `settings/CLAUDE.md` (seam moved);
   - the `service.ts:45-48` + `schema/preferences.ts:83` docblocks (F11 divergence);
   - reconciliation row status.

## 5. Risks

- **The transitional mirror** (R2-BR-8): accepted, bounded by R6.
- **Hoisting QCP above Onboarding:** Onboarding uses no queries today, so there's no behavior change. Re-run `App.test` /
  `App.integration` alone.
- **Test blast radius (N11):** mitigated by the shared wrapper; stub-asserting tests get updated to the live contract,
  never deleted (F1).
- **`@vida/core` rebuild** needed for apps/web to see the default change (memory: editing types/core needs a dist rebuild).

## 6. Gate record

- **rev 1 → independent critique: REVISE** (5 blocking, 12 nits). Folded:
  - B1: non-overlapping exact keys `['preferences','user']` / `['preferences','nav']`.
  - B2/B3/B4: the writer owns cache truth, `confirmed + applyPending` (no wiping of a later patch on success; restore =
    confirmed + later pending on failure; F10 writers keep the cache correct).
  - B5: reload-in-window is an expected, recorded limit; the deterministic check is hide-without-unload.
  - Nits: bridge field-diff after both keys succeed · `moduleNames` map merge · one merge function · an awaiting fake for
    IR-10 · the F11 docblocks · the `vi.mock` pattern + the App.test mock · BR-RT-HOME/BR-RT-4/stale comments in Currency ·
    the hide-flush registered once · typed `lastError` · `saveState` semantics · cites refreshed.
  - The critique also confirmed: no split needed; the QCP hoist has no ordering issue; the `'unset'` sentinel is safe; the
    folder home matches practice.

## 7. Verification Gate record — R2 (2026-10-22) · **PASS**

- **Unit (Vitest), `apps/web/src/preferences/`, 44 tests:** mapper 13 · queue 6 · writer 15 · hooks 7 · bridge 3. Plus the
  composition-root assertion and the core default test (25/25).
  - **Mutation checks (3, each killed then restored from a copy):**
    - no pending re-apply on settle → IR-11 + cross-table fail;
    - `noteConfirmed` returns the raw read → B2 fails;
    - epoch guard removed → the epoch test fails.
- **Static:** `tsc` 0 · eslint 0 errors (4 pre-existing warnings in `client.test.ts`).
- **Suites:** the loaded run (load ~300, other sessions' full suites) gave 42 web reds in 34 files + core F006.
  - **Quiet re-run of exactly those 34 files (load 39): 33/34 pass.**
  - The last one, `settings-surface › EC-1` (the file's first, cold test), passes alone 11/11. It costs 2.9 s cold on R2
    vs 2.3 s on `main` (the query machinery + services mock), inside the 5 s budget when quiet → a load flake with a
    measured +0.5 s cold start.
  - Core = **F006** (vault 1 MB; 36/36 alone).
- **Live smoke on real OPFS** (browser MCP, a fresh origin :5176):
  - fresh vault, 9 concurrent mixed writes → **0 → exactly 1 row per table**, 0 failures;
  - every `dashboard_layout` sub-key + both maps survive;
  - invalid/global module keys → `InvalidModuleError`;
  - `feature_gamification` persisted `0`;
  - **hide (`visibilitychange`) right after a write → written in 51 ms** (the debounce is 500 ms);
  - reload → Settings route + the bridge hydrated every persisted value;
  - **reload inside the debounce → the write was LOST**: the stated F18 known limit, recorded;
  - console clean on the R2 page.
  - **Environmental, triaged, documented as F007:** the first worker `open` after a dev-server reload can exceed the 15 s
    RPC timeout under load; Retry recovers in ~250 ms. Reproduced on `main` and with the worker terminated pre-reload →
    not R1/R2.
- **/critique (implementation): REVISE** (3 blocking, 9 nits) → folded (see IMPLEMENTATION-PLAN-R2 "Build record"):
  - B1: the epoch-guard test, mutation-proven.
  - B2: no unhandled rejection for fire-and-forget writes.
  - B3: BR-PREF-6 on every `module_visibility` path, one typed error.
  - Nits: dispose on reset · `onSettled` try · adopt-when-unconfirmed · echo pass-through before the first read · EC-7
    failure folding · the "+ later pending" test made true · stale comments · the read-doc line.
- **Currency (§XXIX):**
  - `docs/modules/preferences/current-*` (② seam live; the DEFAULTS divergence; BR-PREF enforcement);
  - web-client-runtime BR-RT-4 exception, BR-RT-11 as-built, BR-RT-HOME, BR-RT-COMPROOT, the new BR-RT-PREFS + current-spec;
  - `apps/web/src/preferences/CLAUDE.md` (new) · `settings/CLAUDE.md` · the `service.ts`/`schema` docblocks;
  - known-failures F007.
