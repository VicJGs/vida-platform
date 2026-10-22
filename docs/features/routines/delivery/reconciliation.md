<!-- Reconciliation Ledger — features/routines · Entity Delivery Flow ① RECOVERY (entity-rescope) · Step 4 -->

# mod-routines — Reconciliation Ledger (built vs gated docs)

> Built code (as-built S1–S3, worktree `mod-routines` @ `95fc4ba`) swept item by item against the gated yardstick:
> `delivery/interpretation.md` (rules 1–23 · N1–N9 · R1–R5 · D1–D3) + `delivery/seam-contract.md` + `delivery/slice-map.md`
> + ROU-01…33. Each row is cross-checked code ↔ its doc layer and tagged by plane.
> **Buckets:** ✅ aligned · ❌ wrong (→ fix) · 📄 undocumented (built right, doc lags → back-fill) · 🕳 gap (→ build) ·
> ⛔ ungated-owed (→ run gate). **Planes:** B = backend (①) · F = frontend (② fe-routines) · S = shared.
> **Exit condition:** a DRY pass. **Pass 1** = the full sweep (items marked ² were found while writing it, from a line-by-line read).
> **Pass 2** re-swept `service.ts`/`validators`/`types` line-by-line and found 4 new items (marked ³). **Pass 3** (barrel, `@vida/types`,
> schema mirror, test file) found **0 new items** → exhaustive.
> Paths are relative to `packages/core/src/` unless stated.

## Impact scan (victor:impact-scan) — blast radius of every change this ledger implies
```
IMPACT SCAN — routines public surface (createRoutinesService, RoutinesService methods, errors, validators, @vida/types routine)
Call-sites: 3 outside the module  [core/index.ts (barrel export *) · validators/index.ts (export *) · validators/enum-parity.test.ts:60-61,298-301 (tuples)]
            + the module's own test file (services/routines/__tests__/routines-service.test.ts)
            (purposes/* hits = false positives: PlanStepNotFoundError + comments; db/tests/routines-introspection.test.ts = comment only)
Breaks:     none outside the module — no app/runtime consumer (composition-root does not register routines; N5).
            Enum tuples (ROUTINE_LIFECYCLE / ROUTINE_TIME_OF_DAY) are untouched by every row below → enum-parity SAFE.
            Own tests BREAK on: factory deps (D1 required tasks), reorderSteps return, completeStep return union → updated in-slice.
Decision:   B — fix all call-sites in the owning slice (N = own test file only; no external caller to protect).
Untreated:  0
Verdict:    CLEAR to proceed
```

## A. Governing seam surface (seam-contract.md) vs built

| # | Item | Built (code) | Doc | Bucket · Plane |
|---|---|---|---|---|
| A1 | Factory `createRoutinesService(deps)` shape | factory-object, hoisted closures, no `this.` `service.ts:76-293` | seam Factory; interp §3 | ✅ B |
| A2 | Factory **deps** | `{db, deviceId, clock?}` only `types.ts:25-30` | seam :12-24; D1 (`tasks` required); N3 (`registry` kept for validation, `measurementSources` dropped); required-vs-optional split per N3 | 🕳 B. Each dep lands in the slice that first consumes it (the habits precedent, `types.ts:7-8`). `clock?` is built but missing from the seam → 📄 |
| A3 | `createRoutine` | `service.ts:169-172` | seam :29 | ✅ B (built also accepts `lifecycle`/`progress`; superset, valid) |
| A4 | `updateRoutine` | `service.ts:174-177` | seam :30 | ✅ B |
| A5 | `archiveRoutine` (soft · cascade steps · ledger preserved) | `service.ts:179-187` | seam :31; rule 6; gate A10 | ✅ B (baseline F3 re-classified) |
| A6 | `setLifecycle(id, lifecycle): Routine` | absent (only via `updateRoutine`) | seam :32; ROU-17 | 🕳 B (baseline F4) |
| A7 | `getRoutine` / `listRoutines({lifecycle})` | `service.ts:189-199` | seam :33-34 | ✅ B |
| A8² | `listRoutines` ordering | returns DB order; `sort_order` column ignored | `sort_order` column (`routines.ts:60`) + RT-2 "ordered"; `listSteps` sorts by `step_order` | ❌ B, low. Sort by `sort_order` [INTERP: column semantics; listSteps precedent] |
| A9 | `addStep` | `service.ts:202-206`, guards parent `RoutineNotFoundError` | seam :39 | ✅ B (core) |
| A10 | `addStep` **validates `entity_type`** against `TaggableTypeRegistry` | not validated | R2; N3; sessions precedent `sessions/service.ts:393` | 🕳 B |
| A11² | `addStep` default `step_order` | defaults to **0** → every unordered add ties at 0; order then rests on DB return order | RT-2 "named ordered SEQUENCE" | ❌ B, low. Default = append (max+1) [INTERP RT-2] |
| A12 | `reorderSteps` return | `Promise<void>` `types.ts:84` | seam :40 `Promise<RoutineStep[]>` | ❌ B, low. Return the reordered steps (seam) |
| A13 | `removeStep` (soft; ledger preserved) | `service.ts:213-215` | seam :41; rule 6 | ✅ B |
| A14 | `listSteps` | `service.ts:231-236` | seam :42 | ✅ B |
| A15 | `runStep(stepId): StepRunState` — the RT-3 drive | absent | seam :48; ROU-07; rules 1/15/17/18; N7; R2/R5 | 🕳 B. **Keystone** |
| A16 | `completeStep` | ledger-only upsert for **any** step `service.ts:239-247` | seam :49 (actionable → ledger; driven → delegate, returns union); rule 1; N7 (drive then stamp) | ❌ B. **Drive leg missing** (baseline F1). Signature drift: built `(stepId, {date?, actual_duration_minutes?})` vs seam `(stepId, date)`. Built is richer and keeps the duration (ledger column) → amend the seam to built + return the union |
| A17 | `skipStep` (logged) + `planSkipDates` (pre-planned) | `service.ts:249-266` | seam :50 single `skipStep(kind)`; RT-8 two mechanisms; §XXVIII g2-approved | 📄 B. Built is right; back-fill the seam (gate §A "Step-4/5 input") |
| A18 | `editCompletion` · `deleteCompletion` · `listCompletions` | `service.ts:268-290` | not in seam; required by RT-14 "editing/deleting a past completion re-derives" (business-rules.md:100-101) + the S2 ledger scope | 📄 B. Back-fill the seam |
| A19 | `rescheduleStep(stepId, date): DueItem` + `OutsideAcceptanceWindow` | absent | seam :51; ROU-10; **R3** (caller-date leg in M1; auto-slot = borrowed leg) | 🕳 B (routine-owned legs) · borrowed auto-slot leg → named home at the Re-scope Gate |
| A20 | `evaluateRoutine` (+ **PolicyUndefined flag** field) | absent | seam :56-59; ROU-12; R4 (flagged fallback → seam amendment) | 🕳 B |
| A21 | `progress(routineId)` via `resolveProgress` | absent | seam :60; ROU-13; rule 3 | 🕳 B |
| A22 | `getStreak` (policy-derived READ seam) · `getAnalytics` | absent | seam :61-62; ROU-15/16; D3 | 🕳 B |
| A23 | `dueIn` · `getDueReminders` · `summary` + `registerRoutinesJournal` / `registerRoutinesDueProvider` | absent | seam :66-73; ROU-19/20; N5 (helpers shipped, not called) | 🕳 B |
| A24 | Typed errors `EntityUnavailable` · `OutsideAcceptanceWindow` · `PolicyUndefined` · `ProviderEmitFailed` | absent | seam :77-80; ROU-30 | 🕳 B (each lands with its slice) |
| A25 | Built errors `RoutineNotFoundError` · `StepNotFoundError` · `CompletionNotFoundError` | `types.ts:47-68` | not in seam | 📄 B. Back-fill the seam error list |
| A26 | Routine-level effects (`award_xp` + `contribute_purpose_metric`, D3) | absent | D3; rules 2/13/21; N8 (producer guard); ROU-21/22 | 🕳 B |
| A27 | Tags · notes · links (`routine_step` + `routine`) | absent | D2; rules 14/19; ROU-23/26 | 🕳 B |

## B. Validation & invariants vs built

| # | Item | Built | Doc | Bucket · Plane |
|---|---|---|---|---|
| B1 | Calendar-date format (`date`, `skip_dates[]`) | `CalendarDate = z.string()` `validators/routine.ts:65`; schema accepts free strings for `skip_dates` | rule 16; ADR-002 §2.8; projects `CalendarDateSchema` precedent `validators/project.ts:26-27` | ❌ B (baseline F2) |
| B2² | `progress` override range | `z.number().int().nullable()` `validators/routine.ts:32`, unbounded | projects `ProgressSchema = int().min(0).max(100)` `validators/project.ts:25`; the 0-100 convention `projects/service.ts:483` (`/ 100`) feeding `resolveProgress` | ❌ B, low |
| B3² | `recurrence_rule` validity | any string accepted `validators/routine.ts:28` | RFC-5545 RRULE (ADR-002:1160) expanded by `ical.js` (R3); an invalid rule would break `dueIn`/evaluate for that routine; constitution §5 fail-loud at the boundary | 🕳 B. Parse-validate at write [INTERP] |
| B4 | Enum validation (`lifecycle`, `measurement_kind`, `binding_mode`, `time_of_day`) | `validators/routine.ts:19-22,29-31,52` | DB-9 parity; `enum-parity.test.ts:298-301` | ✅ B |
| B5 | `step_type` OPEN, stored as-is | `validators/routine.ts:46` | R2; rule 5 | ✅ B |
| B6 | Faithful create-echo · partial update never blanks · `skip_dates` JSON | `service.ts:131-165` | rules 8/9 | ✅ B |
| B7 | Explicit soft-delete filter on `findWhere` reads | `service.ts:184,195,219,232` | rule 7 | ✅ B |
| B8 | Ledger upsert per (step,date); done clears skip | `service.ts:97-128,239-257` | RT-18; RT-5/8; rule 17 | ✅ B |
| B9 | Ledger hard-delete; no orphan completion | `service.ts:83,91-95,280-284` | RT-14/17; rule 6 | ✅ B |
| B10 | `[E]` seam empty · Row→interface mappers | `service.ts:79-83,61-75` | rules 10/11 | ✅ B |
| B11 | "Today" = UTC day | inline `toISOString().slice(0,10)` `service.ts:78` | N6 (`utcDay` convention, `tasks/service.ts:178-199`) | ✅ semantics · ❌ low duplication (baseline F6). Reuse `utcDay` once `tasks` is a dep (D1) |
| B12 | Update-by-id on a missing row → generic `Row not found` | Repository `db/repository.ts:413` | ratified twin-repo behaviour (g2 N1, current-business-rules) | ✅ B |
| B14³ | `deleteCompletion` does not check the step exists (asymmetric with `editCompletion`) | `service.ts:280-284` | finds by (step,date) only, so a missing step ⇒ `CompletionNotFoundError` anyway | ✅ B (harmless) |
| B15³ | `updateStep` on a soft-deleted step re-stamps it | `service.ts:208-211` | ratified twin-repo behaviour (g2 N1, as-built S2) | ✅ B |
| B16³ | Empty `name` / `title` accepted | `z.string()` `validators/routine.ts:26,36,50,57` | RT-2 "**named** sequence"; tasks/projects convention `.min(1)` `validators/task.ts:33; validators/project.ts:36` (habits `z.string()` is the outlier) | ❌ B, low [INTERP RT-2 + majority convention] |
| B13 | Purge path (hard delete step + its completions) | no purge op exists | rule 6 (constrains any future purge); seam lists no purge | ✅ B. Invariant holds vacuously; owed only if a purge op is introduced |

## C. NEEDS (interpretation §2) vs built

| # | Need | State | Bucket |
|---|---|---|---|
| C1 | N1 vault before writes | test harness `migrate()` + live store; no new boot step | ✅ B |
| C2 | N2 entity types seeded | `_registry.ts:45-46` | ✅ B |
| C3 | N3 deps | see A2 | 🕳 B |
| C4 | N4 / R5 session sub-type availability | n/a until runStep | 🕳 B (with A15) |
| C5 | N5 composition root not this track | not registered (correct) | ✅ B · entity-close item → fe-routines (process §4) |
| C6 | N7 drive-then-stamp ordering | n/a until runStep/completeStep drive | 🕳 B (with A15/A16) |
| C7 | N8 effect producer guard | n/a until effects | 🕳 B (with A26) |
| C8 | N9 focus completion | `completeFocus` completes the timer row with no effects (`services/sessions/service.ts:507-531`); live | ✅ B (corrected at the Re-scope Gate. The Step-3 claim assumed `completeSession`) · rides S3 |

## D. Durable docs & code comments (§XXIX)

| # | Item | State | Bucket |
|---|---|---|---|
| D1 | `docs/modules/routines/current-*` | refreshed at Step 0 (+ F1/F3 re-classified) | ✅ (refresh per slice) |
| D2 | `services/routines/CLAUDE.md` | claims "No feature code lives here yet" `CLAUDE.md:15-16` | 📄 back-fill |
| D3 | `types.ts` header + section comments cite the superseded 8-slice numbering ("S2–S8 append … per slice-map") `types.ts:5-8` | stale | 📄 back-fill (ride the next slice touching `types.ts`) |
| D4 | Test titles cite retired `IR-n` labels (e.g. `routines-service.test.ts:81,138,177,218`) | stale labels | 📄 back-fill (cosmetic; rename to interp §4.n or RT-n) |
| D5 | `db/tests/routines-introspection.test.ts:13-15` comment says DB-11 divergences are "DEFERRED" | DB-11 done in as-built S1 | 📄 back-fill |
| D6 | Aspect docs stale wording (banner placed) | bannered at Step 1 | 📄 → full rewording at unit-close §XXIX (gate D.4) |
| D8³ | `archiveRoutine` comment "Idempotent: already-deleted steps re-stamp" `service.ts:180-182` | the code filters `isNull(deleted_at)` (`:184`), so already-deleted steps are **not** re-stamped | 📄 back-fill (fix the comment) |
| D7 | `seam-contract.md` amendments (A2 clock · A12 · A16 · A17 · A18 · A20 flag · A25) + slice-map S6 amendment (R3) | owed | 📄 → written at the Re-scope Gate (Step 5) |

## E. Gates (⛔) and planes

| # | Item | State | Bucket |
|---|---|---|---|
| E1 | as-built S1–S3 per-slice gates | each ran the full gate against the **2026-10-13** plan: live-store Verification Gate, g2 SHIP, /critique SHIP, §XXIX (task-file slice log; commits `cb9ee27`/`c768132`/`2b26e2a`). The aligned rows (A1,A3-5,A7,A9,A13-14,A17-18,B4-B10) need no re-gate: their yardstick claims are unchanged in the governing set | ✅ B |
| E2 | Rows bucketed ❌/🕳 | each becomes a slice with the full §XXVI gate (Step 6) | ⛔ by construction → slice-map |
| E3 | ② plane (frontend) | no routines surface exists in `apps/web` (grep: none); today-list / run flow / standalone page / policy UI = **fe-routines (#104)** with its own Envision + Visual Gates | not started, out of ① scope. **Not a ❌** |
| E4 | Entity Live Close (ELC-1…9, golive process) | the routines **entity** closes with fe-routines; ① closes its **track** at the last slice (process §4) | ⛔ homed → fe-routines entity close |
| E5 | Shared (S) plane | the seam contract is the shared artifact; amendments in D7 | 📄 → Step 5 |

## F. Coverage — ROU-01…33 → ledger rows (nothing unhomed)
ROU-01/02 → A3/A4 · 03 → A5 · 04 → A9/A10/A11 · 05 → A12 · 06 → A13 · 07 → A15 · 08 → A16 · 09 → A17 · 10 → A19 · 11 →
gate A11 (null-entity actionable step; built `routines-service.test.ts:212` ✅) · 12 → A20 · 13 → A21 · 14 → B4 (axes) + rule 12 ·
15/16 → A22 · 17 → A6 · 18 → A20/A22 (miss/acceptance) · 19/20 → A23 · 21 → A26 · 22 → A26 · 23 → A27 · 24 → A20 (prefs port) ·
25 → homed 007/SP5 (R2) · 26 → A27 · 27 → homed Spaces design-pass (gate A4) · 28 → R3 (cadence = own `ical.js`; slot = borrowed) ·
29 → B1/B4 · 30 → A24 · 31 → B8 · 32 → B10 · 33 → E1 (service exists now).

## G. Summary (after pass 3 — dry)
| Bucket | Count | Rows |
|---|---|---|
| ✅ aligned | 27 | A1, A3–A5, A7, A9, A13, A14, B4–B10, B12–B15, C1, C2, C5, D1, E1 (+ B11 semantics) |
| ❌ wrong → fix | 8 | **A16 (drive leg)**, B1 (date format), A8², A11², A12, B2², B11 (dup), B16³ |
| 📄 undocumented → back-fill | 10 | A17, A18, A25, A2-clock, D2–D8 (D6/D7 at their homes) |
| 🕳 gap → build | 14 | A2, A6, A10, **A15 runStep**, A19, A20, A21, A22, A23, A24, A26, A27, B3², C3/C4/C6/C7 (ride A15/A26) |
| 🕳 borrowed (not routines') | 1 | A19 auto-slot leg (G5 placement) → `⚠ INTENDED-later` M1.2 (documented milestone home) |
| ⛔ | — | E2 by construction; E4 homed to the fe-routines entity close |
Open UNKNOWNs carried (not ledger defects): interp rules 22 (task step in a recurring routine) and 23 (habit tick vs done) → pinned
at the run/drive slice PLAN; R4 default values → evaluate slice PLAN (Victor).
