# G1 census — D · Foundation CODEC (theme · patterns · viewmodes · controls-refinement · primitives-refinement · canvas-board)

> Auditor: G1 debt-census, 2026-10-21. Schema: `census/_schema.md`. Frame: `process.md` §5 — CODEC units are met
> THROUGH their consumers; data legs are N/A-by-role unless the unit itself owns one. Read-only audit; all cites are
> worktree `golive-replan` (HEAD = main + uncommitted golive docs).

## Merge confirmation (origin/main)

| Unit                           | Linear  | Merge commit(s) on origin/main                                                                                                              |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| fe-codec-theme                 | LIF-213 | `629be16` Merge PR #74 (`fe-codec-theme`)                                                                                                   |
| fe-codec-patterns              | LIF-211 | `c1dd1f0` Merge PR #75 (`worktree-fe-codec-patterns`)                                                                                       |
| fe-codec-viewmodes             | LIF-214 | `d8b1b93` Merge PR #76 (`worktree-fe-codec-viewmodes`)                                                                                      |
| fe-codec-controls-refinement   | LIF-231 | `323c7ea` #90 (P1) · `0b58fe8` #91 (P2) · `319beba` #92 (P3) · `0486cd7` #93 (P4) · `699b51c` #94 (close-out)                               |
| fe-codec-primitives-refinement | LIF-230 | `8836857` #88 (P1 List) · `38ba43c` #96 (P2 Card) · `ab797ed` #97 (P3 Timeline) · `f32327e` #99 (P4 Gallery) · `dc44033` #101 (P5 Calendar) |
| fe-codec-canvas-board          | LIF-204 | `a4f8962` Merge PR #116 (`fe-codec-canvas-board`; S1 `749fe16` + S2 `cc0bc13`)                                                              |

All six are merged. Housekeeping: `.claude/tasks/fe-codec-primitives-refinement.md` and `.claude/tasks/fe-codec-canvas-board.md`
are `Status: done` but not archived (the other four are in `.claude/tasks/archive/`).

---

## 1. fe-codec-theme (#1, LIF-213)

No `envision.md` (`find docs/specs/foundation/fe-codec-theme` lists only s1–s3 + delivery/{interpretation,slice-map,seam-contract}).

### A. Data legs

| Leg                                                                                   | File:line                                                                             | Status                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token families / presets / fonts (static generated data)                              | packages/ui/src/provider.tsx:154-156                                                  | N/A-by-role                                                                                 | Codec engine: resolves `selection` → theme; holds no state (AR-4, provider.tsx:3,37-38)                                                                                                                                                                                                                                                                                                                                                                                             |
| Theme selection STATE (store)                                                         | apps/web/src/stores/theme-store.ts:26-33                                              | N/A-by-role (owned by fe-settings)                                                          | Store authored in fe-settings S2 (decisions.md:8), not this unit; seam-contract.md:41-46 assigns state + persistence to "Settings unit (later)… Not built here."                                                                                                                                                                                                                                                                                                                    |
| Theme preference PERSISTENCE (`user_preferences.theme_preset/compact_mode/font_size`) | apps/web/src/stores/theme-store.ts:9-13 · apps/web/src/settings/use-preferences.ts:26 | STUB (in-session only, resets on reload) — **not this unit's leg**, BORROWED by fe-settings | interpretation.md:53,66 named "a persistence seam (`user_preferences`)… scope TBD, Gap Q1"; resolved to Settings (seam-contract.md:45); fe-settings deferred it (decisions.md:9). **The stated blocker has since cleared**: `values` landed 2026-10-20 (apps/web/src/db/client.ts:12-15,161-164), yet no `preferences` service is in composition-root (grep `preferences` apps/web/src/db/composition-root.ts → 0) and theme-store.ts:9-10 still cites the blocker (stale comment). |

### B. Interactions

| Interaction                                 | Wired?                                        | File:line                                                                                |
| ------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Selection change re-themes app before paint | yes                                           | packages/ui/src/provider.tsx:5,154-175 (`useLayoutEffect`) ← apps/web/src/App.tsx:35,102 |
| Preset/mode/density picker                  | N/A here (Settings, O1/R4) — wired in-session | interpretation.md:101,116; App.tsx:31-35                                                 |

### C. Declared deferrals

| Deferral (quote)                                                                                                                                                             | Doc:line                                                       | Home named                                                                                                                                            | Home status                                                                              | Verdict                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| "switcher UI = Settings, a LATER unit — OUT of scope"                                                                                                                        | delivery/interpretation.md:69 (+:101 O1, :116 R4)              | fe-settings                                                                                                                                           | LIF-193 Done, PR #137 `95036bd` (TASKS.md:24)                                            | HOMED                                                                   |
| "theme state (store + persistence seam) ← this unit (scope TBD, Gap Q1)" / "Settings unit (later): … writes `theme_preset`/`compact_mode`/`font_size` to `user_preferences`" | delivery/interpretation.md:66; delivery/seam-contract.md:45-46 | fe-settings → re-deferred "persist drop-in later" (decisions.md:9) → module-go-lives.md:32 item #2 "settings — register `preferences` service + flip" | module-go-lives queue SUPERSEDED by golive-replan (process.md:181), to be re-homed G2–G4 | BORROWED → **fe-settings ELC** (persistence leg; trigger already fired) |
| "adaptive-by-context [density] deferred (O2)"                                                                                                                                | delivery/interpretation.md:103,133                             | none (O2 "defer adaptive-by-context")                                                                                                                 | —                                                                                        | ORPHAN (low: forward feature, no M1 data leg)                           |
| "chrome faces deferred w/ chrome role"                                                                                                                                       | .claude/tasks/archive/fe-codec-theme.md (S2 line)              | "chrome role" (no issue)                                                                                                                              | —                                                                                        | ORPHAN (low: font asset, no data)                                       |
| fonts.ts "for a later consumer"                                                                                                                                              | s2-config-fonts.md:20                                          | later consumer                                                                                                                                        | —                                                                                        | HOMED-by-convention (token data shipped; consumer pull) — not debt      |

### D. Envision — none (no `envision.md`; Envision not fired for a token engine).

**Verdict:** `fe-codec-theme — ELC: N/A-by-role · legs S0/P0/L0 (2 N/A; persistence STUB is fe-settings') · ORPHANs 2 (low) · EC 0/0/0/0 · debt: theme persistence leg BORROWED to fe-settings ELC — blocker (`values`) cleared 2026-10-20 but no preferences service registered; stale theme-store comment.`

---

## 2. fe-codec-patterns (#2, LIF-211)

No `envision.md` (slice-map.md:98-102 "Envision coverage … gate SATISFIED", no file).

### A. Data legs

| Leg                                                              | File:line                                                                            | Status      | Evidence                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------- |
| 8-state machine (`deriveInteractionState`, `INTERACTION_RENDER`) | apps/web/src/state-conventions/interaction-state.ts:109,132,144                      | N/A-by-role | Pure logic over caller's query result                                       |
| `EmptyState`                                                     | packages/ui/src/components/empty-state.tsx:75,80                                     | N/A-by-role | Presentational, `action` slot                                               |
| `SyncStatus` + `HonestProgress`                                  | packages/ui/src/components/sync-status.tsx:20,62-67,113                              | N/A-by-role | State-as-prop; M1 union `'saved' \| 'error'` (honest, s4-sync-status.md:17) |
| `ProviderRead<T>`                                                | apps/web/src/providers/provider-read.ts:15                                           | N/A-by-role | TYPE only; `useProviderRead` hook deferred (s5-conventions.md:35-37)        |
| `ReachabilityRegistry` / `VoiceCopy`                             | apps/web/src/reach/reachability-registry.ts:40 · apps/web/src/voice/voice-copy.ts:34 | N/A-by-role | Pure conventions                                                            |

Honest-state check: the codec itself is honest (no `'saving'`, no cloud claim; sync-status.tsx:20,67). **But no live surface renders `SyncStatus`**: the only consumer path is `CanvasEditor.syncState` (apps/web/src/canvas-editor/canvas-editor.tsx:25,76), and nothing in apps/web passes `syncState` (grep `syncState` outside canvas-editor/ → 0); the live notes editor uses `note-editor-body.tsx`, not `CanvasEditor` (note-editor-body.tsx:4-5). → consumer debt (ELC-6), see Cross-unit.

### B. Interactions

| Interaction                                   | Wired?                        | File:line                                                                  |
| --------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| EmptyState primary action / guided-setup slot | yes (slot; consumer supplies) | empty-state.tsx:11-12,75                                                   |
| `assertReachable` ≥2-path floor               | yes (consumed: onboarding)    | reachability-registry.ts:40; apps/web/src/onboarding/guided-setup-reach.ts |
| `lintCopy` honesty check                      | yes                           | voice-copy.ts:34                                                           |

### C. Declared deferrals

| Deferral (quote)                                                                                            | Doc:line                                                                                               | Home named               | Home status                                                                                                                                                 | Verdict                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| "the `/sync` page + chip/page/on-change/hidden presentation … deferred seams: fe-sync-log #21 / M3"         | delivery/slice-map.md:64,91                                                                            | fe-sync-log #21          | LIF-221, `Status: planned` (.claude/tasks/fe-sync-log.md:2-3)                                                                                               | HOMED                                  |
| "The 4 cloud states are a documented M3 forward seam (not shipped)"                                         | s4-sync-status.md:17,38,52                                                                             | M3 (ZK server sync)      | milestone, by ADR-003 roadmap                                                                                                                               | HOMED (M3, out of M1)                  |
| "`useProviderRead` hook … deferred to first-consumer-pull"                                                  | s5-conventions.md:35-37,69-70,90                                                                       | first consumer           | consumers use `useQuery` + `ProviderRead` directly (e.g. apps/web/src/notes/use-notes-rows.ts:2, canvas/adapter.ts:24) — no shared-default pull has emerged | HOMED (conditional, nothing owed)      |
| "The `@vida/types` canon consolidation (unify the 3 copies) → deferred, the `@vida/core` canon owner's job" | delivery/slice-map.md:92; interpretation.md:150,161; docs/core/architecture/state-conventions.md:49-52 | "canon owner" (no issue) | none found in .claude/tasks / TASKS.md                                                                                                                      | ORPHAN (low: type dedupe, no data leg) |
| "Per-module reach wiring → the modules' M1.2.2+ job" (O4)                                                   | delivery/slice-map.md:93                                                                               | each module ②            | per-module fe-\* tasks (planned)                                                                                                                            | BORROWED → each entity's ELC (ELC-5)   |
| ux-2 `SearchStatus` "may later re-express over" the superset                                                | delivery/seam-contract.md:107                                                                          | none                     | —                                                                                                                                                           | ORPHAN (low, optional refactor)        |

### D. Envision — none.

**Verdict:** `fe-codec-patterns — ELC: N/A-by-role · legs S0/P0/L0 (5 N/A) · ORPHANs 2 (low) · EC 0/0/0/0 · debt: codec honest; SyncStatus has zero live render sites (notes editor carries no save-state chip) — consumer ELC-6 debt, not codec.`

---

## 3. fe-codec-viewmodes (#3, LIF-214)

No `envision.md` (Envision SKIP doc-grounded, delivery/slice-map.md:25-27 H3).

### A. Data legs

| Leg         | File:line                                           | Status      | Evidence                                                   |
| ----------- | --------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `TableView` | packages/ui/src/components/table-view.tsx:11,32,148 | N/A-by-role | Read-only lens, state-as-prop, `aria-sort` display only    |
| `BoardView` | packages/ui/src/components/board-view.tsx           | N/A-by-role | Read-only over PRE-GROUPED `groups` (task archive S2 line) |

No live consumer yet: grep `BoardView\|TableView` in apps/web/src (non-test) → only collection/CLAUDE.md:41 (`renderView` is the module's).

### B. Interactions

| Interaction              | Wired?                            | File:line                 |
| ------------------------ | --------------------------------- | ------------------------- |
| Sort indicator (display) | yes                               | table-view.tsx:148        |
| Drag-to-move / reorder   | out by design (Capability, R5/H1) | interpretation.md:159-162 |

### C. Declared deferrals (doc states these are "homed by the docs, NOT deferred")

| Deferral (quote)                                                                                   | Doc:line                                           | Home named                                                                                      | Home status                             | Verdict                                                                  |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| "Board drag-to-move … = a Capability (ADR-008) … Homed to the capability tier / module ② consumer" | interpretation.md:136-139 (O1); slice-map.md:21-23 | ADR-008 Capability engine, wired in first consuming entity's closing slice (process.md:105-108) | first consumer (e.g. fe-tasks, planned) | BORROWED → first board-consuming entity ELC (#13 Capability by consumer) |
| "View-chrome controls … = the Collection shell"                                                    | interpretation.md:140-141 (O2)                     | fe-codec-collection #4                                                                          | merged PR #78 `752c798`                 | HOMED                                                                    |
| "Filter / group / sort LOGIC → the View Engine / provider"                                         | interpretation.md:142 (O3)                         | ADR-007 view engine (SavedView, by consumer per process.md:107)                                 | —                                       | BORROWED → consuming entity ELC                                          |
| "Module layout variants (Tasks' 12) → the owning module's ② track"                                 | interpretation.md:143 (O4)                         | fe-tasks                                                                                        | planned                                 | BORROWED → fe-tasks ELC                                                  |
| "Vision-board / Calendar-grid CANVAS → fe-codec-canvas-board (#10)"                                | interpretation.md:144 (O5)                         | fe-codec-canvas-board                                                                           | merged `a4f8962`                        | HOMED                                                                    |

### D. Envision — none.

**Verdict:** `fe-codec-viewmodes — ELC: N/A-by-role · legs S0/P0/L0 (2 N/A) · ORPHANs 0 · EC 0/0/0/0 · debt: none owned; Table/Board have no live consumer yet (met when a module surface composes them).`

---

## 4. fe-codec-controls-refinement (G6 sibling, LIF-231)

No `envision.md` (docs = phases/P1–P4b only). Change-Frontend-Component aesthetic pass over 9 ui-1 primitives + PomodoroWidget + ExportDialog.

### A. Data legs

| Leg                                                | File:line                                                    | Status      | Evidence                                                     |
| -------------------------------------------------- | ------------------------------------------------------------ | ----------- | ------------------------------------------------------------ |
| PomodoroWidget (tabular countdown + ring)          | packages/ui/src/components/pomodoro-widget.tsx:40-44,123-124 | N/A-by-role | Callbacks-as-props; clock owned by caller                    |
| ExportDialog                                       | packages/ui/src/components/export-dialog.tsx:10,26-28        | N/A-by-role | `onExport(format)`; "the APP wires serialization + download" |
| Dialog/Popover/Menu/Toast/atoms (elevation, hover) | per P3/P4/P4b                                                | N/A-by-role | Pure styling                                                 |

No live consumer of PomodoroWidget / ExportDialog in apps/web (grep non-test → 0).

### B. Interactions

| Interaction                     | Wired?                 | File:line                   |
| ------------------------------- | ---------------------- | --------------------------- |
| Pomodoro start/pause/reset/skip | yes (props → consumer) | pomodoro-widget.tsx:40-44   |
| Export format select + export   | yes (props → consumer) | export-dialog.tsx:26-28,143 |

### C. Declared deferrals

| Deferral (quote)                                                                                                              | Doc:line                           | Home named                                 | Home status                | Verdict                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | -------------------------- | ----------------------------------------- |
| SVG ring "native seam: RN would need `react-native-svg`; mobile isn't built … documented native follow-up, not an M1 blocker" | phases/P1-pomodoro-widget.md:81-83 | "native follow-up" (mobile build, ADR-001) | no issue; mobile not in M1 | ORPHAN (low: post-M1 mobile, no data leg) |

### D. Envision — none.

**Verdict:** `fe-codec-controls-refinement — ELC: N/A-by-role · legs S0/P0/L0 (3 N/A) · ORPHANs 1 (low, mobile) · EC 0/0/0/0 · debt: none for M1; Pomodoro/Export have no live consumer yet.`

---

## 5. fe-codec-primitives-refinement (G6 sibling, LIF-230)

No `envision.md` (card-refinement.md + phases P1/P3/P4/P5 + HTML mockups only).

### A. Data legs

| Leg                                                                 | File:line                                                     | Status      | Evidence                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| ListView · Card · Timeline · GalleryView · CalendarView refinements | packages/ui/src/components/calendar-view.tsx:183-200 (et al.) | N/A-by-role | Presentational renderers, state-as-prop; "NO interface change" (P5-calendar.md §3) |

### B. Interactions

| Interaction             | Wired?                     | File:line                 |
| ----------------------- | -------------------------- | ------------------------- |
| Calendar month ‹ › nav  | yes (`onMonthChange` prop) | calendar-view.tsx:150-153 |
| Gallery width weighting | yes (`getWeight` prop)     | P4 commit `5650333`       |

### C. Declared deferrals

| Deferral (quote)                                                                                                                    | Doc:line                    | Home named          | Home status                                                                  | Verdict                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| "day/week/agenda views · day-selection + 2D roving · drag-to-reschedule · richer <768 · any Layer-2 alive-hook … → fe-calendar #19" | phases/P5-calendar.md:84-86 | fe-calendar #19     | LIF-203 `in_progress` (S3 shipped, TASKS.md:10)                              | HOMED                                     |
| "adding 'Today,' to the cell aria-label is a noted non-regression deferral"                                                         | phases/P5-calendar.md:115   | none                | still absent: calendar-view.tsx:188 `aria-label={format(day,'d MMMM yyyy')}` | ORPHAN (a11y: today not SR-announced)     |
| "Cover-intelligence (generated covers) — the view engine's"                                                                         | phases/P4-gallery.md:49-50  | ADR-007 view engine | by consumer                                                                  | BORROWED → consuming entity / view engine |
| "True variable-height MASONRY — FORECLOSED by binding spec"                                                                         | phases/P4-gallery.md:51-55  | n/a (foreclosed)    | —                                                                            | not a deferral                            |

### D. Envision — none.

**Verdict:** `fe-codec-primitives-refinement — ELC: N/A-by-role · legs S0/P0/L0 (1 N/A) · ORPHANs 1 (Calendar "Today" SR label) · EC 0/0/0/0 · debt: one unhomed a11y deferral.`

---

## 6. fe-codec-canvas-board (#10, LIF-204)

### A. Data legs

| Leg                                                         | File:line                                         | Status                                   | Evidence                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `CanvasView` frame                                          | packages/ui/src/components/canvas-view.tsx:83-142 | N/A-by-role                              | Frame; "holds no renderer data" (:17)                                                       |
| Canvas adapter (`toCanvasHeader`, `resolveMeasureProgress`) | apps/web/src/canvas/adapter.ts:44-46,81-98,107    | N/A-by-role                              | Pure, no React, no data                                                                     |
| `useVisionBoard` (dreams) live hook                         | — (absent by design)                              | N/A-by-role (deferred to first consumer) | seam-contract.md:62 → fe-purposes                                                           |
| `useCalendar` live hook + cross-module `dueIn` fan-out      | — (absent by design)                              | N/A-by-role (deferred)                   | seam-contract.md:62-63 → fe-calendar #19 (slice-map S7 over ProviderRead, process.md:97-98) |

Only live consumer of `CanvasView`: `CanvasEditor` (apps/web/src/canvas-editor/canvas-editor.tsx:12,72) — itself not mounted by any route (see §2).

### B. Interactions

| Interaction                          | Wired?     | File:line              |
| ------------------------------------ | ---------- | ---------------------- |
| Read-only `actions` slot (month nav) | yes (slot) | canvas-view.tsx:43,133 |
| Empty/error override selection       | yes        | canvas-view.tsx:103    |

### C. Declared deferrals

| Deferral (quote)                                                                                            | Doc:line                                                                | Home named                          | Home status                           | Verdict                                                      |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| "Deferred: `useVisionBoard` / `useCalendar` data hooks (first consumer: `fe-purposes` / `fe-calendar #19`)" | delivery/seam-contract.md:62; slice-map.md:32,39; interpretation.md:127 | fe-purposes-and-goals · fe-calendar | LIF-195 planned · LIF-203 in_progress | HOMED                                                        |
| "cross-module `dueIn` fan-out (#19)"                                                                        | seam-contract.md:63; interpretation.md:62                               | fe-calendar #19                     | in_progress                           | HOMED (BORROWED legs → HARD-1 aggregator where cross-entity) |
| "production measure-driven tile (fe-purposes)"                                                              | seam-contract.md:63                                                     | fe-purposes-and-goals               | planned                               | HOMED                                                        |
| "Multi-range renderers + Living lens — OUT (deferred) → fe-calendar #19"; Day overflow → #19                | interpretation.md:94; envision.md:35-41                                 | fe-calendar #19                     | in_progress                           | HOMED                                                        |
| "Any write (drag/reposition/move/check) — OUT (Capability)"                                                 | interpretation.md:95,108-111                                            | owning module, ADR-008              | by consumer                           | BORROWED → owning entity ELC                                 |

### D. Envision conformance (envision.md:16-26, approved 2026-10-09)

| EC   | Type       | Assertion (short)                                                                                                                                                   | Status          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-1 | structural | Editorial masthead: uppercase eyebrow + serif `$display` title + quiet meta; single immersive surface                                                               | ✅              | canvas-view.tsx:111-129 (`textTransform:'uppercase'`, `fontFamily="$display"`, meta `$small` muted); VG PASS 3 presets × L/D × 375/768/1440 (task fe-codec-canvas-board.md S1 line)                                                                                                                                                                                                                                     |
| EC-2 | structural | Imagery-first gallery: cover tiles w/ **tag overlay** + serif title; **realized = `$colorBrandEmphasis` accent**, others muted; featured tiles larger (`getWeight`) | ❌              | slice-map.md:33-35,40 promised a S2 "reference `renderItem`" carrying this convention; it is absent: adapter.ts is pure/no-JSX (adapter.ts:44-107), and the only tile (canvas-view.stories.tsx:53-60 `dreamTile`) has no tag overlay (`tag` field unused), no realized/accent state, no `getWeight` (stories:93). Production tile is fe-purposes' — EC unmet at codec level, must be carried as a MUST into fe-purposes |
| EC-3 | structural | Derived-progress line ("N of M realized") in masthead                                                                                                               | ✅ (slot)       | canvas-view.tsx:41-42,131 progress slot; story RealizedMeter "Realized 3 / 7" (stories:25-42,92). Derivation = consumer (fe-purposes)                                                                                                                                                                                                                                                                                   |
| EC-4 | structural | Empty vision = teaching EmptyState "Add a dream"; empty calendar = designed 42-cell grid                                                                            | ✅              | canvas-view.tsx:103 override rule; stories:113-117 (EmptyState + "Add a dream"), :129-130 (calendar delegates); test canvas-view.test.tsx:53,63                                                                                                                                                                                                                                                                         |
| EC-5 | structural | Hosts shipped month `CalendarView` unchanged; title = user-named surface                                                                                            | ✅              | stories:102 (unchanged CalendarView); adapter.ts:44-46 `title: view.name`; canvas-view.tsx:37                                                                                                                                                                                                                                                                                                                           |
| EC-6 | structural | Read-only — month nav only, no drag/reorder/check/move                                                                                                              | ✅              | canvas-view.tsx:28,43 (no write affordance); stories:76-85 monthNav only                                                                                                                                                                                                                                                                                                                                                |
| EC-7 | feel       | Preset swap re-voices fonts + accent; immersive/full-bleed feel                                                                                                     | ⏳              | feel → live gate; no live vision/calendar surface exists yet                                                                                                                                                                                                                                                                                                                                                            |
| EC-8 | structural | AA ≥4.5 across 3 presets × L/D (masthead, meta, tile status, calendar figures)                                                                                      | ✅ (frame)      | VG ledger: title 15.84–17.29, eyebrow+meta 4.94–6.53 warm-dark (task S1 line); tile-status leg untestable until EC-2 tile exists                                                                                                                                                                                                                                                                                        |
| EC-9 | structural | Measure-driven tile progress: milestone→steps bar · quantitative→value/target · rate→ratio · qualitative→status · unmeasured→no bar                                 | ✅ (convention) | adapter.ts:81-98 `resolveMeasureProgress` (all 5 cases) + adapter.test.ts; rendered tile ⏳ at fe-purposes                                                                                                                                                                                                                                                                                                              |

**Verdict:** `fe-codec-canvas-board — ELC: N/A-by-role · legs S0/P0/L0 (4 N/A; live hooks homed to fe-purposes/#19) · ORPHANs 0 · EC ✅7/❌1/⏳1/?0 · debt: EC-2 reference tile convention (tag overlay · realized accent · getWeight) never built — must ride fe-purposes' closing slice as a MUST.`

---

## ORPHAN list

1. fe-codec-theme — adaptive-by-context density (interpretation.md:103,133) — low, forward feature.
2. fe-codec-theme — chrome font faces "deferred w/ chrome role" (archive/fe-codec-theme.md S2) — low.
3. fe-codec-patterns — `@vida/types` canon consolidation of TerminalState/ViewState/SearchStatus (slice-map.md:92; state-conventions.md:49-52) — low, type dedupe.
4. fe-codec-patterns — ux-2 `SearchStatus` re-expression over the superset (seam-contract.md:107) — low, optional.
5. fe-codec-controls-refinement — Pomodoro ring native `react-native-svg` follow-up (P1-pomodoro-widget.md:81-83) — post-M1 mobile.
6. fe-codec-primitives-refinement — CalendarView "Today," in the cell aria-label (P5-calendar.md:115; still absent calendar-view.tsx:188) — **a11y, M1-relevant**; natural home = fe-calendar #19 (in flight) if Victor homes it.

No ORPHAN is a data leg.

## EC divergence list

- **fe-codec-canvas-board EC-2 ❌** — "Imagery-first Gallery: cover tiles with a tag overlay + serif title; realized dreams marked with the accent (`$colorBrandEmphasis`), others muted; featured tiles proportionally larger (`getWeight`)". The S2 reference `renderItem` promised at slice-map.md:33-35,40 does not exist; the story tile (canvas-view.stories.tsx:53-60) shows none of tag overlay / realized accent / weighting. Resolve by carrying EC-2 as a named Visual-Gate MUST in fe-purposes-and-goals (LIF-195), or Victor re-pins.

## Cross-unit notes

- **Theme persistence (→ fe-settings ELC):** the blocker cited for deferring preferences persistence (worker `values` seam, decisions.md:9) landed in data-plane-wiring 2026-10-20 (apps/web/src/db/client.ts:12-15). `preferences` is still not registered in composition-root, `useThemeStore` boots at `THEME_DEFAULT` every load (theme-store.ts:26-27), and the "blocked by values" comments in theme-store.ts:9-13 / preferences-store.ts:9 / use-preferences.ts:7-9,26 are now stale. Home = module-go-lives.md:32 item #2 (superseded → re-home at G2–G4).
- **SyncStatus has no live render site (→ fe-notes ELC-6):** `CanvasEditor` is the only `SyncStatus` consumer and is unmounted; the live notes editor (note-editor-body.tsx) shows no save-state chip. Codec is fine; honest-sync-status is owed by the notes entity close.
- **Fake honest-state in gamification hooks (→ fe-gamification ELC-4/6):** `deriveInteractionState({ isPending: false, isError: false, … })` hard-coded at apps/web/src/gamification/use-currencies.ts:116, use-achievements.ts:107, use-gamification.ts:144, use-activity.ts:129, use-rules.ts:91. That means sample data, not a live query. The patterns codec is used correctly, but the state is not derived from a real query.
- **No live consumers yet** for TableView/BoardView (viewmodes), PomodoroWidget/ExportDialog (controls), or a vision-board/calendar Canvas (canvas-board). Per process.md §5 these codecs become "live" only when those consuming entities close.
- Housekeeping: archive `.claude/tasks/fe-codec-primitives-refinement.md` and `.claude/tasks/fe-codec-canvas-board.md` (both `Status: done`).
