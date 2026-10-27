<!-- Interpretation Layer — features/habits · Entity Delivery Flow §3 · MOD-habits ① (LIF-125, #49)
     Reads the aspect corpus + schema ADVERSARIALLY and writes down what they leave implicit, so the
     Decomposition Gate rests on stated facts. No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. -->

# Interpretation — Habits (① backend service tier)

**Scope of this interpretation.** The ① backend entity: `createHabitsService` over the DB-4 habits schema.
② `fe-habits` (LIF-182, #72) owns all UI surfaces `[FACT: docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md:152]`
— out of scope here. Decomposition mode = **Ratify + detail** (the ①/② split + the HAB-01…28 legs are
doc-fixed) `[FACT: docs/specs/foundation/backend-intent/parts/habits.md:11-38]`.

**Envision Gate (§3.75) = N/A.** The one-question test ("a user affordance whose UI answer isn't obvious?")
is a ② concern; ① renders no surface. Stated, not silently skipped.

---

## 1. DEPENDENCIES — every upstream

### Owned schema (DB-4, migration 017 — authored, live)

- `habits` — definition + recurrence + build/break + domain + **denormalized streak cache** + measurability axes
  - restored v1 fields. `[FACT: packages/core/src/db/schema/habits.ts:52-114; packages/core/src/db/migrations/017_habits.ts:41-85]`
- `habit_completions` — per-date completion ledger (quantity + mood + restored `location`/`completion_time`),
  `UNIQUE(habit_id, completed_date)`, **no `deleted_at`**. `[FACT: db/schema/habits.ts:93-114; migrations/017_habits.ts:91-113]`
- `project_habits` — navigational junction, **KEPT** (only the `purpose_*` trio retires, C1 guard); synthetic-id
  PK shape. `[FACT: migrations/017_habits.ts:118-133; docs/specs/foundation/realignment-master-plan/part-1.2-reruns/habits.md:64]`

### Foundation services & primitives (compose, do not re-implement)

- **Repository / Drizzle** — `createRepository(db, table, {deviceId, encryptedFields:[], softDelete})`.
  `[FACT: packages/core/src/db/repository.ts:236-240,176-183]`
- **EffectRegistry + effect rail** — `effects.rail.applyEffect(event)`, guarded by `registry.resolve(type)`;
  rail owns idempotency (R1 `effect_event_id`). `[FACT: packages/core/src/services/checkins/service.ts:229-242; docs/features/habits/business-rules.md:35-40]`
- **Measurement engine** — habit is a pursuable; `measurement_kind='rate'` + `binding_mode='event-trigger'`;
  `streak(habit)`/completion-rate advertised as an **M5 measure read seam (R7)**.
  `[FACT: docs/features/habits/business-rules.md:50-54; db/schema/habits.ts:79-80]`
- **`contributions` primitive** — polymorphic weighted edge (`goal_type/goal_id/contributor_type/contributor_id/
contribution_percentage`). `[FACT: packages/core/src/db/schema/foundation/purpose.ts:33-50]`
- **SyncMetadata / SyncableEntity** — `_sync_*` on every syncable row. `[FACT: packages/types/src/sync.ts:18-36]`

### Consumed modules (seams — deny-safe when the port is absent)

- **Notes & Pages** — a habit's notes are a `pages` row (`entity_type='habit'`); never inline.
  `[FACT: docs/features/habits/contract.md:30-31; conventions.md:23]`
- **Preferences** — `push_habits` reminder toggle (HB-6); `habit_backfill_window_days` backfill limit
  (HB-10, ⚠ INTENDED, Preferences-owned). `[FACT: docs/features/habits/contract.md:32-33; docs/intake/habits.md:85-86]`
- **Spaces / `entity_tags`** — tags via `entity_tags` with `entity_type='habit'` (SP1); inline `habits.tags`[E]
  retired. `[FACT: docs/features/habits/contract.md:34-35; part-1.2-reruns/habits.md:26]`
- **Gamification** — economy consumer (see DELEGATES).
- **Purpose & Goals** — metric owner (see DELEGATES).

### `@vida/types` + validators (extend, per HAB-28)

- Enums live: `HABIT_TYPE`, `HABIT_FREQUENCY`, `HABIT_TIME_OF_DAY`, `HABIT_DIFFICULTY` `[FACT: packages/types/src/habit.ts:13-25]`;
  `LIFE_DOMAIN` `[FACT: packages/types/src/common.ts:54-63]`; `MEASUREMENT_KIND`/`BINDING_MODE` `[FACT: packages/types/src/measurement.ts:5-10]`.
- Validators live: `HabitTypeSchema`/`HabitFrequencySchema`/`HabitTimeOfDaySchema` `[FACT: packages/core/src/validators/habit.ts:4-6]`;
  `MeasurementKindSchema`/`BindingModeSchema` `[FACT: packages/core/src/validators/measurement.ts:4-5]`.

---

## 2. NEEDS — preconditions to function

- **Runtime store + migrations.** The live-store Verification Gate needs `migrate()` to apply `017_habits`
  on a real (better-sqlite3) DB — not fixtures. `[FACT: packages/core/src/services/finance/__tests__/finance-service.test.ts:1-103]`
- **deviceId from app_state.** Repository config requires `deviceId`; sourced from `app_state`.
  `[FACT: packages/core/src/db/repository.ts:176-183]`
- **libsodium/vault loaded for any write** — even in M1.0. `[INTERP]` M1.0 registers an EMPTY `[E]` set
  (pass-through) `[FACT: db/schema/habits.ts:36-37]`, BUT every repository write computes a keyless `_sync_hash`
  content-hash that runs even with the empty `[E]` set — so libsodium must be initialized before the first write.
  `[FACT: packages/core/src/db/repository.ts:340 (hashContent on createInTx); packages/core/src/services/finance/__tests__/finance-service.test.ts:4-5 ("the sync-hash path runs even with empty [E]"),96 (initVault() before migrate())]`
  This is the MOD-notes bug class [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]; the live-store smoke
  must `initVault()` before writing. Written down here so it is caught before build, not at runtime.
- **Effect ports are OPTIONAL + dormant.** Without an injected `effects`/registry that resolves the effect type,
  emission is a no-op — the service must still complete the completion. `[FACT: checkins/service.ts:233]`
- **UPSERT primitive for the completion ledger.** `Repository.create` INSERTs; it does not upsert. HB-3's
  "one completion per (habit_id, completed_date), re-log = update" needs an explicit read-or-update-else-create
  (or a raw upsert) — a persistence need no aspect doc spells out as a mechanism.
  `[FACT: docs/features/habits/business-rules.md:17-18; db/repository.ts:349-352]`
- **App-layer cascade.** No FK exists (`habit_id`/`project_id` are plain TEXT, no CASCADE); HB-11 "delete a
  habit → delete its completions" must be enforced in the service, hard-deleting the ledger rows explicitly.
  `[FACT: migrations/017_habits.ts:92,119-120; docs/features/habits/business-rules.md:46-47]`

---

## 3. ORGANIZATION — owns vs consumes vs delegates

| Boundary      | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OWNS**      | the `habits` + `habit_completions` tables; definition CRUD; completion-ledger CRUD (upsert per date); streak/completion-rate/mood/calendar **derivations** (live-computed from the ledger, HB-2); today-list eligibility computation (HB-6); done-state derivation (`count>=target_count`, HB-5); **emitting** the S4 completion fan-out — `complete_habit_occurrence` (the habit's own occurrence effect), `contribute_purpose_metric`, `award_xp` — on the rail (the WRITES the latter two trigger are DELEGATED, below). `[FACT: docs/features/habits/contract.md:10-24; docs/specs/foundation/backend-intent/parts/habits.md:26]` |
| **CONSUMES**  | Repository/Drizzle · EffectRegistry+rail · measurement engine (M5 read seam) · `pages` (`entity_type='habit'`) · `entity_tags` (SP1) · Preferences (`push_habits`, `habit_backfill_window_days`). Each cross-module port is deny-safe when absent (`if (!port) return`/`[]`). `[FACT: finance/service.ts:698-702; checkins/service.ts:219-227]`                                                                                                                                                                                                                                                                                       |
| **DELEGATES** | Purpose metric write → `contributions` primitive via the S4 `contribute_purpose_metric` effect (R2 documented handler; Purpose owns the write, never a direct `purpose_metric_value` write) `[FACT: docs/features/habits/business-rules.md:31-36]` · Economy/XP → `award_xp`→`grant_currency(XP)` effect; balances derive from `consequence_ledger` (Gamification-owned; **Habits never writes the ledger**, R2) `[FACT: docs/features/habits/business-rules.md:37-41]` · encryption → M3/DB-5 (M1.0 pass-through) `[FACT: parts/habits.md:36]` · reminders → Preferences/notifications-delivery.                                     |

---

## 4. IMPLICIT RULES — surfaced hidden invariants

- **IR-1 · Streak cache is a projection, never a source of truth.** `current_streak`/`longest_streak`/
  `total_completions` are denormalized columns recomputed deterministically from the ledger on EVERY mutation
  (log/edit/delete/backfill). Never hand-increment; a corrupt cache is fixed by re-derivation, not trusted.
  `[FACT: docs/features/habits/business-rules.md:14-16,64-65,83-84]`
- **IR-2 · `create()` echoes the input row → serialize must be faithful.** The Repository returns the input,
  not a DB re-read, so every notNull-default column (`habit_type='build'`, `frequency='daily'`, `target_count=1`,
  `current_streak/longest_streak/total_completions=0`, `is_active=1`, `sort_order=0`, `measurement_kind='rate'`,
  `count=1`) must be backfilled and every nullable coalesced to `null` in the serialize functions.
  `[FACT: packages/core/src/services/finance/service.ts:11-15,187-202; migrations/017_habits.ts:44-65,94]`
  [[repository-create-returns-input-row-not-db-defaults]]
- **IR-3 · `findWhere` skips the soft-delete filter — `habits` has `deleted_at`, `habit_completions` does NOT.**
  Any `findWhere` over `habits` must add `isNull(deleted_at)` explicitly; the completion ledger repo uses
  `softDelete:false` (hard-delete, HB-11). `[FACT: db/repository.ts:379-382; migrations/017_habits.ts:74,110]`
  [[repository-findwhere-skips-softdelete-filter]]
- **IR-4 · M1.0 `encryptedFields:[]` even for the 6+1 `[E]` fields.** `name/description/unit/cue/reward/
success_criteria/tags` (habits) + `location` (completions) are `[E]` boundaries for M3; the M1.0 repo set stays
  `[]` (pass-through), `getVaultKey` only fetches when the set is non-empty. `[FACT: db/schema/habits.ts:36-37]`
  [[m10-repos-use-empty-encryptedfields-seam]]
- **IR-5 · Effect emission is POST-COMMIT, guarded, and dormant-safe.** A completion persists first; the effect
  fan-out (`complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp`) fires only if the registry
  resolves the type; a failed purpose contribution leaves the completion succeeded and flags a typed
  `MetricContributionError` — never a silent drop, never a rollback. `[FACT: docs/features/habits/business-rules.md:81-82; checkins/service.ts:229-269]`
- **IR-6 · Partial ≠ streak advance.** `count < target_count` is logged (for analytics/`value`) but does NOT
  advance the streak; over-achievement (`count > target_count`) is still "done". `[FACT: docs/features/habits/business-rules.md:22-24]`
- **IR-7 · Break-habit completion inverts meaning.** For `habit_type='break'`, a logged completion = "stayed
  clean today"; a relapse is the ABSENCE of a completion → streak resets. Same ledger mechanics, opposite
  semantics. `[FACT: docs/features/habits/business-rules.md:19-21]`
- **IR-8 · `custom` frequency without `days_of_week` has no schedule.** Such a habit never enters the today-list
  (HB-6) — a validation/edge the schedule derivation must handle, not crash on. `[FACT: docs/features/habits/business-rules.md:59-60]`
- **IR-9 · Drizzle row ≠ `@vida/types` interface (DB-11 cast) + a LIVE type divergence.** `_sync_status` is plain
  TEXT on the row vs the `SyncStatus` union on the interface (cast at the `to<Entity>` boundary). Additionally the
  `Habit` interface must be reconciled **+4 −1**: ADD `measurement_kind/binding_mode/success_criteria/difficulty`,
  REMOVE the retired inline `tags` field (schema retired it → `entity_tags`); and `HabitCompletion` must ADD
  `updated_at/location/completion_time` — the schema has all of these. Because the service RETURNS these fields, the
  `@vida/types` reconcile is **in-scope now (HAB-28/HAB-23, the FIN-27 precedent)**, not a deferred DB-11 job — the
  schema header's DB-4-era "→ DB-11 (mirror-only)" comment is SUPERSEDED by the HAB-28 homing (`parts/habits.md:38`
  home = "habits service / @vida/types"), mirroring finance `slice-map.md:79` ("in S1 scope, not deferred DB-11").
  `[FACT: compare packages/types/src/habit.ts:31-78 (has tags:52, lacks the +4/+3) vs db/schema/habits.ts:52-114,85 (tags RETIRED),32-33 (the superseded DB-11 comment); docs/specs/foundation/backend-intent/parts/habits.md:33,38; packages/core/src/services/finance/delivery/slice-map.md:79; packages/types/src/sync.ts]`
  [[drizzle-row-not-assignable-to-vida-types-interface]]

---

## 5. Open UNKNOWNs (flagged, not guessed past)

- **[UNKNOWN → resolved at the Decomposition Gate]** the ordered backend slice roster grouping HAB-01…28 (CRUD /
  completion-ledger+streak / analytics-derivations / effect-fan-out+contributions / seams) + the per-slice
  Verification-Gate ledger. Sources: `parts/habits.md` + `decomposition.md` + the aspect corpus above.
- **[UNKNOWN → design-pass at build, HAB-20]** the `rate` measurement derivation formula (occurrence frequency
  over window) — CHECK defaults are live; the read-model math is a design-pass. `[FACT: parts/habits.md:30; part-1.2-reruns/habits.md:146]`

## 6. Change Log

| Date       | Session               | Change                                                                                                                                                                                                                                                                                                                       |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 2026-09-23-mod-habits | initial interpretation (dependencies · needs · organization · implicit rules), from the gated aspect corpus + schema + service precedents                                                                                                                                                                                    |
| 2026-09-23 | 2026-09-23-mod-habits | Interpretation Gate SHIP — folded B1 (phantom `entity-delivery-flow.md` cite → real `repository.ts:340`/`finance-service.test.ts` source), N1 (`Habit` reconcile is +4 −`tags`), N2 (schema's stale "→ DB-11" comment superseded by HAB-28 homing), N3 (`complete_habit_occurrence` homed as OWNS-emit), N4 (IR-2 line-cite) |
