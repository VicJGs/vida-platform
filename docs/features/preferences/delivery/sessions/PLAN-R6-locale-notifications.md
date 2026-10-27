<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R6 · Locale + Notifications
     Scope: delivery/slice-map.md R6 (APPROVED 2026-10-21) · ledger rows D16 · D17 · D19 · C3 (dissolve) · fe-settings ECs
     (see §2 R6-BR-6 — the slice-map's "EC-4" citation is corrected there). Inherits R2's writer (PLAN-R2 R2-BR-1…11), R3's
     read seam + Settings save path (PLAN-R3 R3-BR-1/6/7), R1's lock rules (R1-BR-6/7/8) and R5's pane-move pattern
     (PLAN-R5 R5-BR-1). No-Guessing: [FACT: path:line] · [INTERP — grounded] · [UNKNOWN].
     Worktree @ d674491 (origin/main 0055a64 is 2 commits ahead: docs/task-archive only, no apps/ or packages/ change). -->

# PLAN-R6 — Locale + Notifications

> **Status:** rev 3 — **Approval 1 given (Victor, 2026-10-27).** Gate-1 critique REVISE folded (rev 2) + governing-doc check folded (rev 3, §7). Next: IMPLEMENTATION-PLAN-R6 (gate 2).
> **Plane:** frontend. Both gates run: the **Verification Gate** (Vitest + a live smoke on real OPFS) and the **Visual
> Gate** (real browser · light/dark × 375/768/1440 · §XIV a11y · stage-4 Victor `visual-approved`).
> **Context baseline (§XXVI.1a):** `docs/modules/preferences/current-*` (refreshed by R5; **re-swept 2026-10-27 for this
> plan** — the fe-calendar mirror reader was missing from the "Readers" line, now recorded) · interpretation §3.4 ·
> `apps/web/src/{preferences,settings}/CLAUDE.md` · fe-calendar `PLAN-S3-week-day-renderer.md` BR-16. They describe the
> code as read for this plan.

## 1. Problem (as-built, after R5)

- **Locale doesn't persist (D16).** The pane reads and writes the transitional mirror for all three fields
  `[FACT: settings/locale-pane.tsx:3,31-36]`. The seam to persist them already exists: `toUserPatch` maps
  `dateFormat`/`timeFormat`/`weekStartsOn` → their columns `[FACT: preferences/preferences-view.ts:113-115]`. The pane never
  calls it, so an edit lives only until reload (the bridge re-hydrates the DB value over it).
- **Notifications don't persist (D19).** Same shape: four switches on the mirror `[FACT: settings/notifications-pane.tsx:3,14-21]`;
  `toUserPatch` maps all four `[FACT: preferences-view.ts:116-119]`.
- **Readers (D17) — re-swept after fe-calendar #157/#158 merged** (interpretation §3.4 predicted this: "these cites drift
  on its merge. Step 4 re-sweeps after it lands"):
  - **`week_starts_on`.** The **Global Calendar** is now the live reader. It reads the mirror
    `[FACT: app/calendar/index.tsx:25,105]` and passes the value to `CalendarView` (month) and every other range
    `[FACT: index.tsx:111-112,126-127,245,304,349,360,374]`. The notes `CalendarView` passes none (Monday default)
    `[FACT: notes/note-renderers.tsx:69; packages/ui/src/components/calendar-view.tsx:187]`.
  - **`time_format`.** The Global Calendar reads it from the mirror `[FACT: index.tsx:106,111,246,364]` and formats through
    `formatTime` `[FACT: app/calendar/calendar-derive.ts:241-244]`. The Activity ledger hard-codes `hour: '2-digit'` with
    locale `'en'` and no `hourCycle` → always 12h `[FACT: gamification/activity-mode.tsx:24-25]`.
  - **`date_format`.** Still no reader (interpretation §3.4 row 3, re-checked: no `dateFormat`/`date_format` under
    `apps/web/src/app/calendar/`). Nothing to wire.
  - **Notification fields.** Readers are notifications-rescope's (G3-E5); quiet-hours start/end inputs too (coverage :117).
- **The mirror (C3).** `preferences-store` holds exactly these 7 fields + setters + `hydrate`
  `[FACT: stores/preferences-store.ts:18-69]`. `PreferencesBridge` hydrates them `[FACT: preferences/preferences-bridge.tsx:22-50]`
  **and** owns the hide flush (`visibilitychange: hidden` / `pagehide` → `preferencesWriter.flushAll()`)
  `[FACT: preferences-bridge.tsx:52-63]` (R2 F18 queue half). The `TimeFormat`/`WeekStartsOn` types live in the store and
  are imported by the view mapper, the Locale pane and the calendar `[FACT: preferences-view.ts:20; locale-pane.tsx:3; app/calendar/index.tsx:25]`.
- **The degrade is already built (R2).** `week_starts_on` → `0` only on `0`, else `1`; `time_format` → `12h` only on
  `'12h'`; unknown `date_format` → `'YYYY-MM-DD'` `[FACT: preferences-view.ts:87-89]`. The slice-map's verification
  values (7 → 1, unknown → `YYYY-MM-DD`) are asserted here; they need no new code.

## 2. Business rules (after R6)

- **R6-BR-1 · The Locale pane persists, on R3's path.** It reads `usePreferences().view.{dateFormat, timeFormat,
weekStartsOn}` and writes `useSettings().update({ … })` — optimistic cache write → user queue → one batched write
  (R5-BR-1 shape). The week Select keeps its string ↔ `0|1` boundary mapping (`locale-pane.tsx:20-27`). The date Select's
  options come from the mapper's `DATE_FORMATS` (one list, so the pane can't offer a value the read degrades away).
  Read-only keeps today's `disabled` (R3, EC-7).
- **R6-BR-2 · The Notifications pane persists, same path.** Four switches read the view and write `update({ notifInApp |
notifPush | notifEmail | quietHours })`. Copy and M1 scope unchanged (no start/end inputs — notifications-rescope).
- **R6-BR-3 · The Global Calendar reads the view.** `index.tsx` swaps the two mirror selectors for
  `usePreferences().view.{weekStartsOn, timeFormat}`. No other calendar change: the values already flow to every range.
  **First frame — a real fix, not only a claim.** `seedPreferences` runs inside the boot gate `[FACT: App.tsx:85]` before
  `RouterProvider` renders `[FACT: App.tsx:133-138]`, and an always-mounted reader (`CommandBar`, `routes.tsx:31` →
  `shell/command-bar.tsx:104`) keeps the cache warm. Today the mirror is hydrated in an effect **after** first render
  `[FACT: preferences/preferences-bridge.tsx:41-50]`, so a Sunday user reloading on `/calendar` gets a Monday-first frame;
  after R6 the first frame is Sunday. Proven by acceptance 4a + Visual 10a. A prefs **read error** shows the defaults
  (PR-2: never `undefined`) — the calendar keeps working; Settings owns the error UI.
- **R6-BR-4 · Activity times honor `time_format`, in native `Intl` output.**
  - **Grounds.** `time_format` is consumed by "All UI" `[FACT: features/preferences/contract.md:35]` (system-overview:118
    "Read by every module"), default `'24h'` `[FACT: ADR-002:3528]`, reads never `undefined` (PR-2). The Activity row's
    format is pinned by BR-S5-8: "absolute concise date-time formatted with native **`Intl.DateTimeFormat`**"
    `[FACT: specs/foundation/fe-gamification/delivery/PLAN-S5-activity.md:55-61]` — it pins `Intl`, not a 12h/24h choice;
    today's `hour: '2-digit'` (always 12h) was an unpinned implementation choice.
  - **Shape.** Four module-level `Intl.DateTimeFormat`s (with/without year × 12h/24h, no hook): **24h** = `hour: '2-digit'`
    - `hourCycle: 'h23'` → `Oct 27, 14:05` / `00:05` (not `hour12: false`, which can render `24:05`); **12h** =
      `hour: 'numeric'` + `hourCycle: 'h12'` → `Oct 27, 2:05 PM` (Intl's `'en'` output, unpadded hour — measured in Node,
      2026-10-27). No doc specifies a padded `02:05 PM`.
  - **No app-wide 12h display standard exists** (UNKNOWN — grep of docs/core + docs/ui finds none). The only documented 12h
    shape is fe-calendar's **lowercase** `h:mm am|pm` for week/day blocks `[FACT: fe-calendar PLAN-S3:43-47 BR-CAL-S3-3;
packages/ui/src/internal/week-layout.ts:26]`, a calendar-renderer rule, not app-wide. R6 does **not** hand-roll
    lowercase in Activity (that would override BR-S5-8's native `Intl`). Finding recorded, not fixed here: the Global
    Calendar itself renders two 12h shapes — `9:00 am` (WeekView) vs `9:00 AM` (`formatTime`, agenda/month chips,
    `calendar-derive.ts:245`, code only, no doc) → edge to the calendar owner (sessions-rescope, IA:103).
  - **Visible default shift:** a fresh vault now shows `14:05`, not `02:05 PM` — correct per PR-2, expected by the Visual
    Gate (interpretation §3.4). `?sample` stays deterministic (fixed `at` × the pref).
- **R6-BR-5 · The mirror is gone; the flush stays.**
  - `stores/preferences-store.ts` + its test are deleted. `TimeFormat`/`WeekStartsOn` move to `preferences-view.ts`
    (beside `HomeArrangement`, which left the same way in R3).
  - `PreferencesBridge` loses the hydrate half and keeps the flush. It is renamed **`PreferencesHideFlush`**
    (`preferences/preferences-hide-flush.tsx`) because "bridge" would no longer be true. Mounted where the bridge is
    (App.tsx, under `QueryClientProvider`). The existing flush test moves with it; the 3 mirror tests are deleted.
  - With the hydrate half gone, nothing observes the prefs queries during the first-run onboarding branch (30 min gc).
    Harmless: `CommandBar` observes them once the router is up, and onboarding's own reads/writes go through the seam (R7).
  - Guard: no import of `stores/preferences-store` remains (`tsc` fails on one; a grep in the gate record).
- **R6-BR-6 · ECs re-verified on the two panes.** The slice-map cites "fe-settings EC-4 (Locale/Notifications)", but EC-4
  names only Appearance + Modules controls `[FACT: specs/foundation/fe-settings/delivery/envision.md:35]`. The ECs that
  pin these panes are **EC-1** (rail incl. Locale · Notifications, `:32`), **EC-2** (option rows), **EC-3** (`Switch` on
  Notifications, `:34`), **EC-6** (search finds the Locale/Notifications rows), **EC-7** (read-only + "Saved on this
  device" after a write), **EC-10** (single column at 375) and **EC-11** (editorial voice + full-matrix AA, `:42`). R6
  re-verifies those; the slice-map row is corrected at the §XXIX step.
- **R6-BR-7 · Week-start reader = the Global Calendar; the notes `CalendarView` is not wired (doc-resolved correction).**
  - **What changes vs the approved slice-map:** R6 lists "`CalendarView weekStartsOn`" and its Visual line says "Sunday
    start renders the **notes** calendar Sunday-first" `[FACT: slice-map.md:86]`; ledger D17 says "pass `weekStartsOn`"
    `[FACT: reconciliation.md:85]`. Those lines were written from a code sweep, before the governing view-set rule was
    applied. Corrected at §XXIX; presented here, not as an open choice.
  - **Governing grounds (on main):**
    - **A `note` has no Calendar view.** Backend-intent NOT-48: "view availability by type (Journal→Calendar/List/Gallery;
      **Note→List/Gallery/Neural**)" `[FACT: specs/foundation/backend-intent/parts/notes-and-pages.md:62]`, sourced from
      Victor's G3 (`:105`; intake G3 "confirmed", Victor 2026-06-18). The notes calendar layout on main
      (`notes/notes-surface.tsx:21`) is therefore itself a divergence — notes-rescope's to remove (its reconciliation
      B-1/B-2, EC-1 re-pinned by Victor 2026-10-26; branch `notes-rescope`, not yet on main).
    - **No governing doc names the notes collection as a `week_starts_on` reader.** Contract: "All UI" consumes locale
      (`contract.md:35`, no surface named). The surfaces named are the fe-calendar ranges — BR-CAL-S3-16 "**Month** passes
      the already-shipped `CalendarView weekStartsOn` prop … so every range agrees" (`fe-calendar PLAN-S3:136-148`).
    - **Calendar views of pages live elsewhere:** journals → Journals (journals-rescope); the Global Calendar (`/calendar`,
      Sessions-owned, IA:103) reads journal pages (`fe-calendar PLAN-S7:98`). No doc puts `note` pages on a calendar.
  - **So:** the slice-map's "`CalendarView weekStartsOn`" is met by the Global Calendar's month `CalendarView`
    (`index.tsx:304`) once it reads the view; `note-renderers.tsx` stays untouched (also avoids a conflict with the
    notes-rescope branch, which edits it).
  - **Interim, honest:** until notes-rescope removes the layout, the (out-of-doc) notes calendar shows Monday-first
    regardless of the pref. **Edge written** onto `.claude/tasks/notes-rescope.md` at §XXIX: "the notes calendar layout
    ignores `week_starts_on`; removing it per NOT-48/EC-1 re-pin closes this — no wiring needed".
- **Inherited, unchanged:** R1-BR-6/7 (lock + per-table queues), R2's C5 mechanism (cancel → optimistic → debounce →
  invalidate on an empty queue → restore on failure + one toast), R3-BR-10 copy rule (no new copy expected; any goes
  through `SETTINGS_COPY`).

## 3. Design (file order)

| #   | File                                                                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `preferences/preferences-view.ts` (+test)                                        | own `TimeFormat` · `WeekStartsOn`; `DATE_FORMATS` (already exported) feeds the pane. **Extend** the existing degrade test (`preferences-view.test.ts:50-65` has 7 → 1 + unknown → `YYYY-MM-DD`): add 0 → 0 and any `time_format` ≠ `'12h'` → `'24h'`. Relabel `:22` "equals the shipped store defaults" → the C10 defaults-parity guard now carried by the mapper (`reconciliation.md:60`)                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | `settings/locale-pane.tsx` (+test)                                               | R6-BR-1 rebind; options from `DATE_FORMATS`; header comment refresh (X5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 3   | `settings/notifications-pane.tsx` (+test)                                        | R6-BR-2 rebind; header comment refresh                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | `app/calendar/index.tsx` · `calendar-surface.test.tsx`                           | R6-BR-3 selector swap. The test has its own composition-root mock with no `preferences` service (`:22-36`) and a new QueryClient per render (`:52-55`): switch to `compositionRootMock({ sessions, tasks, … })` (takes `extra`) in an async factory, then `seedPreferences` into the per-render client before render; the 7 `usePreferencesStore.setState` seeds become `testPreferences.state.user` edits. Exact seeding fixed in the IMPL-PLAN                                                                                                                                                                                                                                                                                                                      |
| 5   | `gamification/activity-mode.tsx` · `activity.test.tsx` · `gamification.test.tsx` | R6-BR-4 four formatters. Both tests gain the prefs wrapper + `compositionRootMock`: `activity.test.tsx` (direct mount) and the "EC-8 Activity" case in `gamification.test.tsx:82-91`, which mounts `ActivityMode` through `GamificationSurface` under `UIProvider` only (`:16-17`) — it throws "No QueryClient set" without it. Other gamification cases are unaffected (Tabs mount only the active panel, `packages/ui/src/components/tabs.test.tsx:35`)                                                                                                                                                                                                                                                                                                             |
| 6   | `preferences/preferences-hide-flush.tsx` (+test) · `App.tsx` · `App.test.tsx`    | R6-BR-5 rename + strip the hydrate half                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7   | `stores/preferences-store.ts` · `preferences-store.test.ts`                      | **deleted**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 8   | Docs (§XXIX)                                                                     | `docs/modules/preferences/current-*` (R6 rules; "only Locale/Notifications still bind the mirror" retired) · `docs/infrastructure/web-client-runtime/current-spec.md:138` (`PreferencesBridge` → `PreferencesHideFlush`) + `:216-220` (fe-calendar reader → the view) · `web-client-runtime/current-business-rules.md:54,101` · `apps/web/src/settings/CLAUDE.md:64,67,79,86-87,98` · `apps/web/src/preferences/CLAUDE.md:45` (`home/CLAUDE.md:26` "no longer" line stays) · `.claude/docs/decisions.md:75` **annotated** (superseded by R6: view, not store), not rewritten · reconciliation C3/D16/D17/D19 · slice-map R6 status + EC/visual-line corrections (R6-BR-6/7) · the notes-rescope edge onto `.claude/tasks/notes-rescope.md` (R6-BR-7) · this task file |

Edges filed at R8 (not built here):

- **notes-rescope:** written onto its task file at #8 (R6-BR-7) — the notes calendar layout ignores `week_starts_on`;
  removing it per NOT-48 / the EC-1 re-pin closes this.
- **sessions-rescope (Global Calendar owner):** two 12h shapes on one surface — `9:00 am` (WeekView, documented
  BR-CAL-S3-3) vs `9:00 AM` (`calendar-derive.ts:245 formatTime`, undocumented). Not R6's to fix.
- **gamification-rescope:** R6 edits `activity-mode.tsx` (one option + the prefs read).
- **notifications-rescope:** the channel/quiet-hours readers + start/end inputs (unchanged ownership).
- **fe-calendar (closed):** its BR-16 reader now reads the view, not the store — its docs' store cites go stale (refreshed in #8).

## 4. Acceptance

**Verification Gate (Vitest + live smoke)**

1. **Mapper (extends `preferences-view.test.ts:50-65`):** new cases 0 → 0 and `time_format` anything but `'12h'` →
   `'24h'`; the existing 7 → 1 and unknown → `'YYYY-MM-DD'` cases stay green (already-built R2 evidence, not new).
2. **Locale pane:** renders the seeded view (Sunday · 12h · `DD/MM/YYYY`); each Select change writes the column after the
   debounce (`flushAll`) — one row, sibling columns untouched; read-only disables all three; a rejected write restores
   the previous value + one toast (inherited C5, one case).
3. **Notifications pane:** same for the four switches; two quick toggles of different switches land in **one** batched
   write and both persist.
4. **Calendar:** seeded `week_starts_on: 0` → the month grid's first column is Sunday and the week span starts Sunday;
   seeded `'12h'` → a timed block reads `2:00 PM`-style; a cache change re-renders without remount. The existing
   calendar suite stays green on the new seeding.
   4a. **First frame (R6-BR-3):** with the cache seeded `week_starts_on: 0` **before** render, the first month
   columnheader is "Sun" **synchronously** after `render` (no `waitFor`). Mutation: seed after mount → the test fails.
5. **Activity:** default (24h) renders `Oct 27, 14:05` and `00:05` (never `24:05`); seeded `'12h'` renders
   `Oct 27, 2:05 PM` (native `Intl` `'en'`, BR-S5-8). Covered in `activity.test.tsx` and the
   `gamification.test.tsx` EC-8 case passes on the wrapper.
6. **Dissolve:** `stores/preferences-store.ts` absent; `grep -r "preferences-store" apps/web/src` → only docs/comments
   that say it was deleted (none in code); `PreferencesHideFlush` flushes on `visibilitychange: hidden` and `pagehide`
   and registers its listeners once (the moved test).
7. **Suites:** `apps/web` full suite green (run alone — F008), `tsc` 0, eslint 0 errors. Mutation check on the new
   assertions (restore from a copy): drop the `hourCycle` · swap the calendar back to a default `1` · drop one switch's
   `update` · drop the date Select's `update` · drop `fromWeekValue` (write the raw string) · drop the flush listener ·
   seed after mount (4a) — each must fail a test.
8. **Live smoke (real OPFS, the Visual Gate venue):** fresh vault → set Sunday + 12h + `DD/MM/YYYY` + Push off + Quiet hours
   on → reload → all five persist; the Global Calendar month + week start Sunday and show 12h times; reload inside the
   500 ms debounce window still persists (F18 flush, now via `PreferencesHideFlush`).

**Visual Gate** 9. Locale + Notifications panes: light/dark × 375/768/1440, axe 0, keyboard reachable, focus ring, read-only state,
"Saved on this device" after a write, search finds both panes' rows, single column at 375
(EC-1 · EC-2 · EC-3 · EC-6 · EC-7 · EC-10 · EC-11). 10. Global Calendar month + week after Sunday/12h, light/dark × 375/768/1440 (incl. the condensed 375 month starting
Sunday): first column Sunday, period label + "this week" correct, times 12h; then back to Monday/24h.
10a. **No-flash:** Sunday persisted → reload directly on `/calendar` → no Monday-first frame (R3's theme no-flash
probe pattern, with a negative control). 11. Activity (`?sample`), light/dark × 375/768/1440: 24h default, 12h after the switch; no overflow at 375. 12. Stage 4: Victor `visual-approved`.

## 5. Out of scope (owned elsewhere, unchanged)

- Notification delivery, quiet-hours start/end, channel readers → notifications-rescope (G3-E5, coverage :117).
- `date_format` readers → first pattern-date surface (first-consumer pull, interpretation §3.4).
- The notes calendar layout → notes-rescope R6 (R6-BR-7).
- Language / i18n → the i18n platform unit minted at close (slice-map :91).
- Onboarding writes → R7.

## 6. Risks

- **Blast radius of `usePreferences()` in two new trees.** Calendar and Activity tests render without a query host today;
  both need the prefs wrapper + `compositionRootMock` (R3 step-16 lesson). Enumerated in #4/#5; IMPL-PLAN greps every
  test that renders the calendar route, `ActivityMode` or the gamification surface (today: `calendar-surface.test.tsx`, `activity.test.tsx`, `gamification.test.tsx`) before building.
- **Gamification surface tests** render `ActivityMode` through `gamification-surface.tsx:104` — built in design #5.
- **Checked clean (critique 2026-10-27):** no stories in apps/web; no e2e spec touches calendar/gamification; only
  `routes.tsx` imports those surfaces outside their folders; no other worktree edits `activity-mode.tsx`,
  `app/calendar/index.tsx` or `App.tsx`.
- **Parallel notes-rescope branch** edits `note-renderers.tsx`; R6 avoids that file (R6-BR-7).
- **Machine load** from parallel sessions → suite timeouts (F008); suites run alone.

## 7. Gate record

| Date       | Step                                                    | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-27 | §XXVI.1a baseline                                       | `docs/modules/preferences/current-spec.md` re-swept: fe-calendar mirror reader + bridge flush ownership recorded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-27 | PLAN rev 1                                              | drafted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-10-27 | Gate-1 /critique (independent)                          | **REVISE** — 4 blocking: (1) R6-BR-3 first frame unproven → 4a + 10a (and recorded as a real fix: today's mirror hydrates after first render); (2) `gamification.test.tsx` EC-8 case missing from design → #5; (3) §XXIX doc list incomplete/vague → concrete list in #8; (4) R6-BR-7 framed as "correction" → explicit ⚑ DECISION with the interim gap, branch/commit, written edge, alternative. Nits folded: extend (not add) mapper tests + relabel parity test · 12h shape `hour:'numeric'` (= calendar `2:05 PM`) · four module-level formatters, no hook · calendar test seeding spelled out · EC-2/6/10 + "Saved" · matrix on Visual 10/11 · 2 mutations added · onboarding-branch observer note. All cites verified on disk. → **rev 2** |
| 2026-10-27 | Governing-doc check (Victor: "check the documentation") | Direction confirmed: store dissolve = BR-RT-7 / `data-flow.md:463-466` (prefs/locale never in Zustand); Locale/Notif persist = ADR-002 §5.17 + `intake/preferences.md`. Two corrections → **rev 3**: R6-BR-7 re-grounded on NOT-48 (G3: Note→List/Gallery/Neural) — doc-resolved, no longer a decision; R6-BR-4 12h shape re-grounded on BR-S5-8 (native `Intl`), the false "same as the calendar" claim removed (calendar has two 12h shapes; edge → sessions-rescope)                                                                                                                                                                                                                                                                           |
| 2026-10-27 | Approval 1                                              | **Victor: "Approved"** (rev 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
