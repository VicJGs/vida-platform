# apps/web/src/preferences — the live Preferences seam (preferences-rescope · LIF-247)

**Owning unit:** preferences-rescope (M1.2.4 Live Close) · **Authority:** `docs/features/preferences/*` (PR-1…12) ·
delivery `docs/features/preferences/delivery/` (interpretation · reconciliation · slice-map · sessions/PLAN-R2, PLAN-R3) ·
runtime rules `docs/infrastructure/web-client-runtime/current-business-rules.md` (BR-RT-PREFS, BR-RT-LOCK, BR-RT-BOOT,
BR-RT-7).

## What lives here
The read/write seam for `user_preferences` + `nav_preferences` (the `@vida/core` preferences service). **React Query over
SQLite is the source of truth**; Zustand stores are at most derived caches (gate A6).
- `preferences-keys.ts` — `['preferences','user']` / `['preferences','nav']` (exact, non-overlapping) + the family prefix;
  cache category 5 min / 30 min.
- `preferences-view.ts` — PURE: `toView` (two merged rows → one `PreferencesView`, never undefined; `system` → light;
  per-field degrade) · `toUserPatch`/`toNavPatch` · **`applyUserPatch`/`applyNavPatch` — the ONE merge** (per sub-key for
  `dashboard_layout`; maps for `module_visibility` + `moduleNames`) · `PERSONA_UNSET` sentinel · owns the
  `HomeArrangement` type (R3).
- `preferences-queries.ts` (R3) — **the ONE read definition per table**: `userPreferencesQuery()` / `navPreferencesQuery()`
  (key + `queryFn` with the writer's epoch/`noteConfirmed` reconcile + **`retryOnMount: false`**), used by `usePreferences`
  AND `seedPreferences(qc)` — the boot seed `App` awaits before the first themed paint (`fetchQuery` ×2, `retry: 0`,
  `Promise.allSettled` → **never rejects**; a failed read boots on the defaults).
- `force-flag.ts` (R3) — DEV-only `?force=prefs-read-error|prefs-refetch-error|prefs-write-error`, read once at module
  load (off in production); exercises the EC-7 states live, including at boot.
- `theme-hint.ts` (R3) — the device-local paint cache `localStorage['vida.theme-hint.v1'] = { scheme, bg, fg }` (resolved
  hex via `getVariableValue` over an explicit `ThemeName` map): `toThemeHint` · `writeThemeHint(row)` · `paintRoot(hint)`.
  Read ONLY by `index.html`'s inline `<script id="vida-theme-hint">` (duplicated key, asserted by
  `../index-hint-script.test.ts`); the app never reads it (BR-RT-7).
- `write-queue.ts` — per-table serial queue, 500 ms debounce batching, `onSettled` once per batch.
- `preferences-writer.ts` — the writer factory: per table `confirmed` + `pending`; **cache = pending re-applied on
  confirmed** (no flip-back, honest revert, F10-safe); `noteConfirmed` for the queryFn; typed `PreferencesWriteError`;
  BR-PREF-6 key validation (dock modules + `features`/`sync`; global surfaces never hideable). R3 options:
  `onConfirmed(t, row)` (an accepted read or a successful batch — never on enqueue, never on a failed batch) and
  `onFailed(t, error)` (exactly once per failed batch); each hook call is try/caught so it can't break the cache sync.
- `writer-instance.ts` — **the app's one writer** (import the write path from here). Wires `onConfirmed` (user table) →
  `writeThemeHint` and `onFailed` → ONE revert toast (`intent: 'danger'`, `SETTINGS_COPY.saveFailed*`) — from here, so a
  failure reports whichever surface (or none) is mounted (PR-4). Plus the DEV `prefs-write-error` service wrapper.
- `use-preferences.ts` — `usePreferences()` (`view` · `state` · `error` · `hasData` · `retry`) and
  `useUpdatePreferences()` (`update(viewPatch)` · `saveState` · `lastError`); `updateView(patch)` is the module-level write
  (no React state — the `SettingsContext` default). `retry()` refetches **only the errored key(s)**, fire-and-forget.
- `command-history.ts` (R5) — **the ONE write path for `command_bar_history`**: `createCommandHistory` → `{ record, pin,
  idle }` on ONE serial promise chain (both service ops read-then-write; the chain fixes the UNIQUE first-run race and
  orders a pin after its record). `record` is best-effort (after `run()`, logged, never thrown); `pin` resolves
  true/false. The history query is invalidated after each op, **fire-and-forget** (`invalidateQueries` awaits the
  refetch). `toHistoryEntry` maps `is_pinned` → `0|1`. App instance `commandHistory` (+ `resetCommandHistoryForTests`).
  `commandHistoryQuery()` lives in `preferences-queries.ts` (own stale/gc, `retry: 0`, NOT in the boot seed).
- `preferences-bridge.tsx` — TRANSITIONAL mirror into `stores/preferences-store` (field-diff, after both reads; **7
  fields** — `arrangement` left in R3, `reduceMotion` in R4, the module maps in R5; the theme was never mirrored) + the `visibilitychange`/`pagehide` flush. Mounted
  once in `App.tsx`.

## Rules (do not violate)
- **Every preferences writer in every unit uses `writer-instance.ts`** (`writePreferences` · `writeNavPreferences` ·
  `patchDashboardLayout` · `patchModuleNames` · `setModuleVisibilityMap` · `flushAll`) — never the raw service (it would
  bypass the queue → double-create + a stale cache). **`command_bar_history` goes through `command-history.ts`** (R5).
- `dashboard_layout` writes merge **per sub-key** (and `moduleNames` as a map): a writer call can never replace the whole
  object or delete a sub-key — by design.
- No echo writes: `useUpdatePreferences` drops keys that would not change the cache truth.
- **Read through `preferences-queries.ts` only** — never a second `useQuery` definition for a preferences key. Keep
  **`retryOnMount: false`**: an errored, data-less query is otherwise refetched by EVERY mounting observer and reset to
  `pending`, so a loading↔content surface loops forever (found at R3 build step 16). Recovery is the error state's Retry →
  `refetch()` (`docs/core/architecture/state-conventions.md` §3).
- The theme hint is written ONLY from `onConfirmed` (DB truth) and read ONLY by the inline script — never make it a source.
- The cache is touched ONLY by the writer (and `noteConfirmed` from the queryFn). Never `setQueryData` a preferences key
  elsewhere.
- **Known limit:** a hard reload within ~500 ms of a change can lose it (the event loop stops at unload); hiding the page
  (tab switch, app switch) flushes immediately.
- Tests: `../test/preferences-test-utils.tsx` — use the singleton-client wrapper + `compositionRootMock()` via
  `vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())`;
  reset with `queryClient.clear()` + `resetPreferencesWriterForTests()` (+ `resetTestPreferences()` ·
  `resetThemeStoreForTests()` where the theme is involved). The fake service has R3 read knobs: `state.failReads`
  (`'none' | 'all' | 'after-first'`) and `holdReads()` / `state.releaseReads()` (a deferred boot seed).
