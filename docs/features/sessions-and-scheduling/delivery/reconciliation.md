<!-- Reconciliation ledger — features/sessions-and-scheduling · RESCOPE (sessions-rescope, LIF-248) · Entity Delivery Flow §6 Step 4.
     BUILT code (both planes) vs `delivery/interpretation.md` rev 4 (Interpretation Gate PASS 2026-10-27) + the inherited ECs.
     Buckets: ✅ aligned · ❌ wrong (→fix) · 📄 undocumented/stale doc (→back-fill) · 🕳 gap (→build) · ⛔ ungated-owed (→run gate).
     Plane: B = backend (①) · F = frontend (②) · S = shared. Exit condition = a DRY pass (§3). -->

# Reconciliation — Sessions & Scheduling · sessions-rescope

## 1. Ledger

| # | Item (interp ref) | Plane | Bucket | Built evidence | Required (cite) |
|---|---|---|---|---|---|
| R-1 | Register `sessions` in the web root (L1) | S | ✅ | `apps/web/src/db/composition-root.ts:100` | ELC-3 |
| R-2 | `attach_pomodoro` handler (L2, IR-S3) | B | 🕳 | no handler in `packages/core/src` (grep) | contract:57 · TAS-17 · ADR-004:88,93-94 |
| R-3 | Focus handlers registered at the web root (L2) | S | 🕳 | registry EMPTY, `composition-root.ts:94-99`; `composeServices` is SYNC (`:83`) while `registerTasksTimer` is async (`tasks/service.ts:112`) | composition-root.ts:96 · ELC-3 |
| R-4 | `completeFocus` closes the spine via the one firing path (L3, IR-S1, IR-S17) | B | ❌ | finalizes the run only, spine stays `in_progress` (`sessions/service.ts:520-544`) | BR-25 · pomodoro contract:20-21 · IR-1 |
| R-5 | `cancelFocus` → spine `skipped`, no effects; focus def `in_progress→skipped` (L3, IR-S2) | B | ❌ | spine untouched (`service.ts:546+`); def has start/complete only (`registry.ts:33-36`) | ADR-004:65 · sessions BR:84 · pomodoro BR:62,70-72 |
| R-6 | Focus `log_time` payload = real focus time derived from persisted rows (L4, IR-S5) | B | ❌ | engine fires payload-less (`lifecycle.ts:72-80`) | PD-5 · PD-9 |
| R-7 | `log_time`/`attach_pomodoro` keyed per RUN; keyed + `award_xp` per occurrence (IR-S16) | B | ❌ | every effect keyed `(target ‖ utcDate ‖ type)` (`lifecycle.ts:68,76-80`) — a 2nd run same task/day is deduped | TAS-17 · PD-12 · ADR-004:83,99-100 · §XXVIII vs BR-S3-5 |
| R-8 | Tasks `log_time` handler: log `duration_seconds`; throw (A.3) instead of silent return | B (tasks) | ❌ | skips payload-less events (`tasks/service.ts:91-98`) — the rail already wrote the ledger row (`effects/service.ts:58-68`); logs `ended − started` (`:99`) | ADR-004:93-94 · PD-5 |
| R-9 | canTouch(type, effect, target) with catalogue target typing → `PermissionDenied` (IR-S4(1)) | B | 🕳 | canTouch is STRUCTURAL only (`lifecycle.ts:7-8`); no `PermissionDenied` class (grep) | contract:30,64 · ADR-004:61 |
| R-10 | Runtime handler failure → `EffectFailed`, completion commits; remaining effects fire (IR-S4(4)) | B | ❌ | a throw aborts the transition before the status commit (`lifecycle.ts:111-131`); no `EffectFailed` class | pomodoro BR:78-79 · contract:59 |
| R-11 | Vanished (soft-deleted) target → loud no-op, not a failure (IR-S4(2)) | B | 🕳 | no handling; `resolveTargets` behaviour on deleted subjects to confirm at PLAN | sessions BR:79-80 |
| R-12 | `transition()` preflight: all non-projection handlers registered before ANY write (IR-S17(0)) | B | ❌ | `NoEffectHandler` surfaces mid-loop after earlier effects applied (`lifecycle.ts:70-87`) | ADR-004:91-92 |
| R-13 | Soft-deleted spine treated as missing by `transition()` (IR-S17) | B | ❌ | spine read without `deleted_at` filter (`lifecycle.ts:100`) | pomodoro BR:63-64 |
| R-14 | `completeFocus` resumes the close on a completed run under an `in_progress` spine (IR-S17) | B | ❌ | throws `InvalidFocusTransition` (`service.ts:523-525`) | §XXVIII vs BR-21 |
| R-15 | `replayCompletionEffects(sessionId)` + derived "unapplied" (IR-S4) | B | 🕳 | none; `fireCompletionEffects` exported for tests only (`foundation/sessions/index.ts:10`) | ADR-004 B.2 · sessions BR:84-85 |
| R-16 | `findActiveSession()` (L6, IR-S7) | B | 🕳 | not in `SessionsService` (`service.ts:123-180`) | F-HUD-1 |
| R-17 | Applied-effects read per session + shared event-id builder (L7, IR-S11) | B | 🕳 | ids built inline in `lifecycle.ts:68-81`; no read API | runtime seam-contract:27-28 · E12 |
| R-18 | `dueIn` failed-lane variant (L8, IR-S12) | B | ❌ | failing lane swallowed (`service.ts:795-800`, "deferred (§2)") | S7-duein-analytics:21-23 · BR:89-91 · G17 |
| R-19 | `ProviderUnavailable` in a shared home (IR-S12) | B | ❌ | lives in `services/journals/types.ts:140-146` (journals-owned, "shared with Sessions/Calendar") | barrel collision risk, `index.ts:166,172` |
| R-20 | `listSessionsForEntity(type, id, range)` (L9) | B | 🕳 | absent | routines PLAN-S5c:134-136 |
| R-21 | Focus def declares `surface_journal` (effects + allowed_effects) (L10) | B | ❌ | `[attach_pomodoro, log_time]` only (`registry.ts:31,39`) | PD-10 (pomodoro BR:48-50) |
| R-22 | `award_xp` on focus | B | edge | no handler (`economy/handlers.ts:67-70`) | → gamification-rescope (SES-13) |
| R-23 | Focus-runtime store (L11, IR-S10) | F | 🕳 | no `apps/web/src/stores/focus-runtime-ui-store.ts` | ADR-020:15 · coverage-report:163 |
| R-24 | `useActiveSession` live (L12) | F | 🕳 | stub → `hidden` (`use-active-session.ts`) | F-HUD-1 · ELC-4 |
| R-25 | HUD port binding: pause by focus-row id, resume via `startFocus({sessionId})` (IR-S6) | F | ❌ | no-op port; sketch binds spine id directly (`use-active-session.ts:22`; `session-hud.tsx:205`) | service.ts:151,457-466 |
| R-26 | HUD paused-elapsed form + Pause⇄Resume by derived state (IR-S9) | F | ❌ | paused derives from `countdown.pausedAt` only (`types.ts:39`; `session-hud.tsx:122`) | EC-4 · EC-3b · BR-21 · §XXVIII |
| R-27 | HUD title + kind derivation (IR-S8) | F | 🕳 | stub has none (samples only) | flow-session interp:189-191 |
| R-28 | `useFlowSession` live (L13) | F | 🕳 | stub, empty default (`use-flow-session.ts:70`) | ELC-4 |
| R-29 | Mark-done live, focus → `completeFocus` (IR-S13) | F | 🕳 | no-op port; adapter always `transition(…,'complete')` (`adapter.ts:115`) | pomodoro contract:20-21 |
| R-30 | X12 — attach renders, intent dropped (IR-S14) | F | ❌ | `attachTarget: () => undefined` with a visible affordance (`session-runtime-surface.tsx:78`; `adapter.ts:117-120`) | decisions.md:65,1177 · EC-2 |
| R-31 | Proof affordance visible, no-op (IR-S14) | F | ❌ | `onProof: () => {}` (`session-runtime-surface.tsx:79`) | ELC-5 · decisions.md:1177 |
| R-32 | Routines N9 detach workaround (L15) | B (routines) | ❌ (after R-4) | detaches after `completeFocus` (`routines/service.ts:979-984`) | attach_pomodoro binding · routines current-BR:97-99 |
| R-33 | Routines stamp-retry / re-entry vs a closed spine (L17) | B (routines) | ❌ (after R-4) | relies on `findOpenSessionForEntity` (`in_progress` only, `sessions/service.ts:442`); `routines/service.ts:990-1003,1084-1085` | BR-RT-S3d-5 |
| R-34 | Test harnesses register focus handlers (L18) | B | 🕳 | routines harness registers the tasks timer optionally (`routines-service.test.ts:105,129`); sessions tests have no focus handlers | IR-S4(3) |
| R-35 | Stale code comments (L16) | F | 📄 | `use-active-session.ts:4-5` · `use-flow-session.ts:4-6` · `session-runtime/CLAUDE.md:21` | §XXIX |
| R-36 | Current-* currency for changed rules (BR-9, BR-10, BR-21, BR-25; effects current-BR; tasks/routines current-*) | S | 📄 | rules change with R-4…R-14, R-32/33 | §XXIX |
| R-37 | HUD idle form stays hidden in M1 | F | ✅ | `hidden` default; no start flow | HUD Envision answer 1 |
| R-38 | Runtime page terminal ladder | F | ✅ | `deriveTerminalState` ladder in the surface | state-conventions · EC-6 |
| R-39 | ELC-7 live leg for HUD EC-1…10 + Flow EC-2/4/5–11 | S | ⛔ | gated on DEV `?sample` only (fe-session-hud/runtime Visual Gates) | ELC-7 (process.md:41,172) · L19 seed path |
| R-40 | Flow EC-2 proof + target-less attach | F | ⛔ → fe-sessions close | recorded divergence (IR-S14) | §2.5 rule 3 · debt-plan:51 |

**Totals:** ✅ 3 · ❌ 20 · 🕳 14 · 📄 2 · ⛔ 2 · edge 1 (40 rows; R-32/R-33 become ❌ once R-4 lands).

## 2. Impact scan (shared signatures this rescope changes)

| Changed | Call-sites (N) | Breaks? | Decision |
|---|---|---|---|
| `transition()` — preflight · soft-delete filter · per-sub-type payload resolver · `TransitionResult += denied[], failed[]` · class keying | 2 prod (`sessions/service.ts:449,453`) + 4 tests (`lifecycle.test.ts:98,113,128,155`) | SAFE: result shape is additive; preflight passes for every shipped def with `effects: []` (`work` tasks/service.ts:76, `review` purposes:712, `reading` books:209) and fails closed only where handlers are missing — which already threw (`sessions-service.test.ts:304` stays green) | B — in place, all callers covered |
| `completeSession` (→ `transition`) | 6 prod: tasks:565 · flashcards:260 · books:804 · routines:864,905,926 | SAFE (all `effects: []` defs) | B |
| `fireCompletionEffects` — class keying; exported | 1 prod (`lifecycle.ts:113`) + test A4 (`lifecycle.test.ts:136-142`) | A4 keys per occurrence for its def → re-check its def; keyed defs SAFE | B |
| `completeFocus` — closes spine, fires effects, resume-close | 1 prod (`routines/service.ts:1084`) + tests sessions:387,393,422 · routines:778,801,1924 | BREAKS routines (expects no effects/open spine → R-32/R-33) and sessions:393 (resume path vs terminal) — tests need focus handlers (R-34) | B — fix all 7 in the same slices |
| `cancelFocus` — spine `skip` | 2 prod (`routines/service.ts:1018,1065`) + tests sessions:400 · routines:792 | routines re-entry after cancel (closed spine) → R-33 | B |
| Tasks `log_time` handler — `duration_seconds`, throw on invalid | 1 emitter (`tasks/service.ts:558-563`, passes `{started_at, ended_at}`, keyed `(sessionId ‖ 'time_logged')`) | SAFE if `duration_seconds` is optional (tasks timer has no pauses → `ended − started`) | B |
| `ProviderUnavailable` move | 1 class + journals test (`registry.test.ts:22,99,106`) | re-export from journals keeps it SAFE | A-style: move + re-export |
| `dueIn` | prod: notifications:406 · calendar use-calendar:104,108 · composition-root.test:44 | SAFE — unchanged; the variant is NEW (`dueInDetailed`) | A — new function |
| `composeServices` sync → async (R-3) | 3: composition-root.ts:127 · calendar-readonly.test.ts:33 · composition-root.test.ts:15 | BREAKS all 3 (Promise) | B — fix all 3 |
| `HudTiming.elapsed += pausedAt?` + paused derivation | 7 files in `apps/web/src/session-hud/` (types · use-hud-clock(+test) · use-active-session(+test) · session-hud(+test)) | additive field SAFE; derivation change touches session-hud.tsx + its tests | B |
| `bindFlowIntents` — optional handlers when no target | 1 prod (`session-runtime-surface.tsx:77`) + tests adapter.test.ts:73,80,93 | SAFE (opts already optional); view hides absent handlers | B |
| `SHIPPED_SESSION_TYPES` focus def (+skip, +surface_journal) | registry.ts:74,79 (envelope ceiling) · registry.test.ts:20,159 · flashcards envelope note (`flashcards/service.ts:70`) | ceiling widens by `surface_journal` (recorded); registry tests updated | B |
| `deriveEffectEventId` | economy/handlers.ts:47 · effects/service.ts:42 · notifications/service.ts:367 | SAFE — signature unchanged; only the inputs fire-step passes change | — |

```
IMPACT SCAN — sessions-rescope (13 shared signatures)
Call-sites: enumerated per row above (prod + tests)
Breaks:     completeFocus/cancelFocus callers (routines ×3 prod, 6 tests) · composeServices ×3 · HUD derivation tests
Decision:   B fix-all for each, in the slice that changes the signature; A (new function) for dueInDetailed
Untreated:  0
Verdict:    CLEAR to proceed (re-run per slice at PLAN gate 2)
```

## 3. Dry pass
Pass 1 (this ledger) → pass 2 (independent sweep) must surface zero new items. Recorded below.
