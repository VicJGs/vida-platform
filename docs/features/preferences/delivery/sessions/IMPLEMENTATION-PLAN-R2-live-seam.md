<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R2 · Preferences live seam
     Implements PLAN-R2-live-seam.md rev 2 (Approval 1: Victor 2026-10-21). TDD-ordered. -->

# IMPLEMENTATION-PLAN-R2 — Preferences live seam

> **Status:** rev 2, 2026-10-21. /preflight vs `docs/modules/preferences/current-business-rules.md`: 1 gap (BR-PREF-6) + 1 implicit rule (BR-PREF-9) → folded → **PASSED**. rev 3: critique (§XXVI step 5) REVISE, 4 blocking + 11 nits → folded (§Gate record). Awaiting **Approval 2**.
> **Env:** worktree `preferences-rescope` @ `7647502`, Node 24 (`PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"`).
> **Imports:** `MergedPreferences`, `MergedNavPreferences`, `PERSONA`, `Persona` from `@vida/types`
> (`entities/user.ts:13-21,253,267`) · `USER_PREFERENCES_DEFAULTS`, `NAV_PREFERENCES_DEFAULTS`, `PreferencesService` from
> `@vida/core` · `THEME_DEFAULT`, `THEME_PRESETS`, `ThemeSelection` from `@vida/ui` · `HomeArrangement`, `TimeFormat`,
> `WeekStartsOn` from `stores/preferences-store.ts` (moved into `preferences-view.ts` in R6) · `queryClient` from
> `lib/query-client.ts:15`.

## Files (build order)
| # | File | Change |
|---|---|---|
| 1 | `packages/core/src/services/preferences/service.ts` + `__tests__/preferences-service.test.ts:128` | `feature_gamification: false` + the docblock (F11 divergence); the test expects `false` · `schema/preferences.ts:83` comment · rebuild `@vida/core` dist |
| 2 | `apps/web/src/preferences/preferences-keys.ts` | keys + cache constants |
| 3 | `apps/web/src/preferences/preferences-view.test.ts` → `preferences-view.ts` | the `PreferencesView` type; `toView`, `defaultView`, `toUserPatch`, `toNavPatch`, `applyUserPatch`, `applyNavPatch`; degrade + sentinel |
| 4 | `apps/web/src/preferences/write-queue.test.ts` → `write-queue.ts` | `createWriteQueue<P>({ debounceMs, write })` |
| 5 | `apps/web/src/test/preferences-test-utils.tsx` | `createPrefsWrapper()` providing the **singleton** `queryClient` · `fakePreferencesService()` (in-memory, `await`s between read and create) · `compositionRootMock(extra?)`. **Must not import `db/composition-root` or `preferences-writer`, even transitively.** Each test: `afterEach(() => { queryClient.clear(); resetPreferencesWriterForTests() })` |
| 6 | `apps/web/src/preferences/preferences-writer.test.ts` → `preferences-writer.ts` | `createPreferencesWriter({ getService, queryClient, debounceMs })` + the `preferencesWriter` singleton; the exported API |
| 7 | `apps/web/src/preferences/use-preferences.test.tsx` → `use-preferences.ts` | `usePreferences`, `useUpdatePreferences` |
| 8 | `apps/web/src/preferences/preferences-bridge.test.tsx` → `preferences-bridge.tsx` | field-diff hydrate + the hide-flush registration |
| 9 | `apps/web/src/db/composition-root.ts` (+ its test) | `Services.preferences` |
| 10 | `apps/web/src/App.tsx` | hoist QCP; mount `<PreferencesBridge/>`; fix the `:21` comment |
| 11 | `apps/web/src/settings/settings-surface.tsx`; delete `settings/use-preferences.ts` | import `usePreferences` from `../preferences/use-preferences` (`.state`) |
| 12 | tests touched by the hoist/registration | `App.test.tsx` (add `compositionRootMock()`; its boot mock has no `getDbClient`) · `App.integration.test.tsx` (`compositionRootMock({ notes: { listPages } })`) · any `settings/*` test importing the old seam |
| 13 | docs | per PLAN-R2 §4.9 + `apps/web/src/preferences/CLAUDE.md` |

## Key algorithms
**`createWriteQueue<P>({ debounceMs, write: (batch: P[]) => Promise<R> })`**
- `enqueue(p) → Promise<R>`: push onto the current batch, (re)arm the debounce timer, and return the batch's shared promise.
- When the timer fires (or on `flush()`), the batch is sealed and chained onto the serial tail. It runs `write(batch)`.
- Every caller of a batch resolves or rejects together.
- `isIdle()` = no open batch and nothing in flight.

**`preferencesWriter`** (per table `t ∈ {user, nav}`):
- State: `confirmed[t]: Merged | undefined` (seeded from the first successful query read via `noteConfirmed(t, value)`,
  called by the query's `queryFn`) · `pending[t]: Patch[]`.
- `cacheValue(t) = pending[t].reduce(apply, confirmed[t] ?? DEFAULTS[t])`.
- `write(t, patch)` (each patch wrapped in a fresh `{ patch }` envelope, so identity removal is exact):
  1. `pending[t].push(env)`
  2. **Only if `confirmed[t] !== undefined`:** `queryClient.cancelQueries({ queryKey: KEY[t], exact: true })`, not
     awaited. Safe on `@tanstack/query-core` 5.101.4: `retryer.cancel` reverts synchronously
     (`query.ts:541-547`, `retryer.ts:88-94`), so the next `setQueryData` wins. Then
     `queryClient.setQueryData(KEY[t], cacheValue(t))`.
     **If `confirmed[t]` is undefined** (a write before any read): skip both, so a DEFAULTS-based value is never stamped
     as fresh. A later read returns `cacheValue(t)`; the batch settle fills the cache.
  3. return `queue[t].enqueue(env)`
- The queue's `write(batch)`:
  1. `fresh = await svc().get[t]()`; if `confirmed[t]` is still undefined, adopt `fresh` (on success and failure, as long as
     the read succeeded).
  2. `merged = batch.reduce(apply, fresh)`
  3. `diff = diffToPatch(fresh, merged)`: scalars by `===`, JSON columns structurally (stable stringify), emitted whole.
     **An empty diff skips `update`** (`result = fresh`), so a fresh vault never gets a row from a no-op.
  4. else `result = await svc().update[t](diff)`
  - On success: `confirmed[t] = result`; remove the batch's patches from `pending[t]` (by identity);
    `setQueryData(KEY[t], cacheValue(t))`; if `queue[t].isIdle()` → `invalidateQueries({ queryKey: KEY[t], exact: true })`.
  - On error: remove the batch's envelopes; if `confirmed[t]` is defined, `setQueryData(KEY[t], cacheValue(t))`; **invalidate
    the exact key when idle (failure too)**. Rethrow a typed `PreferencesWriteError { kind, cause }`:
    - `TransactionLockTimeoutError` → `'lock-timeout'`
    - `/^Invalid (nav )?preferences patch/` (`service.ts:259,294`) or `InvalidModuleError` → `'validation'`
    - otherwise → `'unknown'`
- **`noteConfirmed(t, read, epochAtStart)`** (from `queryFn`): accept `read` into `confirmed[t]` only if no batch settled
  since the read started (a per-table epoch). **Always return `cacheValue(t)`**, even when the read is rejected, so a
  refetch while patches are pending never wipes them.
- `current(t) = cacheValue(t)`: the echo-check source (defined while loading).
- `queryClient.setQueryDefaults(['preferences'], { staleTime: 5 min, gcTime: 30 min })` runs once at writer creation.
- `resetPreferencesWriterForTests()` clears all writer state.
- Exported API: `writePreferences(patch)` · `writeNavPreferences(patch)` · `patchDashboardLayout(sub)` (→ `writePreferences`
  with `{ dashboard_layout: sub }`, whose `apply` merges per sub-key and map-merges `moduleNames`) ·
  `patchModuleNames(partial)` · `setModuleVisibilityMap(partial)` · `flushAll()` · `noteConfirmed(t, v)`.
- **BR-PREF-6 in the ② writer** (the plan bypasses `setModuleVisibility`, and Zod only checks `record<string, boolean>`,
  `validators/user.ts:48`). `setModuleVisibilityMap(partial)` validates **before enqueue**:
  - every key is a non-empty string **in** `MODULE_MAP` entries with `placement === 'dock'` (`nav/module-map.ts:66`) ∪
    `MANAGEABLE_SURFACES[].key` (`features`, `sync`; `settings/settings-model.ts:56`), else it **returns a rejected**
    `InvalidModuleError`;
  - `preferences`/`journals` are `global`, not dock, so they are rejected for any value (the write-side escape hatch);
  - no import cycle (`settings-model` imports only `nav/module-map`, which imports nothing).

  Tests cover all three cases.
- **BR-PREF-9:** `applyUserPatch`/`applyNavPatch` use object spread, so an explicit `false`/`0` patch value applies; the
  mapper reads with `??`, never `||`. A test asserts `compact_mode: false` and `week_starts_on: 0` survive.

**`usePreferences()`:** two `useQuery`s, `{ queryKey: KEY[t], queryFn: async () => { const e = writer.epoch(t); return
writer.noteConfirmed(t, await (await getServices()).preferences.get[t](), e) } }`. A side effect in `queryFn` is acceptable:
React Query dedupes it, so StrictMode doesn't double-run it, and it is idempotent. → `state` (error if either errors,
loading if either loads) · `view = toView(user.data ?? DEFAULTS, nav.data ?? DEFAULTS)` (the defaults only render in
error/loading, for read-only display).

**`useUpdatePreferences()`:** `update(viewPatch)`:
1. split into user/nav patches via `toUserPatch`/`toNavPatch`;
2. drop each part that is a no-op against `writer.current(t)` (echo);
3. `saveState 'saving'`;
4. `Promise.allSettled` of the writer calls → `'saved'` | `'error'` + `lastError`.

A state setter guarded by mounted + a call-sequence id, so only the latest call's settle sets the state.

**`<PreferencesBridge/>`:** `usePreferences()`. When `state === 'success'`, diff `view` against a `useRef` of the last
hydrated view (structural equality for the two maps) and call `usePreferencesStore.getState().hydrate(changedFieldsOnly)`
(the store's `hydrate` merges, `preferences-store.ts:93`).

**View → store map (11 fields):**

| Store field | Source |
|---|---|
| `reduceMotion` | `nav.reduce_motion` |
| `arrangement` | `dashboard_layout.arrangement` |
| `moduleVisibility` | `module_visibility ?? {}` |
| `moduleNames` | `dashboard_layout.moduleNames ?? {}` |
| `dateFormat` | `date_format` (degraded) |
| `timeFormat` | `time_format` |
| `weekStartsOn` | `week_starts_on` (degraded to `0\|1`) |
| `notifInApp` / `notifPush` / `notifEmail` | `notification_in_app` / `_push` / `_email` |
| `quietHours` | `quiet_hours_enabled` |

`dashboard_layout` writes merge per sub-key (and map-merge `moduleNames`); a writer call never replaces the whole object
or deletes a sub-key, by design (documented in `preferences/CLAUDE.md`). A `useEffect` registers
`visibilitychange` (when `document.visibilityState === 'hidden'`) + `pagehide` → `preferencesWriter.flushAll()`, with cleanup.

## Build steps
1. Core default (row 1) → `pnpm --filter @vida/core exec vitest run src/services/preferences` → `pnpm --filter @vida/core build`.
2. For rows 3, 4, 6, 7, 8: test red → implement → green, per file. Each test set covers PLAN-R2 §4.1–4.5 exactly.
3. Rows 9–12: wiring, then the affected tests (row 12), then the full apps/web suite.
4. Gates:
   - `pnpm --filter @vida/web test`
   - `pnpm --filter @vida/web typecheck`
   - `pnpm --filter @vida/web lint`
   - `pnpm --filter @vida/core test` + `typecheck`

   Run the suites with **no dev servers running** (R1 lesson: load flakes). Re-run any red alone and on `main` before
   classifying it.
5. Live smoke (PLAN-R2 §4.8): `vite --port 5176` (a fresh origin) on the worktree; console
   `await import('/src/preferences/preferences-writer.ts')`. Simulate hide with
   `Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange'))`.
   Row counts via `(await import('/src/db/boot.ts')).getDbClient().driver.query('SELECT count(*) c FROM user_preferences')`.
   Also check explicitly:
   - Settings shows a persisted `date_format` after reload, through the bridge;
   - console clean;
   - the reload-inside-the-window outcome, recorded either way.
6. Docs (row 13) → `/critique` → the gate record in PLAN-R2 → `/verify` → commit
   `feat(web): R2 preferences live seam — query source of truth, serial write queues, exported write path (LIF-247)`
   (on Victor's go).

## Added tests (from the step-5 critique)
- **B2:** a pending patch + a concurrent query resolution → the patch stays visible.
- **B1:** a write before any read → nothing stamped until the batch settles; on failure, `fresh` is adopted and the key
  invalidated.
- **B4:** a nav Zod failure and an `InvalidModuleError` both → `'validation'`.
- An empty diff on a fresh vault → **no row created**.

## Gate record
- **rev 1 → /preflight:** BR-PREF-6 gap + BR-PREF-9 → folded → PASSED.
- **rev 2 → critique: REVISE** (4 blocking, 11 nits) → folded:
  - B1: no stamping before the first read; adopt `fresh`; invalidate on failure.
  - B2: `noteConfirmed` returns `cacheValue`.
  - B3: the singleton wrapper + writer reset + the non-circular util + `compositionRootMock(extra)` + the App.test mock.
  - B4: classification.
  - Nits: the cancel safety note · envelopes · structural diff + skip empty · the `current()` echo source · rejected-promise
    validation · the view→store map · per-sub-key semantics · `setQueryDefaults` · live Settings/console checks.

## Risks / watch
- `diffToPatch` must emit JSON columns whole (the service replaces columns).
- `noteConfirmed` from `queryFn` must not overwrite a newer `confirmed` from a just-settled write. Guard it: accept a read
  only if no batch settled after the read started (a per-table epoch counter).
- Fake timers + RTL `waitFor`: use `vi.useFakeTimers({ shouldAdvanceTime: true })` in the hook tests.

## Build record — refinements during implementation (§XXVIII: recorded, within the approved design)
- **`createWriteQueue` gained `onSettled(outcome, { batch, idle })`**, called once per batch after it leaves the in-flight
  count. The writer's cache sync must run once per batch, and an `isIdle()` check made *inside* `write()` would always see
  its own batch in flight. Plus `dispose()` (tests/teardown) and a `try` around `onSettled`.
- **The writer gained `withoutEcho(t, patch)`**, so the hook's echo check reuses the writer's one merge instead of
  duplicating it. It passes the patch through unchanged before the first read.
- **BR-PREF-6 moved into `write()`** for any `module_visibility` patch (the `/critique` found 2 of 3 paths unvalidated).
  Every path rejects with ONE shape: `PreferencesWriteError { kind: 'validation', cause: InvalidModuleError }`.
- **The exported write path never raises an unhandled rejection** for fire-and-forget callers (F10).
- **`useUpdatePreferences` folds an earlier failure** into the final state (EC-7: a later success never hides it).
- **`noteConfirmed`** also adopts a read when nothing is confirmed yet, so defaults are never reported as data.
