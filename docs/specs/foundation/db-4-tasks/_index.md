# DB-4 · Domain Group #4 — Tasks · Unit Spec

> **Unit:** the DB-4 per-domain schema build for the **Tasks** domain group (the OS-wide task primitive + its
> aggregation surface — a **foundation** many modules feed and read) — Stream (ii) of the M1.0 schema foundation.
> **Issue:** LIF-66 · M1/M1.0 `#10` · profile **add-backend-component** · ← DB-1 ✅ · ← DB-3 ✅ (substrate spine).
> **Flow:** the 5-phase lifecycle in `docs/roadmap/schema-foundation-build-flow.md §2`. **This file = Phase 1 (Intent
> intake).** Phase 2 (current-state read) + Phase 3 (plan double-gate) append their sections below.
> **No-Guessing:** every claim `[FACT: src]` / `[INTERP]` / `[INTENT]` / `[UNKNOWN]`. Ship-scope trimming is **forbidden
> in Phase 1** — a foundation intakes the WHOLE documented intent so nothing is silently omitted
> (`[[intake-captures-intent-not-ship-scope]]`).
> **Build-phase intent is IN scope, not deferred.** The ⚠ INTENDED additions in the feature docs are forward-pointers
> TO this build phase; DB-4 IS that phase → they are authored NOW, grounded in their owning ADRs, unless a
> **domain-ownership boundary** (a table another group/substrate owns) keeps them out
> (`[[build-phase-flags-mean-resolve-now-not-defer]]`). What stays out here is a *boundary*, never a time-defer.

## §0. Source model
Backend schema unit — the frontend source-of-truth guard (`docs/specs/foundation/frontend-source-of-truth.md`) is
**N/A** (no DS/UI/UX token surface). The intent sources:
- The **`docs/features/tasks/` 5-aspect spec** (`identity · structure-data · business-rules · contract · conventions`)
  — the FULL intent, incl. the ⚠ INTENDED additions (G1,G5,G6,G7,G8) and invariants TK-1…TK-11. `[FACT]`
- **ADR-002 §5.3** — the As-is floor DDL for `tasks` + `task_time_logs` (2 tables, column-informative; **stale on
  structure** where it shows hard FKs — superseded by the live no-FK convention, see §P-note). `[FACT: ADR-002 L1488-1554]`
- **ADR-011** (M1/M2/M3/M4 measurability — the task is a *pursuable*), **ADR-006** (SP1/SP2 shared tags),
  **ADR-007** (V1/V2/V4 views), **ADR-009** (T4 presets), **ADR-004** (S1/S4 sessions + effect rails), **ADR-012**
  (E2 economy feeder) — the "foundation subject-set (R6)" the Tasks doc is subject to. `[FACT: structure-data.md:45-48]`
- **ADR-001** (RQ + Zustand state) · **ADR-003** (structured cols sync LWW, no CRDT). `[FACT]`
- The canonical enum tuples + interface already shipped in **`@vida/types`** (`task.ts`, `common.ts` Status/Priority,
  `measurement.ts` MEASUREMENT_KIND/BINDING_MODE).

## §1. Identity — what this unit is
DB-4 / Tasks authors the **2 Tasks-realm-owned tables** — `tasks` (the task) + `task_time_logs` (the time ledger) —
that complete the Task domain on top of the finished substrate. Tasks is a **Wave-1 independent domain** but an
**aggregator**: it holds out-edges (parent references) to Projects / Learning / Relationships and to Notes, and is read
by Journal `/summary` + Gamification. This unit authors **tables only**; the aggregation read seam (R7), the effect
rails (S4), sub-task rollup (M3/M4), obligation regeneration, and the view/12-layout UI are **logic, not schema**.
`[FACT: structure-data.md:5-11,35-37; ADR-002 §5.3]`

### Scope boundary — doc-FIXED (substrate already owns the shared primitives, not a decision)
Two "additions" named in the Tasks intent are **already-authored substrate** this unit only *references* — exactly the
Notes-group-#1 pattern (`entity_links` was AR-6, not N&P):
- **`views` (ADR-007 V1)** is authored at **`schema/foundation/spaces.ts:113`** (AR-6). The schema-0 `task_views`
  build target is **retired → the shared `views` primitive** (a saved task view = a `views` row: filter × layout ×
  grouping; `views.space_id` NULL = the global All-Tasks view). The full V1 filter-grammar / per-layout anatomy is the
  **deferred dedicated ADR-007 pass**, NOT DB-4 Tasks. → Tasks authors **no `task_views` table**. `[FACT: spaces.ts:113; structure-data.md:21; ADR-007 V1/V2]`
- **`entity_tags` / `tags` / `entity_links` (ADR-006 SP1)** are AR-6 substrate (`spaces.ts`, per `notes.ts` header).
  Inline `tasks.tags` JSON is the As-is floor → **retired in favor of `entity_tags`** (`tag_id, entity_type,
  entity_id`); Tasks registers **`entity_type='task'`** in the open registry (SP2). → Tasks authors **no tag table**
  and (per §3, P3-resolved) **no inline `tags` column**. `[FACT: notes.ts header; structure-data.md:22; ADR-006 SP1/SP2]`

### Boundary — what this unit is NOT
- **NOT the owner of `views` / `entity_tags` / `entity_links`** — AR-6 substrate (above). Tasks references them.
- **NOT the author of a task's notes table** — a task's notes are a **`pages`** row (`entity_type='task'`), Notes-owned
  (group #1). `[FACT: contract.md:23; Notes group #1]`
- **NOT the author of any `sessions`/timer/pomodoro table** — the start/stop timer + bound pomodoro is a **`sessions`
  sub-type** (`focus_sessions`, group #3 / AR-5); the ledger write is the **`log_time` S4 effect** (R2/R1), never a
  direct client write. `task_time_logs` (the ledger Tasks owns) IS in scope; the effect engine + session extension are
  NOT. The `task_time_logs`↔session-extension reconciliation is `[DEFERRED — build; owned by the effect layer]`.
  `[FACT: business-rules TK-5; ADR-004 S1/S4/R1/R2]`
- **NOT the author of `consequence_ledger`/`currencies`** — completion's `award_xp`→`grant_currency(XP)` (E2) writes the
  Gamification-owned economy ledger (group #21 / AR-7); Tasks never writes XP. `[FACT: contract.md:33; ADR-012 E2/E3]`
- **NOT the owner of `contributions`** — the ADR-011 M4 up-the-ladder goal edge is DB-3 substrate; a task *contributes
  UP* to a purpose via it, never owning Purpose rollup tables. `[FACT: business-rules TK-11; DB-3]`
- **NOT any engine or view** — the R7 aggregation read seam, the S4 effect-firing rail, sub-task rollup (M3/M4
  derive-on-read — **no stored progress column**), obligation regeneration, the view-builder + 12 layouts are **logic /
  UI, not schema**. This unit authors tables only. `[FACT: structure-data.md:24-33; business-rules TK-3/TK-9]`
- **NOT a `@vida/types` interface reconcile beyond what the new columns require** — where a shipped interface field
  diverges from the authored table (see §3d), mirror the table shape and defer the consolidation to **DB-11** (the
  group #1 `entity_links`/`EntityLink` + group #3 `StudyPlanBatch` precedent). `[FACT: DB-4 group #1/#3 finding]`
- Authoring model: **hand-written SQL migration** (`015_tasks.ts`, ADR-016 §3.5 — no drizzle-kit) + Drizzle query-mirror
  module in the v2 top-level surface (`schema/tasks.ts`, the `notes.ts`/`preferences.ts` sibling pattern) + the
  `@vida/types` `TASK_KIND` tuple + the `ENTITY_TYPES` append. Physical home in §4.

## §2. Business Rules (inherited invariants — the intake honors these)
Both tables are **syncable** tables upholding `database-layer/current-business-rules.md` (UUIDv7 PK · Unix-ms
timestamps · INTEGER bool · TEXT enums with SQL `CHECK` + Zod for FIXED enums · OPEN vocab = plain TEXT no CHECK
[`[[open-vocab-columns-take-no-sql-check]]`] · the 6 `_sync_*` cols via `...baseColumns` · soft delete where applicable
· three-layer encryption; M1.0 registers an EMPTY `[E]` set — pass-through). The schema-relevant feature invariants:
- **TK-1 — Encrypted content.** `tasks.title` (NOT NULL), `tasks.description`, and tag associations are `[E]`;
  status/priority/difficulty/dates/estimates are plaintext config. (Tag associations now live in `entity_tags`, not an
  inline column — §3d.) `[FACT: ADR-002 L1498-1499; task.ts @encrypted]`
- **TK-2 — At-most-one parent module.** `≤1` of `project_id`/`milestone_id`/`course_id`/`contact_id` set (mutually
  exclusive; a `milestone_id` implies its project). None set = a first-class **standalone** task. Enforced at the
  app/contract layer (`MultipleParentError`), not a DB constraint. `[INTENT G2; FACT nullable refs]`
- **TK-3 — Sub-tasks are one level; parent rolls up (M4), never force-completes.** A task may have children
  (`parent_task_id`), children may not (single level). Parent `{done,total}` = the ADR-011 **M4** weighted rollup
  `Σ(child.progress × weight)/Σ weight` — **derives on read (M3): NO stored progress column**; per-child nesting weight
  is a stored col (default NULL = equal-weight). Completing a parent does not auto-complete children, or vice-versa.
  `[INTENT G3; ADR-011 M3/M4]`
- **TK-4 — Cascade delete (app/sync-layer, not a DB FK).** Deleting a task deletes its sub-tasks + `task_time_logs`;
  parent-module deletion `SET NULL`s the link, never deletes the task. Under the **no-FK convention** (BR-DB3-1) these
  `CASCADE`/`SET NULL` semantics are enforced by the app/sync layer, not `ON DELETE` clauses. `[FACT: ADR-002 L1497,
  L1538 (intent); no-FK convention]`
- **TK-5 — Time is one ledger, written by a Session effect.** `tasks.actual_minutes` is the **auto-sum** of the task's
  `task_time_logs.duration_minutes`. The timer is a `sessions` sub-type (S1); it writes the ledger via the `log_time`
  S4 effect (R2, idempotent R1) — never a direct client write. A task may opt out (no logs, no rollup). Nothing else
  mutates `actual_minutes`. `[INTENT G4; FACT ADR-002 task_time_logs; ADR-004 S1/S4/R1/R2]`
- **TK-6 — Completion is a status + a timestamp + an effect producer.** Complete iff `status='completed'`; on that
  transition `completed_at` (⚠ INTENDED) is set (re-opening clears it). Completion is the `binding_mode='event-trigger'`
  (M2) and fires the ADR-004 §3.2.2 S4 effects (`award_xp`→`grant_currency(XP)` E2, `contribute_purpose_metric`,
  `surface_journal`, `surface_calendar`, `emit_measurement_signal`) via R2/R1. `[INTENT G5; ADR-004 S4; ADR-011 M2; ADR-012 E2]`
- **TK-7 — Obligations regenerate.** `kind='obligation'` (⚠ INTENDED) carries a recurrence rule; completing it spawns
  the next occurrence with the next `due_date`. Only obligations recur; standard tasks never do. `[INTENT G8]`
- **TK-8 — Shared tags, single vocabulary.** Tasks tag through the shared **`entity_tags`** primitive (SP1),
  registering `entity_type='task'` (SP2) — not a private list. Inline `tasks.tags` (As-is floor) retired. `[INTENT G7; ADR-006 SP1/SP2]`
- **TK-9 — Aggregation reads via the R7 seam, never owns.** The aggregated view reads parent-module data through the R7
  read seam (provider fan-out — the seam the cross-module `views` ride via V4); Tasks never reads another module's
  tables directly (§6 coupling budget). **No schema surface** — a logic seam. `[INTENT G2/R7; FACT core §6; ADR-007 V4]`
- **TK-10 — Local-first.** Every create/edit/complete/timer action succeeds locally first; multi-device reconciles LWW
  on structured columns (no CRDT — tasks aren't editor documents). `[FACT: LF-2; ADR-003]`
- **TK-11 — The task is a pursuable (measurable).** `tasks` carries `measurement_kind` CHECK ∈ MEASUREMENT_KIND
  (natural = **`milestone`**) + `binding_mode` CHECK ∈ BINDING_MODE (M1/M2). **No** bespoke `target_type` (pure add),
  **no** stored progress column (derives — M3/TK-3), **not** an M5 queryable-measure source (tasks aren't in the M5
  applies-to set). `[INTENT; ADR-011 M1/M2/M3/M4]`

### Enum CHECK sets (schema-relevant)
- `status` ∈ {not_started,in_progress,completed,on_hold,cancelled} (shared `Status`, `common.ts`). `[FACT: ADR-002 L1500-1501]`
- `priority` ∈ {critical,high,medium,low,none} (shared `Priority`, `common.ts`). `[FACT: L1502-1503]`
- `difficulty` ∈ {trivial,easy,medium,hard,expert} (`TASK_DIFFICULTY`, `task.ts:13`). `[FACT: L1504-1505]`
- `measurement_kind` ∈ {quantitative,milestone,rate,qualitative} (`MEASUREMENT_KIND`, `measurement.ts:5` — **exists**). `[FACT]`
- `binding_mode` ∈ {manual,derived-pull,event-trigger} (`BINDING_MODE`, `measurement.ts:9` — **exists**). `[FACT]`
- `kind` ∈ {standard,obligation} (**`TASK_KIND` — NET-NEW tuple, absent from `@vida/types`; author in P4**). Also the T4
  preset discriminator (ADR-009). `[INTENT G8; ADR-009 T4; grep 2026-08-19: absent]`

## §3. Intended shape — the 2 tables (FACT floor + INTENDED build-phase additions, cited)
> Legend: **[floor]** = ADR-002 §5.3 As-is column; **[INTENT]** = build-phase addition (authored now, grounded in its
> ADR); **[INTERP]** = a column *shape* I realized from a cited intent where no DDL is quoted (flagged for the P3 gate).
> Every FK/self-ref in the §5.3 DDL is reconciled to **plain TEXT, no `REFERENCES`** (no-FK convention BR-DB3-1 — the
> §5.3 `ON DELETE` clauses are stale-on-structure; cascade/set-null → app/sync layer, TK-4). `[FACT: [[stale-source-plus-live-convention-is-fact-not-a-decision]]]`

### §3a. `tasks` — the task
`...baseColumns` (own `id` UUIDv7 PK + created_at/updated_at + 6 `_sync_*`) · `deleted_at` (soft delete) · then:
- **Parent references (all plain TEXT, no FK — TK-2/TK-4):** `project_id?` · `milestone_id?` · `course_id?` ·
  `contact_id?` · `parent_task_id?` (self-ref). `[floor; L1493-1497 reconciled to no-FK]`
- **Content `[E]`:** `title` (NOT NULL) `[E]` · `description?` `[E]`. `[floor; L1498-1499]`
- **Config (plaintext):** `status` (CHECK←Status, NOT NULL DEFAULT 'not_started') · `priority` (CHECK←Priority, NOT NULL
  DEFAULT 'medium') · `difficulty?` (CHECK←TASK_DIFFICULTY, DEFAULT 'medium') · `due_date?` (YYYY-MM-DD) ·
  `estimated_minutes?` · `actual_minutes?` (derived auto-sum, TK-5) · `sort_order` (NOT NULL DEFAULT 0). `[floor; L1500-1510]`
- **⚠ INTENDED additions (authored now):**
  - `completed_at?` (timestampMs) — set on status→completed (G5/TK-6). `[INTENT G5]`
  - `scheduled_date?` (YYYY-MM-DD) — planned date, distinct from `due_date` (G6). `[INTENT G6]`
  - `kind` (CHECK←**TASK_KIND** {standard,obligation}, NOT NULL DEFAULT 'standard') — obligation discriminator + T4
    preset type (G8). `[INTENT G8; ADR-009 T4]`
  - **`recurrence_rule?` TEXT (plaintext, RRULE standard format)** — obligation deadline recurrence (TK-7).
    **Doc-determined, not a shape choice:** the platform has ONE canonical "recurrence rule" representation —
    `recurrence_rule` TEXT/RRULE (`ics_synced_events`, ADR-002 L1160; `learning.ts:456`; ADR-002 L3665) — and
    conventions.md:13,20,25 **explicitly exclude** the Habit/Routine `frequency`+`days` behavior-recurrence model for
    tasks ("Behavior recurrence is a Habit/Routine, **not a task**"). The loose feature-doc phrase "recurrence rule
    *fields*" is closed by the live convention to this single column (`[[stale-source-plus-live-convention-is-fact-not-a-decision]]`).
    Plaintext (matches `ics_synced_events.recurrence_rule` P). `[FACT: conventions.md:13,25; ADR-002 L1160,L3665; learning.ts:456]`
  - `measurement_kind` (CHECK←MEASUREMENT_KIND, DEFAULT 'milestone') · `binding_mode` (CHECK←BINDING_MODE) — the
    pursuable axes; the **§5.20 owed-ledger names Tasks in the pursuable set** ("the contract, not per-table DDL, is
    locked" → the CHECK sources from the tuple, placement is per-module). `[FACT: ADR-002 §5.20 L3816; ADR-011 §3.1/§3.5; conventions.md:10]`
  - **`nesting_weight?` (nullable, NULL ⇒ equal-weight)** — the per-child sub-task rollup weight. **Doc-determined:**
    ADR-011 §3.3 L54 names it — "Nesting (child → parent inside one module, e.g. sub-task → task): an **owed per-child
    weight column** on the child (default `NULL` ⇒ equal-weight), added per module → §5.20 stream ii"; the **§5.20
    owed-ledger L3819** repeats it ("optional per-child nesting-weight column"). **No stored progress column** (M3
    derives). `[FACT: ADR-011 §3.3 L54; ADR-002 §5.20 L3819; TK-3]`
- **Retired (NOT authored):** inline `tasks.tags` TEXT `[E]` JSON (As-is floor) → migrated to `entity_tags` (§3d,
  TK-8). *(Interface `Task.tags: string[]` becomes a divergence — §3d / DB-11.)* `[INTENT G7]`
- **Indexes:** per-parent-ref query indexes (`project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id`) in
  the Drizzle mirror; the **partial** `(status) WHERE deleted_at IS NULL` + `(due_date) WHERE deleted_at IS NULL` are
  **SQL-migration-only** (the `notes.ts` precedent — Drizzle mirror declares plain query indexes only). `[FACT: L1524-1530]`

### §3b. `task_time_logs` — the time ledger
`...baseColumns` (own `id` PK + created_at + 6 `_sync_*`) · `task_id` (plain TEXT no FK, was CASCADE — TK-4 app-layer) ·
`start_time` (timestampMs, NOT NULL) · `end_time?` (timestampMs — NULL = running) · `duration_minutes?`. Zero `[E]`.
Index `(task_id)`. ⚠ **Base-columns delta:** §5.3 shows `task_time_logs` with only `id`+`created_at`+`_sync_*` (no
`updated_at`); the v2 `...baseColumns` includes `updated_at` — same benign divergence Notes #1 accepted (locked
`baseColumns` pattern, ADR-016 §3.4). `[FACT: ADR-002 L1536-1551; ADR-016 §3.4]`

### §3c. `ENTITY_TYPES` registry — reconcile append
`task` is **absent** from `_registry.ts ENTITY_TYPES` (verified 2026-08-19). Append **`task`** — it becomes a valid
polymorphic target for `pages` (task notes), `entity_links`, and `entity_tags` (TK-8). *(A `task_time_log` type is not
needed — logs are addressed via `task_id`, not polymorphic refs.)* `[FACT: _registry.ts; ADR-006]`

### §3d. `@vida/types` interface — reconcile is DB-11 (fixed boundary, not a choice)
This unit authors the **TABLE** (migration + Drizzle mirror) + the **`TASK_KIND` tuple** (needed for the SQL CHECK + Zod
validator + enum-parity — the DB-9 enum layer, not the row interface). The **`Task` INTERFACE reconcile** — adding the
new columns (`completed_at`/`scheduled_date`/`kind`/`recurrence_rule`/`measurement_kind`/`binding_mode`/`nesting_weight`)
and dropping `tags: string[]` (`task.ts:38`, superseded by `entity_tags`) — is the **DB-11** boundary, **mirror-only
now**, exactly as group #1 (`PageLink`/`NoteAttachment` still `SyncMetadata`-only) and group #3 (`StudyPlanBatch`
`course_id`, `StudySession` spine fields) deferred theirs. The P5 DDL-introspection parity **cites** these table↔interface
divergences as DB-11 deferrals (exempt), never "fixes" them. `[FACT: task.ts:38; DB-4 group #1/#3 DB-11 precedent; flow doc §2 P5]`

## §4. Physical home & authoring model (P-R)
- **P-R1 — migration:** `packages/core/src/db/migrations/015_tasks.ts` (hand-written SQL, ADR-016 §3.5), registered in
  `runner.ts ALL_MIGRATIONS` (→ version 15; `LATEST_VERSION` derives from array length). `up()` must NOT open its own
  transaction (runner wraps each in BEGIN/COMMIT). `[FACT: runner.ts; migrations/ pattern]`
- **P-R2 — Drizzle mirror:** new **`db/schema/tasks.ts`** (top-level domain file, the `notes.ts`/`preferences.ts`
  sibling — NOT `foundation/`), holding `tasks` + `task_time_logs`. Export from `schema/index.ts`. `[FACT: schema/ layout]`
- **P-R3 — enums:** author **`TASK_KIND = ['standard','obligation'] as const`** + `TaskKind` in `@vida/types/task.ts`
  (barrel already re-exports `./task`) + its Zod validator in `@vida/core` (the DB-9 pattern). `MEASUREMENT_KIND`/
  `BINDING_MODE`/`TASK_DIFFICULTY` + shared `Status`/`Priority` **already ship** — CHECK sources from them, no new tuple.
  Add `enum-parity.test.ts` rows for every new FIXED TEXT-CHECK column (`status`, `priority`, `difficulty`,
  `measurement_kind`, `binding_mode`, `kind`, + any recurrence-frequency enum P3 realizes). `[FACT: measurement.ts; task.ts:13; validators/ pattern]`
- **P-R4 — registry:** append `ENTITY_TYPES += 'task'` (§3c).
- **P-R5 — tests (Phase 5 bookend):** DDL-introspection parity (`PRAGMA table_info`) diffs each real table vs the
  Drizzle mirror + the `@vida/types` interface on **column-set · nullability · PK · default · type** (the mandatory
  bookend — caught the group-#2 `time_format` type-lie); cited DB-11 divergences (§3d) are exempt. `[FACT: flow doc §2 P5]`

## §5. Phase-1 completion checklist
- [x] intent sources named (tasks 5-aspect · ADR-002 §5.3 · ADR-011/006/007/009/004/012 · @vida/types) ·
- [x] scope boundary doc-fixed (`views`/`entity_tags`/`entity_links` = AR-6 substrate; pages/sessions/economy/
  contributions owned elsewhere) ·
- [x] 2-table roster with per-column [FACT floor]/[INTENT]/[INTERP] shape ·
- [x] NOT-list (substrate primitives, notes table, session/timer tables, economy ledger, contributions, all
  engines/views) ·
- [x] the 5 build-phase INTENDED additions on `tasks` captured (completed_at · scheduled_date · kind+recurrence ·
  measurement_kind/binding_mode · rollup-weight) + inline-tags→entity_tags retire ·
- [x] enum inventory: `TASK_KIND` net-new; MEASUREMENT_KIND/BINDING_MODE/TASK_DIFFICULTY/Status/Priority already ship ·
- [x] `ENTITY_TYPES += 'task'` flagged · [x] interface divergence (`Task.tags`) flagged for P3/DB-11 ·
- [x] No-Guessing labels on every claim.

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)
Every point that first read as "open" is closed by the documentation or a locked convention — Phase 3 is a **straight
authoring plan** (the group #3 outcome), nothing to "decide at the gate":
1. **Recurrence** = single `recurrence_rule` TEXT (RRULE, plaintext) — the platform's locked recurrence-rule convention;
   the Habit/Routine `frequency`+`days` model is **explicitly excluded** for tasks. `[FACT: conventions.md:13,25; ADR-002 L1160]`
2. **Sub-task weight** = `nesting_weight` nullable (NULL ⇒ equal-weight) — named verbatim in ADR-011 §3.3 L54. `[FACT]`
3. **Inline `tasks.tags`** = **not authored** (→ `entity_tags`, register `entity_type='task'`) — §5.20 RETIRE +
   conventions.md:29. `[FACT]`
4. **`Task` interface reconcile** (new fields + `tags` drop) = **DB-11**, mirror-only, P5-cited — the fixed group #1/#3
   boundary; only the `TASK_KIND` tuple is authored now. `[FACT]`
No `[INTERP]`/lean survives — each is `[FACT]` cited to its ADR/convention/precedent.

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)

Verified on disk 2026-08-19 (`grep sqliteTable` across `schema/**`, `_registry.ts`, `@vida/types/*`, `runner.ts`).

### Already authored — DO NOT re-create (referenced substrate)
| Table / symbol | File | Migration | Role for Tasks |
|---|---|---|---|
| `views` | `schema/foundation/spaces.ts:113` | `003` | saved task views ride this (retires `task_views`) |
| `entity_tags` · `tags` · `entity_links` | `schema/foundation/spaces.ts` (AR-6) | `003` | tags/links substrate (retires inline `tasks.tags`) |
| `pages` | `schema/notes.ts` | `012` | a task's notes = a `pages` row (`entity_type='task'`) |
| `sessions` · `focus_sessions` | `foundation/sessions.ts` · `session-extensions.ts` | `002`/`014` | the timer sub-type + `log_time` effect target (not Tasks' table) |
| `MEASUREMENT_KIND` · `BINDING_MODE` | `@vida/types/measurement.ts:5,9` | — | pursuable CHECK sources (M1/M2) — **already ship** |
| `TASK_DIFFICULTY` · `Status` · `Priority` | `task.ts:13` · `common.ts` | — | difficulty/status/priority CHECK sources — **already ship** |

### To author — 2 confirmed ABSENT (net-new)
`tasks` · `task_time_logs` → **both ABSENT** in `schema/` and `migrations/` (`grep sqliteTable('tasks'` / `task_time_logs`
= empty, 2026-08-19). Pure net-new; zero re-creation risk. `[FACT: grep 2026-08-19]`

### Net-new `@vida/types` symbol
`TASK_KIND` (`standard`/`obligation`) is **absent** (`grep TASK_KIND|obligation` = empty) → author in P4 (§P-R3). The
`Task` interface (`task.ts:20-41`) lacks the INTENDED columns + still carries `tags: string[]` (the §3d divergence).
`[FACT: grep 2026-08-19; task.ts:20-41]`

### `ENTITY_TYPES` diff (`_registry.ts`)
Current roster = `page·note·journal·tag·space` + DB-3 substrate (`value…template`) + group-#3 `session`. **`task` is NOT
present.** Phase-4 append: **`task`**. `[FACT: _registry.ts:5-30]`

### Migration slot
`ALL_MIGRATIONS` last = `014_sessions_scheduling` (version 14). This unit adds **`015_tasks`** → version 15. `[FACT: runner.ts; ls migrations/]`

### Baseline verdict
Pure **extend** — 2 tables net-new, all referenced substrate present. **Zero shape decisions:** every point that first
read as "open" is closed by the documentation or a locked convention (§5 resolutions — recurrence = `recurrence_rule`
RRULE · weight = `nesting_weight` · inline-tags = not-authored · interface = DB-11). **Phase 3 is a straight authoring
plan** (the group #3 outcome), no fork to resolve at the gate.

## Phase 3 — Implementation Plan (gate-1 draft)

> The *what & how*, drawn from the Phase-1/2 baseline. **Zero shape decisions** — every point is `[FACT]`-cited to its
> ADR/convention/precedent (see §5 resolutions). This is a straight authoring plan (the group #3 outcome).

### §P3.0 — Grounding recap (the four doc-closures, for the gate to scrutinize)
1. **Recurrence = one `recurrence_rule` TEXT (plaintext, RRULE).** The platform's single canonical recurrence-rule
   representation (`ics_synced_events` ADR-002 L1160 · `learning.ts:456` · ADR-002 L3665); conventions.md:13,25
   **explicitly exclude** the Habit/Routine `frequency`+`days` behavior-recurrence model for tasks. `[FACT]`
2. **Nesting weight = `nesting_weight` INTEGER nullable (NULL ⇒ equal).** ADR-011 §3.3 L54 names the "owed per-child
   weight column … default NULL ⇒ equal-weight." **INTEGER** because the v2 surface has zero REAL columns / no `real()`
   helper in `_shared.ts`, and §3.3 normalizes by `Σweight` (relative integer weights suffice). `[FACT: ADR-011 §3.3 L54; _shared.ts]`
3. **Inline `tasks.tags` = NOT authored** (→ `entity_tags`; register `entity_type='task'`). §5.20 RETIRE
   (`page_tags→entity_tags`) + conventions.md:29 ("Never reintroduce an inline per-task tag list"). `[FACT]`
4. **`Task` interface reconcile → DB-11** (mirror-only, P5-cited); only the **`TASK_KIND` tuple** is authored now. Group
   #1/#3 fixed boundary. `[FACT]`
No FK: §5.3's 4 parent FKs + self-ref CASCADE + `task_time_logs.task_id` CASCADE → **plain TEXT no FK** (BR-DB3-1; the
`ON DELETE` semantics are app/sync-layer, TK-4). `[FACT: no-FK convention; group #1/#3]`

### §P3.1 — The 2 tables (exact DDL intent)
Both use full `...baseColumns` (own `id` UUIDv7 PK + `created_at`/`updated_at` + 6 `_sync_*`, ADR-016 §3.4). Column
nullability/defaults follow ADR-002 §5.3 verbatim for the floor columns; INTENDED columns are nullable unless a default
is documented.

**1. `tasks`** (`[E]`: `title`, `description` — 2 fields; M1.0 pass-through per BR-DB6-3):
- **Parents (plain TEXT, no FK):** `project_id?` · `milestone_id?` · `course_id?` · `contact_id?` · `parent_task_id?`.
- **Content:** `title` TEXT NOT NULL `[E]` · `description` TEXT `[E]`.
- **Config (floor):** `status` TEXT NOT NULL DEFAULT `'not_started'` (CHECK ← `STATUS`) · `priority` TEXT NOT NULL
  DEFAULT `'medium'` (CHECK ← `PRIORITY`) · `difficulty` TEXT DEFAULT `'medium'` (CHECK ← `TASK_DIFFICULTY`) ·
  `due_date` TEXT (YYYY-MM-DD) · `estimated_minutes` INTEGER · `actual_minutes` INTEGER · `sort_order` INTEGER NOT NULL
  DEFAULT 0.
- **INTENDED (authored now):** `completed_at` INTEGER · `scheduled_date` TEXT (YYYY-MM-DD) · `kind` TEXT NOT NULL
  DEFAULT `'standard'` (CHECK ← **`TASK_KIND`**) · `recurrence_rule` TEXT (RRULE, plaintext) · `measurement_kind` TEXT
  **NOT NULL DEFAULT `'milestone'`** (CHECK ← `MEASUREMENT_KIND` — doc-licensed natural, structure-data.md:20) ·
  `binding_mode` TEXT **nullable, NO default** (CHECK ← `BINDING_MODE`; NULL ⇒ unbound/derive-natural — the ADR-011 §3.2
  override-slot grain; no doc licenses a universal default, gate-2 finding #1) · `nesting_weight` INTEGER.
- `deleted_at` INTEGER (soft delete).
- **NO inline `tags` column** (§P3.0 #3).
- **Indexes:** Drizzle-mirror query indexes on `project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id`;
  **SQL-migration-only** partials `idx_tasks_status (status) WHERE deleted_at IS NULL` + `idx_tasks_due (due_date) WHERE
  deleted_at IS NULL` (the `notes.ts` precedent — mirror declares plain indexes only). `[FACT: ADR-002 L1524-1530; notes.ts:60-66]`

**2. `task_time_logs`** (zero `[E]`):
- `...baseColumns` (own `id` PK + created_at + **updated_at** [v2 baseColumns delta vs §5.3, benign — locked pattern] +
  6 `_sync_*`) · `task_id` TEXT NOT NULL (plain TEXT, no FK; was CASCADE — TK-4 app-layer) · `start_time` INTEGER NOT
  NULL · `end_time` INTEGER · `duration_minutes` INTEGER. **No `deleted_at`** (ledger; base task owns cascade — matches
  §5.3 which has none). Index `idx_time_logs_task (task_id)`. `[FACT: ADR-002 L1536-1553]`

### §P3.2 — Enums, validators, registry
- **`TASK_KIND` (NET-NEW):** author `export const TASK_KIND = ['standard','obligation'] as const` + `export type
  TaskKind = (typeof TASK_KIND)[number]` in `@vida/types/task.ts` (barrel already re-exports `./task`). Add
  `export const TaskKindSchema = z.enum(TASK_KIND)` in `packages/core/src/validators/task.ts` (the DB-9 pattern). `[FACT: validators/common.ts:4 pattern]`
- **Reused tuples (no change):** `STATUS`/`PRIORITY` (`common.ts`), `TASK_DIFFICULTY` (`task.ts:13`), `MEASUREMENT_KIND`/
  `BINDING_MODE` (`measurement.ts:5,9`). Their Zod validators already ship. `[FACT]`
- **`enum-parity.test.ts` — +6 rows** (import the tuples, apply migration015, assert each live CHECK ≡ tuple):
  `tasks.status`←STATUS · `tasks.priority`←PRIORITY · `tasks.difficulty`←TASK_DIFFICULTY · `tasks.measurement_kind`←
  MEASUREMENT_KIND · `tasks.binding_mode`←BINDING_MODE · `tasks.kind`←TASK_KIND. *(These are the first live tables to use
  STATUS/PRIORITY/TASK_DIFFICULTY/MEASUREMENT_KIND/BINDING_MODE — add them to the import block.)* ⚠ **P4 mechanical
  (gate-2 #6):** also extend the test's `ddlFor()` migration chain (currently 001–014) to apply `migration015Tasks`, else
  the new rows null-DDL false-fail. Hyphenated CHECK values (`derived-pull`/`event-trigger`) parity-match cleanly
  (`extractCheckSet` strips quotes, hyphens are ordinary). `[FACT: enum-parity.test.ts:15-45; gate-2 finding #6]`
- **`ENTITY_TYPES += 'task'`** in `schema/_registry.ts` (`task` becomes a valid `pages`/`entity_links`/`entity_tags`
  polymorphic target). *(No `task_time_log` type — logs are addressed via `task_id`, not polymorphic refs.)* `[FACT: _registry.ts]`

### §P3.3 — Files, migration, tests
- **Migration `migrations/015_tasks.ts`** — `export const migration015Tasks: Migration = { version: 15, name: 'tasks',
  up: async (driver) => {…} }`, hand-written SQL (header-commented like `014`), 2 `CREATE TABLE` + the indexes (incl. the
  2 partial indexes). `up()` must NOT open its own transaction (runner wraps it). Register in `runner.ts`: import +
  append to `ALL_MIGRATIONS` (→ `LATEST_VERSION` derives to 15). `[FACT: 014_sessions_scheduling.ts; runner.ts:24-38]`
- **Drizzle mirror `schema/tasks.ts`** (new top-level domain file, the `notes.ts`/`preferences.ts` sibling) — `tasks` +
  `taskTimeLogs` `sqliteTable`s (composing `...baseColumns`, `enumText` for the 6 CHECK columns, plain query indexes) +
  `$inferSelect`/`$inferInsert` row types. Export from `schema/index.ts`. `[FACT: notes.ts pattern]`
- **Phase-5 DDL-introspection test** `db/tests/tasks-introspection.test.ts` — apply `015` in-memory (better-sqlite3 +
  `PRAGMA table_info`), diff each real table vs the Drizzle mirror on **column-set · nullability · PK · default** (the
  mandatory bookend). Cite the DB-11 interface divergences (§P3.4) as exempt. `[FACT: flow doc §2 P5; group #3 introspection test]`

### §P3.4 — DB-11 deferrals (interface reconcile — cited, not fixed here)
`@vida/types/task.ts` `Task` interface (`:20-41`) diverges from the authored table — **mirror-only now, → DB-11** (group
#1/#3 boundary; P5-exempt):
- **Adds** (interface lacks): `completed_at` · `scheduled_date` · `kind` · `recurrence_rule` · `measurement_kind` ·
  `binding_mode` · `nesting_weight`.
- **Drops** (interface has, table won't): `tags: string[]` (`:38`) → superseded by `entity_tags`.
`TaskTimeLog` (`:43-50`) gains `updated_at` (v2 baseColumns) — also DB-11. `[FACT: task.ts:20-50; DB-11]`

### §P3.5 — Plan checklist (pre-critique)
- [x] 2-table DDL from ADR-002 §5.3 floor + build-phase INTENDED, no-FK reconciled · [x] 4 doc-closures cited (§P3.0) ·
  [x] `TASK_KIND` net-new tuple + validator; 5 reused tuples; +6 parity rows · [x] `ENTITY_TYPES += 'task'` ·
  [x] migration/mirror/introspection layout · [x] `Task` interface reconcile deferred to DB-11 (cited) ·
  [ ] **gate-1 `/critique`** (next) · [ ] Approval 1 · [ ] preflight · [ ] gate-2 `/critique` · [ ] Approval 2.

### §P3.6 — Gate-1 critique verdict (independent) → SHIP
An independent adversarial critic verified all 12 load-bearing claim-classes against source on disk (ADR-002 §5.3 floor
DDL · no-FK convention in `notes.ts`/`scheduling.ts`/`spaces.ts` · recurrence exclusion conventions.md:13,25 +
`recurrence_rule` corpus presence · ADR-011 §3.3 L54 `nesting_weight` + zero-REAL-in-v2 · inline-tags RETIRE ·
`views` substrate · all enum tuple sources + `TASK_KIND` genuinely absent · `ENTITY_TYPES` `task` absent · migration-15
slot mechanics · DB-11 interface-divergence precedent). **Verdict SHIP.** Meta-check PASSED: no manufactured "open
decisions", no overclaimed FACT, no invented fork — locked conventions correctly treated as FACT. Two **NITs** (cosmetic
line-anchors), both fixed: (a) recurrence exclusion cited `conventions.md:13,25` (dropped the imprecise `:20`); (b)
`nesting_weight`/`measurement` re-anchored to the **§5.20 owed-ledger L3819/L3816** (the critic's corroborating find —
the pair + weight are enumerated there too). No schema-shape change.

### §P3.7 — Approval 1 (pending Victor)
**2-table model** (`tasks` · `task_time_logs`), zero decisions, gate-1 SHIP. Awaiting Approval 1 → then preflight →
gate-2 → Approval 2.

### §P3.7 — Approval 1 ✅ (Victor, 2026-08-19) → preflight
2-table straight authoring plan approved (zero decisions; gate-1 SHIP). → `/preflight` → gate-2 → Approval 2.

### §P3.8 — Preflight → PASSED (no blocker)
Ran against `docs/infrastructure/database-layer/current-{spec,business-rules}.md`. DB-only unit: all layers specified
(2 tables; ops = hand-written SQL migration DDL + Drizzle query-mirror; no frontend/endpoint/auth surface). **All 9
syncable-table invariants hold** + repository-compat: both `tasks` and `task_time_logs` compose full `...baseColumns`
(own `id` UUIDv7 PK) → **no BR-DB-1 extension-PK trap** (the group-#3 blocker does not recur — these are top-level
domain tables, not 1:1 session extensions). Inv-check: #1 PK✓ · #2 ms-timestamps✓ (`completed_at` INTEGER) · #3
INTEGER/TEXT-date✓ (`nesting_weight` INTEGER, `scheduled_date`/`due_date` TEXT) · #4 CHECK-in-migration+Zod✓ (6 columns)
· #5 6 `_sync_*`✓ · #6 no-inline-notes✓ (notes via `pages`) · #7 soft-delete `deleted_at` on `tasks`✓ · #8
`ENTITY_TYPES += task`✓ · #9 `[E]` seam (title/description, M1.0 pass-through empty set, BR-DB6-3)✓.

**Documented assumptions (all doc-grounded, low-risk — per-module DDL realizations, not locked FACT; §5.20 L3816: "the
contract, not per-table DDL, is locked"):**
- **A1 · INTENDED-column nullability/defaults** *(corrected by gate-2 finding #1)*: `kind` NOT NULL DEFAULT `'standard'`
  (`standard` = the non-obligation baseline class — conventions.md:13 "standard tasks don't [recur]" + structure-data.md:19);
  `measurement_kind` NOT NULL DEFAULT `'milestone'` (structure-data.md:20 "natural = milestone" — a documented natural,
  doc-licensed); **`binding_mode` NULLABLE, NO default** (NULL ⇒ unbound/derive-natural, the ADR-011 §3.2 override-slot
  grain — the docs name what `event-trigger` *means* for a completion, TK-6, but license **no** universal default;
  ⚠ the initial `NOT NULL DEFAULT 'event-trigger'` was a manufactured default, struck); `completed_at` · `scheduled_date`
  · `recurrence_rule` · `nesting_weight` **nullable** (set on event / obligations-only / equal-weight-default).
- **A2 · `task_time_logs` hard-delete** (no `deleted_at`) — matches §5.3 (none) + TK-4 (logs cascade with the task; the
  repository hard-deletes absent a `deleted_at` column, BR-DB6 soft-delete rule).
- **A3 · `task_time_logs.updated_at`** (v2 `...baseColumns` delta vs §5.3's `created_at`-only) — benign + useful
  (stop-timer sets `end_time`/`duration_minutes` = an update); the `TaskTimeLog` interface gap → DB-11 (§P3.4).
**VERDICT: PASSED** — ready for gate-2.

### §P3.9 — Gate-2 critique (independent, post-preflight) → REVISE → resolved
A second independent critic scrutinized the preflight A1 assumptions + confirmed the gate-1 fixes landed (recurrence
`:13,25`; §5.20 L3816/L3819 re-anchors) and no ownership leak (tags/notes/views/session/XP all correctly external).
Verdict **REVISE** — 1 MATERIAL + 1 NIT, both cleared:
1. **[MATERIAL] `binding_mode NOT NULL DEFAULT 'event-trigger'` was a manufactured default** — structure-data.md:20 "a
   completion *is* the event-trigger" names what the value *means* for a completion (TK-6), not a universal default; a
   plain manually-checked task is semantically `manual`. ADR-011 §3.2's override-slot grain (NULL ⇒ derive) is the
   faithful model. **Fixed → `binding_mode` nullable, no default** (§P3.1/§P3.8 A1). `measurement_kind` DEFAULT
   `'milestone'` stays (genuinely doc-licensed "natural = milestone"). *(Same class as the earlier drift, reversed: a
   manufactured DEFAULT, not a manufactured decision — caught + struck.)* ✅
2. **[NIT] Fabricated inline quote** — A1 cited conventions.md:20 "standard is the module's default" (that line has no
   such string). **Fixed** → re-anchored to conventions.md:13 + structure-data.md:19; `DEFAULT 'standard'` (the
   non-obligation baseline class) is correct. ✅
Plus **[OK ×6]** confirmations: gate-1 fixes landed · A2 hard-delete sound (repository.ts hard-deletes absent
`deleted_at`) · `kind` value supported · hyphenated CHECK parity clean (+ the `ddlFor()` chain reminder folded into
§P3.2) · no ownership leak · A3 `updated_at` → DB-11. Post-revision: **VERDICT clean SHIP** — one nullability flip, no
schema-scope change, no reopened decision.

### §P3.10 — Approval 2 ✅ (Victor, 2026-08-19) → Phase 4 (implement)
Plan gate-1 SHIP → preflight PASSED → gate-2 REVISE→SHIP, **zero decisions, all doc-cited**. Cleared to implement.

## Phase 4 — Implement (DONE)
Authored strictly from the approved §P3 plan (no §XXVIII divergence):
- **`@vida/types/task.ts`** — `TASK_KIND = ['standard','obligation']` + `TaskKind` (net-new tuple).
- **`@vida/core/validators/task.ts`** — `TaskKindSchema = z.enum(TASK_KIND)`.
- **`migrations/015_tasks.ts`** — hand-written SQL for `tasks` + `task_time_logs` (registered in `runner.ts` → v15).
- **`schema/tasks.ts`** (new top-level domain module) — `tasks` · `taskTimeLogs` Drizzle mirrors (own `id` PK, no FK,
  5 plain parent-ref indexes; partials SQL-only). Exported from `schema/index.ts`.
- **`schema/_registry.ts`** — `ENTITY_TYPES += 'task'`.
- **`validators/enum-parity.test.ts`** — +6 fixture rows + `ddlFor()` chain extended to `migration015Tasks`.
- **Reconcile:** `spaces.test.ts` "register adds a new type at runtime" used `'task'` as its throwaway unregistered
  example — now (correctly) a seeded taggable type (TK-8); switched to a synthetic `'custom_user_type'` (robust to
  future ENTITY_TYPES appends). Mechanical fallout of the approved registry append, not a §XXVIII divergence.
- **DB-11 deferred** (cited): `Task` interface (+7 cols −`tags`) + `TaskTimeLog.updated_at`.

## Phase 5 — Foundation-soundness verify (DONE)
- **DDL-introspection parity (mandatory bookend)** — `db/tests/tasks-introspection.test.ts` applies `015` in-memory
  (better-sqlite3 + `PRAGMA table_info`) and diffs `tasks` + `task_time_logs` vs the Drizzle mirror on **column-set ·
  nullability · PK · default** (8 cases). Interface (`@vida/types`) divergences are the DB-11 deferrals, cited not asserted.
- **Independent post-impl critique → SHIP** — verified SQL↔mirror EXACT parity (24 `tasks` + 11 log cols on name/
  nullability/default), 6 CHECK sets ≡ tuples, zero `REFERENCES`, no leaked columns (no inline tags/progress), partials
  SQL-only, migration mechanics, DB-11 deferrals cited-not-dropped. One cosmetic NIT (comment wording). No §XXVIII deviation.
- **§XXIX Currency promoted** (same session): `database-layer/current-spec.md` (group #4 row) + `current-business-rules.md`
  (BR-T4-1…9).
- **Foundation-readiness — PASS.** MOD-tasks finds every table/column: `tasks` (all cols incl. the INTENDED set) +
  `task_time_logs`; tags→`entity_tags` (`entity_type='task'`), notes→`pages`, timer→`focus_sessions` (#3), views→`views`
  (AR-6), up-ladder→`contributions` (DB-3), XP→`consequence_ledger`. No gap.
- **Green:** `@vida/core` **240 tests** (+6 enum-parity, +8 introspection) · typecheck **11/11** · lint **0-err** ·
  `LATEST_VERSION`=15. *(1 pre-existing encryption-1MB timeout flake — documented in the test itself, passes isolated at
  ~9.9s, zero relation to Tasks.)*

### Deferred / cross-group (tracked, not this unit)
- **DB-11 interface reconcile:** `Task` (+`completed_at`/`scheduled_date`/`kind`/`recurrence_rule`/`measurement_kind`/
  `binding_mode`/`nesting_weight`, −`tags`) · `TaskTimeLog` (+`updated_at`).

**Group #4 COMPLETE.** 4 of 22 DB-4 groups done; 18 remain. Next = group #5 Projects.






