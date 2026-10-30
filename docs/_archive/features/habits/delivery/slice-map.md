<!-- Decomposition / slice-map — features/habits · Entity Delivery Flow §2/§4/§8 · MOD-habits ① (LIF-125, #49)
     Mode = RATIFY + detail (§8): the ①/② split + the HAB-01…28 legs are doc-fixed (parts/habits.md); this
     records+validates the prescribed split and adds what's open — the ordered backend slices + the per-slice
     Verification-Gate ledger + the seam-contract (sibling file). It never forks against the fixed structure. -->

# Slice Map — Habits (① backend service tier)

## Framing

- **Entity:** `createHabitsService` over DB-4 `habits` + `habit_completions` (+ `project_habits` junction, KEPT).
- **Plane:** every slice below is **`backend`**. All `frontend`/`shared` UI faces of the SPLIT legs
  (`parts/habits.md` boundary column) are **② `fe-habits` (LIF-182, #72)** — out of scope here.
  `[FACT: docs/specs/foundation/backend-intent/parts/habits.md:5; reconstructed-structure.md:152]`
- **Envision Gate (§3.75):** N/A — pure-backend, renders no surface (stated per §1.875, not skipped).
- **Spec-set shape (decision, gate-validate this):** following the **finance precedent** — the most recent
  validated MOD run — the Entity Delivery Flow `service/` 5-lens set is COLLAPSED into `delivery/slice-map.md`
  (this file) + `delivery/seam-contract.md` (the operations/contract lens) + `parts/habits.md` (the per-leg
  operation roster with signatures). The per-slice PLAN (§XXVI g1) + IMPLEMENTATION-PLAN (§XXVI g2) are authored
  per slice during the build loop (Steps 3–11 iterate), exactly as finance ran S1–S8.
  `[FACT: docs/features/finance/delivery/ (slice-map + seam-contract only; no service/ dir); TASKS.md finance slice trail]`

## Ordered backend slices

| Slice  | Name                                                   | Legs (parts/habits.md)                                                                                                   | Verification-Gate focus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | Definition CRUD + validators + `@vida/types` reconcile | HAB-01, HAB-02, HAB-03, HAB-04, HAB-20 (axes expose/validate), HAB-23 (restored fields), HAB-24, HAB-26 (E-seam), HAB-28 | createHabit/updateHabit/softDeleteHabit/listHabits; enum validation (Zod + CHECK parity); faithful create-echo (IR-2); `@vida/types` **+4 −`tags`** on `Habit`, **+3** on `HabitCompletion`; HAB-26 keeps the pass-through encrypt-seam (`encryptedFields:[]`, IR-4 — field-level wiring → M3/DB-5)                                                                                                                                                                                                                                                      |
| **S2** | Completion ledger + streak recompute engine            | HAB-07, HAB-08, HAB-09, HAB-10, HAB-11, HAB-12, HAB-14                                                                   | logCompletion (UPSERT per (habit,date), IR-8-safe) / logDetailedCompletion (ratings 1–5) / editCompletion / deleteCompletion; done-derivation (`count>=target_count`, partial≠streak); build/break semantics; **flagship: deterministic streak recompute from ledger on every mutation** (IR-1); app-layer cascade on habit delete (HAB-03↔ledger)                                                                                                                                                                                                       |
| **S3** | Backfill + window policy                               | HAB-13                                                                                                                   | backfillCompletion(pastDate) → recompute (reuse S2 engine); `BackfillWindowError` beyond the window; window value via a **deny-safe Preferences port** (Preferences owns `habit_backfill_window_days`)                                                                                                                                                                                                                                                                                                                                                   |
| **S4** | Derived reads: today-list + analytics + M5 seam        | HAB-05, HAB-15, HAB-20 (rate read — design-pass)                                                                         | getTodayHabits (schedule-eligibility derivation, grouped by `time_of_day`); getStreak/getCompletionRate/getMoodTrend/getCalendar (derived-from-ledger); the **M5 measure provider seam** (R7); `rate` derivation formula flagged design-pass                                                                                                                                                                                                                                                                                                             |
| **S5** | Effect fan-out + cross-module seams + registration     | HAB-06, HAB-16, HAB-17, HAB-18, HAB-19, HAB-21, HAB-22, HAB-25, HAB-27                                                   | completion effect producer (`complete_habit_occurrence` · `contribute_purpose_metric` · `award_xp`) — **post-commit, guarded, dormant-safe** (IR-5), idempotent via rail R1; fail-loud `MetricContributionError` (completion still succeeds, IR-5); `entity_tags` consumer (SP1); `pages` seam (delegate); `project_habits` association (KEPT, C1); reminder schedule expose (Preferences port); HAB-25 rides the foundation sync substrate (no code — enqueue is co-transactional in the Repository); `registerHabitsJournal` + `registerHabitsEffects` |

**Ordering rationale.** S1 births the factory + repos + validators + type reconcile (everything downstream
composes it). S2 is the ledger + the flagship streak engine (edit/delete/backfill all recompute → the engine
must exist before backfill). S3 layers backfill's window policy on the S2 engine. S4 is pure read-derivations
over the ledger. S5 is the cross-module surface — built last because its ports are deny-safe and it composes the
completed CRUD/derivations (matches finance S5–S6 seams-last, gamification S4 wiring-last).

## Per-slice Verification-Gate ledger (blocking — §4)

Each slice, before the next begins: **Vitest (logic + ≥2 failure paths) → typed-error assertions → live smoke on
the REAL store (better-sqlite3 + `migrate()` 017, `initVault()` first per IR-4/NEEDS) → persistence probe →
independent code-review → commit.** No batching, no "owed" gate.

| Slice | Live-store probes (representative)                                                                                                                                                       | Typed errors asserted                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| S1    | create→read-back a habit (persist + faithful echo); soft-delete hides from listHabits; enum reject                                                                                       | ZodError on bad enum; (validation)                                  |
| S2    | log→re-log same date = 1 row (upsert); done-state at target; streak resets on a missed scheduled day; edit/delete recompute                                                              | rating-out-of-range validation                                      |
| S3    | backfill inside window persists + recomputes; backfill beyond window rejected, no row written                                                                                            | `BackfillWindowError`                                               |
| S4    | getTodayHabits returns only due-today; getCompletionRate/getCalendar over a real ledger; empty→`empty` state                                                                             | (read errors surface partial)                                       |
| S5    | guarded emit is a no-op with no port; with a stub registry the effect fires once (idempotent on replay); tag/pages/project_habits round-trip; journal contribution returns `SectionData` | `MetricContributionError` (contribution fails, completion persists) |

## Homed-OUT ledger (not ① scope — where each lives)

- **All UI faces of the SPLIT legs** (Dashboard/All-Habits render + check-any · today-list Calendar/List/Checkbox
  · per-habit analytics/charts/calendar render · optimistic completion apply/revert · detailed-log affordance ·
  streak badges · flag/revert surface) → **② `fe-habits` (LIF-182)**. `[FACT: parts/habits.md:14,15,17,19,24]`
- **`rate` measurement derivation formula + `measurement_kind`/`binding_mode` CHECK defaults + goal-vs-habit
  target model** → **design-pass** at build (S4 exposes the axes + streak/rate read; the formula is flagged).
  `[FACT: parts/habits.md:52,97 (UNKNOWN)]`
- **`habit_backfill_window_days` setting shape** → **Preferences build phase** (S3 consumes it via a deny-safe
  port; the setting itself is Preferences-owned). `[FACT: parts/habits.md:101 (UNKNOWN)]`
- **The completion→purpose-metric write-contract** (which `contributions` link + metric value one completion
  writes; `contribution_percentage` resolution) → **Purpose build phase** (S5 EMITS the effect; Purpose owns the
  write — cite-not-re-spec). `[FACT: parts/habits.md:99 (UNKNOWN); business-rules.md:31-36]`
- **`consequence_ledger` / `grant_currency` economy write** → **Gamification-owned** (S5 emits `award_xp`; never
  writes the ledger, R2). `[FACT: parts/habits.md:28,83]`
- **`[E]` field-level encryption wiring** → **M3/DB-5** (S1 keeps the encrypt-seam; M1.0 `encryptedFields:[]`
  pass-through, IR-4). `[FACT: parts/habits.md:36,54]`
- **Reminder DISPATCH** (notifications delivery) → **Preferences/Notifications** (S5 exposes the schedule; dispatch
  rides `push_habits`). `[FACT: parts/habits.md:16,55]`

## Guards carried (rerun C1–C4)

- **C1** `project_habits` KEPT (only the `purpose_*` trio retires) — S5 reads/writes it, never retires it. `[FACT: parts/habits.md:56]`
- **C2** inline `habits.tags` = As-is floor, not pretend-migrated — S1's `@vida/types` reconcile REMOVES the interface field; the column stays until the M3 migration. `[FACT: parts/habits.md:57]`
- **C3** streak cache already M3-aligned — no forced nullable-override, no stored `progress` col (derive on read). `[FACT: parts/habits.md:58]`
- **C4** no X*/AI* — habits neither ingests external data nor touches a model (no item authored — correct). `[FACT: parts/habits.md:59]`

## Change Log

| Date       | Session               | Change                                                                                                                                                                                          |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 2026-09-23-mod-habits | initial slice-map — 5 backend slices (Ratify+detail) from HAB-01…28 + per-slice Verification-Gate ledger + homed-out ledger; spec-set collapsed to delivery/ + parts/ per the finance precedent |
