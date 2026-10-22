# apps/web/src/preferences — the live Preferences seam (preferences-rescope · LIF-247)

**Owning unit:** preferences-rescope (M1.2.4 Live Close) · **Authority:** `docs/features/preferences/*` (PR-1…12) ·
delivery `docs/features/preferences/delivery/` (interpretation · reconciliation · slice-map · sessions/PLAN-R2) ·
runtime rules `docs/infrastructure/web-client-runtime/current-business-rules.md` (BR-RT-PREFS, BR-RT-LOCK).

## What lives here
The read/write seam for `user_preferences` + `nav_preferences` (the `@vida/core` preferences service). **React Query over
SQLite is the source of truth**; Zustand stores are at most derived caches (gate A6).
- `preferences-keys.ts` — `['preferences','user']` / `['preferences','nav']` (exact, non-overlapping) + the family prefix;
  cache category 5 min / 30 min.
- `preferences-view.ts` — PURE: `toView` (two merged rows → one `PreferencesView`, never undefined; `system` → light;
  per-field degrade) · `toUserPatch`/`toNavPatch` · **`applyUserPatch`/`applyNavPatch` — the ONE merge** (per sub-key for
  `dashboard_layout`; maps for `module_visibility` + `moduleNames`) · `PERSONA_UNSET` sentinel.
- `write-queue.ts` — per-table serial queue, 500 ms debounce batching, `onSettled` once per batch.
- `preferences-writer.ts` — the writer factory: per table `confirmed` + `pending`; **cache = pending re-applied on
  confirmed** (no flip-back, honest revert, F10-safe); `noteConfirmed` for the queryFn; typed `PreferencesWriteError`;
  BR-PREF-6 key validation (dock modules + `features`/`sync`; global surfaces never hideable).
- `writer-instance.ts` — **the app's one writer** (import the write path from here).
- `use-preferences.ts` — `usePreferences()` (`view` · `state` · `error`) and `useUpdatePreferences()` (`update(viewPatch)` ·
  `saveState` · `lastError`).
- `preferences-bridge.tsx` — TRANSITIONAL mirror into `stores/preferences-store` (field-diff, after both reads) + the
  `visibilitychange`/`pagehide` flush. Mounted once in `App.tsx`.

## Rules (do not violate)
- **Every preferences writer in every unit uses `writer-instance.ts`** (`writePreferences` · `writeNavPreferences` ·
  `patchDashboardLayout` · `patchModuleNames` · `setModuleVisibilityMap` · `flushAll`) — never the raw service (it would
  bypass the queue → double-create + a stale cache).
- `dashboard_layout` writes merge **per sub-key** (and `moduleNames` as a map): a writer call can never replace the whole
  object or delete a sub-key — by design.
- No echo writes: `useUpdatePreferences` drops keys that would not change the cache truth.
- The cache is touched ONLY by the writer (and `noteConfirmed` from the queryFn). Never `setQueryData` a preferences key
  elsewhere.
- **Known limit:** a hard reload within ~500 ms of a change can lose it (the event loop stops at unload); hiding the page
  (tab switch, app switch) flushes immediately.
- Tests: `../test/preferences-test-utils.tsx` — use the singleton-client wrapper + `compositionRootMock()` via
  `vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())`;
  reset with `queryClient.clear()` + `resetPreferencesWriterForTests()`.
