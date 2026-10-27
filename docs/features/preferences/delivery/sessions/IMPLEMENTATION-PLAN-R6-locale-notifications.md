<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R6 · Locale + Notifications
     Implements PLAN-R6 rev 3 (Approval 1: Victor 2026-10-27). Worktree @ d674491 (+ the R6 docs, uncommitted). -->

# IMPLEMENTATION-PLAN-R6 — Locale + Notifications

> **Status:** rev 1, 2026-10-27 — drafted; `/preflight` + gate-2 critique next, then Approval 2.
> **Runtime:** run every suite on **Node ≥ 22** (`nvm use 24`; the shell default v20.20.2 can't load jsdom/undici — R5
> precedent). Suites run **alone** (parallel sessions → F008 timeouts).
> **Verified against (installed):** `@tanstack/react-query` 5.101.4 · React 19 · vitest 3.2 (per-file
> `// @vitest-environment jsdom`) · Node `Intl` (24h `hour:'2-digit'`+`h23` → `Oct 27, 00:05`; 12h `hour:'numeric'`+`h12`
> → `Oct 27, 2:05 PM` — measured 2026-10-27).

## Gate-2 refinements (to be critiqued here)

- **G-1 · `formatAt` becomes a pure export** — `formatAt(at, now, timeFormat)` in `activity-mode.tsx`, so the exact
  strings (`Oct 27, 14:05` · `00:05` · `2:05 PM` · the out-of-year form) are unit-tested without the `?sample` fixture.
  The test forces `process.env.TZ = 'America/Sao_Paulo'` before any `Date` (memory: date code needs TZ-forced tests).
- **G-2 · Calendar test seeding.** The file keeps its per-render `QueryClient` (its feed queries must not share the
  singleton). The mock becomes the async `compositionRootMock({ sessions, tasks, habits, purposes, notes })` (the
  hoisted `svc` still feeds `dueIn`), and `renderSurface` becomes `async`: build `qc` → `await seedPreferences(qc)` →
  render → return `{ ...result, qc }`. A helper `prefs(p)` sets `testPreferences.state.user = { ...USER_PREFERENCES_DEFAULTS, ...p }`;
  `afterEach` calls `resetTestPreferences()` (replaces the store reset). Every existing `await renderSurface(…)` call
  already awaits.
- **G-3 · The rejected-write + "Saved" cases live at the surface level** (`settings-surface.test.tsx`): that is where the
  toast host + SyncStatus are (the R3/R4 cases at `:168-206`). The pane tests cover read/write/read-only only.
- **G-4 · First-frame test (acceptance 4a).** Seed → `await renderSurface('tablet')` → assert the first month
  columnheader **without** `waitFor`. Negative control (mutation): call `renderSurface` with seeding moved after the
  render (a `seedAfter` flag used only by the mutation run) → the assertion must fail.

## Files (build order)

| #   | File                                                                                                                                                 | Change                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `preferences/preferences-view.ts` · `preferences-view.test.ts`                                                                                       | define `TimeFormat` / `WeekStartsOn` here; drop the store import; extend degrade test (0 → 0 · `time_format` ≠ `'12h'` → `'24h'`); relabel `:22` |
| 2   | `settings/locale-pane.tsx` · `locale-pane.test.tsx`                                                                                                  | view + `useSettings().update`; options from `DATE_FORMATS`; header comment                                                                       |
| 3   | `settings/notifications-pane.tsx` · `notifications-pane.test.tsx`                                                                                    | view + `update`; header comment                                                                                                                  |
| 4   | `settings/settings-surface.test.tsx`                                                                                                                 | + rejected Locale write (revert + 1 toast) · + "Saved on this device" after a Notifications write                                                |
| 5   | `app/calendar/index.tsx` · `calendar-surface.test.tsx`                                                                                               | `usePreferences().view.{weekStartsOn,timeFormat}`; type from `preferences-view`; G-2 seeding; + 4a + cache-change test                           |
| 6   | `gamification/activity-mode.tsx` · `activity.test.tsx` · `gamification.test.tsx`                                                                     | 4 formatters + `formatAt(at, now, tf)` (G-1); `ActivityRow` gets `timeFormat`; both tests gain the mock + `PrefsWrapper`                         |
| 7   | `preferences/preferences-hide-flush.tsx` (+test) · `App.tsx` · `App.test.tsx`                                                                        | new component = the bridge's flush effect only; App mounts it; comments                                                                          |
| 8   | **delete** `preferences/preferences-bridge.tsx` · `preferences-bridge.test.tsx` · `stores/preferences-store.ts` · `stores/preferences-store.test.ts` | —                                                                                                                                                |
| 9   | Docs (§XXIX)                                                                                                                                         | PLAN-R6 §3 #8 list, verbatim                                                                                                                     |

## Key shapes

```ts
// preferences-view.ts
export type TimeFormat = '12h' | '24h'
/** 0 = Sunday, 1 = Monday (user_preferences.week_starts_on, ADR-002:3529). */
export type WeekStartsOn = 0 | 1

// locale-pane.tsx
const { readOnly, update } = useSettings()
const { view } = usePreferences()
const DATE_FORMAT_OPTIONS = DATE_FORMATS.map((f) => ({ value: f, label: f }))
// onValueChange={(v) => void update({ dateFormat: v })} · ({ timeFormat: v as TimeFormat }) · ({ weekStartsOn: fromWeekValue(v) })

// activity-mode.tsx — module level, no hook
const BASE = { month: 'short', day: 'numeric', minute: '2-digit' } as const
const FMT = {
  '24h': {
    now: new Intl.DateTimeFormat('en', { ...BASE, hour: '2-digit', hourCycle: 'h23' }),
    year: new Intl.DateTimeFormat('en', { ...BASE, year: 'numeric', hour: '2-digit', hourCycle: 'h23' }),
  },
  '12h': {
    now: new Intl.DateTimeFormat('en', { ...BASE, hour: 'numeric', hourCycle: 'h12' }),
    year: new Intl.DateTimeFormat('en', { ...BASE, year: 'numeric', hour: 'numeric', hourCycle: 'h12' }),
  },
} as const
export const formatAt = (at: number, now: number, tf: TimeFormat): string =>
  (new Date(at).getFullYear() === new Date(now).getFullYear() ? FMT[tf].now : FMT[tf].year).format(at)

// preferences-hide-flush.tsx — the bridge's second effect, verbatim (preferences-bridge.tsx:52-63)
export function PreferencesHideFlush(): null {
  useEffect(() => {
    /* visibilitychange hidden + pagehide → flushAll */
  }, [])
  return null
}
```

## Build Steps (TDD — each: write the test, see it fail, implement, see it pass)

0. **Baseline.** `nvm use 24`. Run alone and record: `apps/web` targeted (`settings/ preferences/ app/calendar/ gamification/
App.test`) + `tsc -p apps/web`. All green before any edit.
1. **View types (file 1).** Add the two degrade cases + relabel → green already for the cases (R2 built them); move the
   types, drop the store import → `tsc` 0.
2. **Locale pane (file 2).** Rewrite the test on the R5 pattern (`compositionRootMock`, `PrefsWrapper`, `seed`, reset
   in `afterEach`): (a) seeded `{week_starts_on:0, time_format:'12h', date_format:'DD/MM/YYYY'}` → the three triggers
   show Sunday · 12-hour · DD/MM/YYYY; (b) `choose('Week starts on','Sunday')` → `flushAll` → `state.user.week_starts_on
=== 0` (number, not `'sunday'`) and `date_format` untouched; (c) same for Time format → `'12h'` and Date format →
   `'MM/DD/YYYY'`; (d) `SettingsContext` `readOnly: true` → all three triggers disabled; (e) the option list = `DATE_FORMATS`.
   Red → rebind → green.
3. **Notifications pane (file 3).** Test: (a) seeded `{notification_push:false, quiet_hours_enabled:true}` → those
   switches reflect it; (b) click Push then Quiet hours → `flushAll` → both columns persisted **and** `state.updates.user
=== 1` (one batch); (c) read-only → four switches disabled. Red → rebind → green.
4. **Surface cases (file 4).** (a) navigate to Locale (rail) → `failNext` → choose Sunday → optimistic Sunday → `flushAll`
   → reverted to Monday + `toastSpy` ×1 + no "Saved"; (b) Notifications → toggle → `flushAll` → "Saved on this device".
   Green expected once 2–3 land; if (a) fails, that is a C5 regression → §XXVIII STOP.
5. **Calendar (file 5).** Apply G-2 to the test file first; convert the 8 store references (`:13,49,152,210,257,264,
272,281`) to `prefs({...})` before `renderSurface`; add 4a (G-4) and "a cache change re-renders": render Monday →
   `qc.setQueryData(userPreferencesQuery().queryKey, {...user, week_starts_on: 0})` → `waitFor` the first columnheader
   = Sun, same DOM root (no remount: a ref'd node stays connected). Red (index still on the store) → swap
   `index.tsx:25,105-106` → green. Full calendar file green.
6. **Activity (file 6).** `activity.test.tsx`: TZ forced; `formatAt` table (24h same-year `14:05`, `00:05`; 12h `2:05 PM`;
   out-of-year includes the year in both); EC-8 render under the wrapper with default (24h) → no `AM|PM` in the row
   times, seeded 12h → `AM|PM` present. `gamification.test.tsx`: file-level `vi.mock` composition root +
   `renderUI` wraps `PrefsWrapper` (all cases; harmless for non-Activity). Red → implement → green.
7. **Hide flush (file 7).** New `preferences-hide-flush.test.tsx` = the moved flush case (`preferences-bridge.test.tsx:61-75`)
   against `PreferencesHideFlush`. Red → create the component → App.tsx swaps the import/mount + rewrites the comment
   (`:129-131`) → `App.test.tsx:9` comment → green.
8. **Delete (file 8)** the bridge + its test, the store + its test. `tsc -p apps/web` 0; `grep -rn "preferences-store\|
PreferencesBridge\|usePreferencesStore" apps/web/src --include='*.ts' --include='*.tsx'` → **0 hits**.
9. **Gate run.** `apps/web` full suite alone → green · `tsc` 0 · eslint 0 errors. **Mutations** (restore from a copy,
   never `git checkout --`): M1 drop `hourCycle` (both) · M2 calendar `weekStartsOn` hard-coded `1` · M3 drop Push's
   `update` · M4 drop the date Select's `update` · M5 drop `fromWeekValue` (write `v`) · M6 drop the `pagehide` listener ·
   M7 G-4 seed-after-render · M8 `toView` `week_starts_on` → always 1. Each must fail ≥1 test; record killed/survived.
10. **Live smoke + Visual Gate** (memory `visual-gate-playbook`: repo `playwright-core`, system Brave, "Skip for now",
    scoped locators, `finally` close): PLAN-R6 §4 items 8–11 incl. 10a no-flash with a negative control (temporarily
    seed after render on a scratch build — or record the pre-R6 Monday frame from `main` as the control). Hand to
    Victor for stage-4 `visual-approved`.
11. **Docs (§XXIX)** per PLAN-R6 §3 #8 → pre-ship `/critique` → fold → commit on Victor's go.

## Risks / watch

- `gamification.test.tsx` cases other than EC-8 now mount under a QueryClient with a mocked root — inert (no reader),
  but if a case asserts on a network/loading state it would show; checked at step 6.
- The calendar's live-data tests (`live: true`) share the per-render client with prefs — prefs reads are `retry: 0`
  and the fake never fails unless told, so no cross-talk.
- If the Locale `Select` writes a string where the column is an integer, `toUserPatch` passes it through untyped at
  runtime — M5 guards it.

## Preflight (2026-10-27) — **PASSED**

Target context `docs/modules/preferences/current-*` read; checked against BR-PREF-1…10, PR-1…12, R3-BR-1…10, R4/R5 BRs.
| Layer | Status |
|---|---|
| Frontend | Components: Locale + Notifications panes, Global Calendar, ActivityMode, PreferencesHideFlush · data source: `usePreferences().view` read / `useSettings().update` write · states: loading → Settings skeleton (R3-BR-6), error → read-only (steps 2d/3c), success; calendar/Activity on a read error → defaults (PR-2) · interactions: Select ×3, Switch ×4, hide/pagehide flush |
| Backend | No change. `PreferencesService.updatePreferences` (R2) · errors: a Zod reject / write failure → writer `onFailed` → revert + one toast (R3-BR-7, step 4a) · auth: n/a (local single-user vault) |
| Database | `user_preferences` only: `date_format`, `time_format`, `week_starts_on`, `notification_in_app/push/email`, `quiet_hours_enabled` — update via the per-table serial queue (BR-PREF-3, R1-BR-7). No schema change |
| Integration | pane → `update(viewPatch)` → `toUserPatch` (`preferences-view.ts:113-119`) → writer → service → SQLite + `sync_queue` (PR-9) |

Documented rules honoured: PR-2 (degrade, step 1) · PR-4 (debounced, no Save button) · PR-11 (in_app/push/email only) ·
BR-PREF-4 (`UpdatePreferencesSchema`: `time_format` enum, `week_starts_on` **`z.number().int()`** — a string `'sunday'`
would be rejected → M5 guards the boundary mapping; `date_format` `z.string()`, `packages/core/src/validators/user.ts:26-28`) ·
R3-BR-2 (boot seed, 4a) · R3-BR-6/7 · BR-RT-7 (store dissolve). No rule contradicted.

**Assumptions (each resolved, none open):**

1. No new user-facing copy → R3-BR-10 not triggered; the S6-era pane literals stay inline (moving them is not R6 scope).
2. The settings search index already holds the Locale/Notifications rows (`settings-model.ts:147-160`) → EC-6 needs no change.
3. Node ≥ 22 for suites (v20.20.2 default can't load jsdom — R5 precedent).
4. The quiet-hours start/end + channel readers stay notifications-rescope's (PLAN-R6 §5).

## Gate record

| Date       | Step       | Result                                                         |
| ---------- | ---------- | -------------------------------------------------------------- |
| 2026-10-27 | IMPL rev 1 | drafted from PLAN-R6 rev 3 (Approval 1)                        |
| 2026-10-27 | /preflight | **PASSED** — all layers specified; 4 assumptions, all resolved |
