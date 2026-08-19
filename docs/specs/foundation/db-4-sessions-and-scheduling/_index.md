# DB-4 · Domain Group #3 — Sessions & Scheduling (+Pomodoro) · Unit Spec

> **Unit:** the DB-4 per-domain schema build for the **Sessions & Scheduling** domain group (the OS primitive for
> timed, focused activity — a **foundation** many modules extend) — Stream (ii) of the M1.0 schema foundation.
> **Issue:** LIF-66 · M1/M1.0 `#10` · profile **add-backend-component** · ← DB-1 ✅ · ← DB-3 ✅ (substrate spine).
> **Flow:** the 5-phase lifecycle in `docs/roadmap/schema-foundation-build-flow.md §2`. **This file = Phase 1 (Intent
> intake).** Phase 2 (current-state read) + Phase 3 (plan double-gate) append their sections below.
> **No-Guessing:** every claim `[FACT: src]` / `[INTERP]` / `[INTENT]` / `[UNKNOWN]`. Ship-scope trimming is **forbidden
> in Phase 1** — a foundation intakes the WHOLE documented intent so nothing is silently omitted
> (`[[intake-captures-intent-not-ship-scope]]`).
> **⚠ Zero decisions.** Every shape point below is doc-determined — the roster is the **ADR-002 §5.20 owed-tables
> ledger**, cross-checked against the `sessions-and-scheduling/` + `pomodoro/` 5-aspect specs and **ADR-004**. There is
> nothing to "resolve at the plan gate"; Phase 3 is a *straight authoring plan*
> (`[[stale-source-plus-live-convention-is-fact-not-a-decision]]`).

## §0. Source model
Backend schema unit — the frontend source-of-truth guard (`docs/specs/foundation/frontend-source-of-truth.md`) is
**N/A** (no DS/UI/UX token surface). The intent sources are:
- The **`docs/features/sessions-and-scheduling/` 5-aspect spec** (`identity · structure-data · business-rules ·
  contract · conventions`) — SS-1…SS-12. `[FACT]`
- The **`docs/features/pomodoro/` 5-aspect spec** — the `focus`-sub-type runtime, folded into this realm (D3;
  self-declared "capability within the Sessions & Scheduling realm"). PD-1…PD-12. `[FACT]`
- **[ADR-004](../../../core/decisions/ADR-004-session-framework.md)** — table-per-type storage (§3.1) + the
  4-dimension Integration Contract (§3.2) + the base+extension sync rule (§3.4). The authority behind every shape here.
- **ADR-002 §5.20** — the owed-tables ledger (Stream (i) ADD/RETIRE/AMEND) that names the exact table dispositions;
  and the stale §5 body DDL (column-informative only, superseded on structure by the reframe). `[FACT]`
- The canonical enum tuples + interfaces already shipped in **`@vida/types`** (`session.ts`, `note.ts`, `learning.ts`,
  `knowledge.ts`).

> **⚠ Stale-source note (mirrors group #1/#2).** The v2 §5 body DDL (`study_sessions` L2557, `study_plan_batches`
> L2831, `pomodoro_sessions` L1458, `session_templates` L2894, `study_availability` L2781) is the **pre-amendment v1**
> and **stale on structure** (ADR-002 §5.20 L22): `study_sessions` shown as a standalone table is **redefined** as a
> 1:1 extension; `pomodoro_sessions.entity_type`/`page_id` are **superseded** by `session_id`; `study_plan_batches.
> course_id` FK is superseded by the no-FK convention + a widened scope. The DDL is mined for **column intent only**;
> the structure comes from ADR-004 + §5.20. `[FACT: ADR-002 §5.20 L22; [[stale-source-plus-live-convention-is-fact-not-a-decision]]]`

## §1. Identity — what this unit is
DB-4 / Sessions & Scheduling authors the **6 Sessions-realm-owned tables** (⚠ Phase-1 said "7" — corrected to 6 in
§P3.0 R1/R3: `focus_sessions` IS the timer runtime, `pomodoro_sessions` RETIRED) that complete the Session framework on
top of the finished substrate. The realm is the single stable `session_id` spine that every timed activity in the OS
hangs off; this group authors the two Sessions-owned **extensions** (`study_sessions`, `focus_sessions` — the `focus`
extension is the timer runtime, R1) and the four **scheduling/planner** tables (`study_availability`,
`availability_exceptions`, `study_plan_batches`, `session_templates`). `[FACT: ADR-002 §5.20; ADR-004 §3.1; notes-and-pages/structure-data.md:30]`

### Scope boundary — doc-FIXED (three converging sources, not a decision)
- **ADR-004 §3.1** names each extension table's owner: `reading_sessions`→Books, `class_sessions`→Education,
  `workout_sessions`→Health, `work_sessions`→Tasks, **`study_sessions`/`focus_sessions`→Sessions & Scheduling**.
- **`current-spec.md:38`** defers "per-sub-type extension tables (Books/Education/…) → DB-4/M1.1+".
- The **P0 22-group slice** already lists Tasks #4, Knowledge #10, Books #11, Learning/Education #12, Languages #13,
  Health:Training #19 as their own groups.

→ **Group #3 authors only the Sessions-realm-owned tables.** The other sub-type extensions are authored by *their*
domain's DB-4 group. `[FACT: ADR-004 §3.1; current-spec.md:38; task P0 Output]`

### Boundary — what this unit is NOT
- **NOT a re-author of the spine or the substrate.** `sessions` · `session_type_registry` · `session_attachments`
  (AR-5, `002`) · `applied_effects` (AR-7, `004`) · `planned_blocks` (DB-3, `010`) are **already on disk** — this unit
  reconciles-and-extends, never re-creates them. `[FACT: db/schema/foundation/{sessions,effects,scheduling}.ts]`
- **NOT the owner of a `session_effects` table.** No such table is in the §5.20 ADD set. Dimension 2 (Effects) is
  realized as the `EFFECT_TYPE` catalogue enum (AR-5) + the `SessionTypeDef.effects[]` JSON persisted in
  `session_type_registry` (AR-5, dims 2–4 as JSON) + the `applied_effects` dedup ledger (AR-7) + a UNIQUE
  `effect_event_id` on each **target-module** output row (per-domain AMEND). The `structure-data.md:47` label
  "`session_effects` (dim2)" is the *concept*, not an owed table. `[FACT: ADR-002 §5.20 ADD set; ADR-004 §3.2.5; current-spec.md:21]`
- **NOT the author of `scheduled_study_sessions`.** It is **DROPPED** — superseded by `planned_blocks` (the aggregator,
  DB-3) which *points* at owner work and never mirrors it (SS-7). `[FACT: ADR-002 §5.20 §5.11-RETIRE; business-rules.md SS-7]`
- **NOT the author of the other sub-type extensions** (`reading_/class_/workout_/work_/practice_/daily_/review_
  sessions`) — each is its domain group's (ADR-004 §3.1). `[FACT]`
- **NOT the effect-firing engine, the lifecycle-transition engine, the scheduler/placement algorithm, or the view
  layer** — those are logic (AR-7 / G5 / G9 / later), not schema. This unit authors **tables only**. `[FACT: current-spec.md:35-40; ADR-004 §3.5 "does NOT specify the placement algorithm (G5)"]`
- **NOT a `@vida/types` interface reconcile.** Where a shipped interface diverges from a table, this unit **mirrors the
  shipped shape** and defers the interface consolidation to DB-11 (the group #1 `entity_links`/`EntityLink` precedent).
  `[FACT: DB-4 group #1 finding; [[stale-source-plus-live-convention-is-fact-not-a-decision]]]`
- Authoring model: **hand-written SQL migration** (`014_sessions_scheduling.ts`, ADR-016 §3.5 — no drizzle-kit) + Drizzle
  query-mirror modules in the v2 surface + the `ENTITY_TYPES` reconcile append. Physical home in §4.

## §2. Business Rules (inherited invariants — the intake honors these)
Every table this unit authors is a **syncable** table upholding `database-layer/current-business-rules.md` (UUIDv7 PK ·
Unix-ms timestamps · INTEGER bool · TEXT enums with SQL `CHECK` + Zod for FIXED enums, OPEN vocab = plain TEXT no CHECK
per `[[open-vocab-columns-take-no-sql-check]]` · the 6 `_sync_*` columns via `...baseColumns` · soft delete where
applicable · three-layer encryption). The **exception:** `pomodoro_sessions` is device-runtime — see BR-S7. The
schema-relevant feature invariants:
- **BR-S1 — One spine, extensions never re-declare it (SS-1 · ADR-004 §3.1).** The shared spine fields (`sub_type ·
  purpose · scheduling_mode · started_at · ended_at · status · focus_rating · energy_level · distraction_count ·
  key_learnings[E] · planned_block_id`) live on **`sessions` (already built)**. Each extension table holds **only its
  type-specific columns**, keyed 1:1 by `session_id`. An extension NEVER duplicates a spine column. `[FACT: ADR-004 §3.1; sessions.ts:25-52]`
- **BR-S2 — No cross-table FK (ADR-004 §3.4 + DB-3 convention).** `session_id` on an extension, `planned_block_id`,
  `scope_id`, `resource_id`, etc. are **plain TEXT, no `REFERENCES`** — sync applies rows out of order; referential
  integrity is the app/sync layer's. Mirrors the shipped `sessions`/`planned_blocks` (no FK). `[FACT: current-spec.md:23; scheduling.ts]`
- **BR-S3 — FIXED enums → SQL CHECK sourced from the `@vida/types` tuple; OPEN vocab → plain TEXT no CHECK (BR-6/SS-5).**
  `scheduling_mode`/`status`/`planned_block_status` are FIXED (CHECK). `sub_type`/`purpose`/attachment `entity_type`
  are OPEN (no CHECK). Parity asserted by `enum-parity.test.ts`. `[FACT: business-rules SS-5; current-business-rules BR-5a/BR-6]`
- **BR-S4 — Aggregator, never duplicator (SS-7).** `planned_blocks` (built) points at owner work; this unit adds **no
  table that mirrors another module's scheduled rows.** `scheduled_study_sessions` stays dropped. `[FACT: SS-7]`
- **BR-S5 — Availability is Planner-owned (SS-9).** `study_availability` + `availability_exceptions` are the scheduling
  INPUT this realm owns. `[FACT: SS-9]`
- **BR-S6 — ⚠ SUPERSEDED by Phase-3 R2 (do not cite this line).** Phase 1 wrongly claimed "`key_learnings` is the only
  `[E]` field; the seven tables are all-plaintext." **Corrected in §P3.0 R2:** the realm has **four** `[E]` fields
  (`sessions.key_learnings` spine + `study_plan_batches.name` + `session_templates.name` +
  `availability_exceptions.reason`) and authors **6** tables, not 7 (R1). `study_sessions`/`study_availability`/
  `pomodoro_sessions` are zero-`[E]`. `[gate-1 finding #2; see §P3.0]`
- **BR-S7 — `focus_sessions` travels as a session runtime row, but the live *tick* is ephemeral Zustand, never
  persisted per-tick (PD-client-state).** Only interval boundaries + completion persist. The row is syncable
  (`...baseColumns`) and travels with its base session (ADR-004 §3.4). `[FACT: pomodoro/structure-data.md:46-49]`

## §3. Intended shape — the 6 tables (FACT floor + INTENDED, cited)

> ⚠ **This section was drafted as "7 tables" in Phase 1 and is corrected by §P3.0 R1/R3:** the `focus` extension is
> **`focus_sessions`** (the timer runtime), and **`pomodoro_sessions` is RETIRED** (not authored). Read §P3.0/§P3.1 as
> governing; §3a/§3c below are updated in place.
> Legend: **spine** = already on `sessions` (do not re-store). Extensions key on `session_id` (no own `id`); planner
> tables carry `...baseColumns`. `[E]` per §P3.0 R2 (not "all-plaintext" — that Phase-1 claim was wrong).

### §3a. Extensions (Sessions-owned, 1:1 on `session_id` — ADR-004 §3.1)
- **`study_sessions`** *(redefined: standalone → thin extension)*. Type-specific columns only:
  `session_id` (PK, = the base id, plain TEXT no FK) · `resource_type` (FIXED CHECK, `STUDY_SESSION_RESOURCE_TYPE`
  — exists `learning.ts:38`: course·book·topic·homework·article·video·podcast) · `resource_id` · `pages_read?` ·
  `lessons_completed?`. The v2 `focus_rating`/`energy_level`/`distraction_count`/`key_learnings`/`started_at`/
  `ended_at`/`duration` are **spine fields on `sessions`** (ADR-004 §3.1) — **not** re-stored here (`duration` is
  `ended_at − started_at`, derived). `[FACT: ADR-002 §5 study_sessions L2557-2578 (columns); ADR-004 §3.1 (base/extension split); §5.20 ADD "redefined"]`
- **`focus_sessions`** *(net-new extension = the timer runtime; the retired `pomodoro_sessions`'s columns land here —
  R1/R3)*. The `focus` sub-type's 1:1 extension keyed `session_id`, carrying the reframed pomodoro columns — see §P3.1
  #2 for the exact column list (`type`/`status`/`completed_count`/`duration_seconds` + `paused_at`/`total_pause_seconds`/
  `was_interrupted`/`interruption_reason`). zero-`[E]` (timer state is structural, pomodoro/conventions.md:35).
  `[FACT: notes-and-pages/structure-data.md:30 (focus_sessions is the table); ADR-004 §3.1; pomodoro business-rules PD-1/4/5/6]`

### §3b. Scheduling / Planner (Planner-owned — §5.11 "redefined, not dropped")
- **`study_availability`** — recurring scheduling windows: `day_of_week` · window (`start`/`end`) · `preference`
  score · (retained from §5.11, SS-9). Routines may preset windows in; Calendar renders. `[FACT: ADR-002 §5 L2781; SS-9; §5.20 §5.11-RETIRE "redefined not dropped"]`
- **`availability_exceptions`** — date-specific overrides on availability (`date` + window/blackout). `[FACT: ADR-002 §5 L2809; SS-9]`
- **`study_plan_batches`** — a generated plan batch: `name[E?→plaintext per BR-S6, confirm]` · **`scope_type`/`scope_id`**
  (widened beyond course — G5; replaces the v2 `course_id` FK, no-FK convention) · `status` (FIXED CHECK) ·
  `total_sessions` · `generated_at?` · `approved_at?`. **Status set = `STUDY_PLAN_BATCH_STATUS` (`knowledge.ts:41`:
  draft·pending_approval·approved·active·completed) `+ failed`** — `business-rules.md:89` mandates `failed` as a
  terminal state ("no availability / nothing to schedule → explicit, never a silent empty plan"); the shipped enum
  omits it → **Phase 4 adds `failed`** (a FACT gap-fix, grounded in business-rules, not a decision). `[FACT: ADR-002 §5 L2831; structure-data.md:56 (widen scope G5); business-rules.md:89]`
- **`session_templates`** — `focus`/session presets (SS-11 "this module owns its templates as `focus` presets").
  Restore v1 fields: `focus_technique · description · notifications · sounds · usage_count · last_used_at` +
  interruption/pause config + `is_default` (contract.md:40). **Distinct from** the generic ADR-009 `templates` table
  (DB-3) — a different concern. `[FACT: ADR-002 §5 L2894; structure-data.md:58; contract.md:40; SS-11]`

### §3c. Pomodoro runtime → RETIRED into `focus_sessions` (R1/R3)
- **`pomodoro_sessions` is NOT a table this unit authors — it is RETIRED.** The reframe folds the timer runtime into
  the `focus_sessions` extension (§3a / §P3.1 #2), keyed by `session_id` (dropping the v2 polymorphic `entity_type`/
  `entity_id` — PD-1 — and `page_id` — PD-2). The runtime columns (`type`/`status`/`completed_count`/`duration_seconds`
  + v1 restores `paused_at`/`total_pause_seconds`/`was_interrupted`/`interruption_reason`) live on `focus_sessions`.
  Enums/interface re-home to the Sessions realm → **DB-11** (mirror-only now). `[FACT: notes-and-pages/structure-data.md:30 (pomodoro_sessions retired → focus_sessions); pomodoro business-rules PD-1/5/6]`
- **Config stays in Preferences (not this unit).** `user_preferences.pomodoro_*` (work/break/long-break minutes +
  sessions-before-long) was authored in **group #2**; the runtime *reads* it, never re-stores (PD single-source).
  The PD-7 additions (`auto_start_breaks`/`auto_start_next_interval`/`show_notifications`/`play_sounds`) are
  **Preferences-owned** — verify they landed in group #2's `user_preferences`; if absent, that is a **group #2
  backfill**, not group #3's table. `[FACT: pomodoro/structure-data.md:18-19,30-31; ADR-002 L3497-3500]`

### §3d. `ENTITY_TYPES` registry — reconcile append
The `sessions`/attachment polymorphic `entity_type` roster: confirm `session`/`study_session` and any sub-type refs
the seven tables introduce are present in `db/schema/_registry.ts ENTITY_TYPES`; append the missing, per `_registry.ts`
guidance. (Exact diff = Phase 2.) `[FACT: _registry.ts; ADR-006]`

## §4. Physical home & authoring model (P-R)
- **P-R1 — migration:** `packages/core/src/db/migrations/014_sessions_scheduling.ts` (hand-written SQL, ADR-016 §3.5),
  registered in `runner.ts` (LATEST_VERSION 13 → 14). `[FACT: migrations/ pattern; runner.ts]`
- **P-R2 — Drizzle mirrors:** extend `db/schema/foundation/` — likely `sessions-extensions.ts` (study/focus) +
  `scheduling.ts` (append availability/exceptions/batches/templates to the existing `planned_blocks` file) +
  `pomodoro.ts`. Exact file split confirmed in Phase 3 against the existing foundation layout. `[FACT: schema/foundation/*]`
- **P-R3 — enums:** `STUDY_PLAN_BATCH_STATUS += 'failed'` (edit existing tuple `knowledge.ts:41`; existing
  `StudyPlanBatchStatusSchema` auto-flows it — E1). `PRESET_BLOCK` already exists (E2, reuse — no change). All other
  enums already shipped. Parity rows added to `enum-parity.test.ts` for each new FIXED-CHECK column. `[FACT: knowledge.ts:41; business-rules.md:89]`
- **P-R4 — barrel + registry:** export the new Drizzle modules from `schema/index.ts`; append `ENTITY_TYPES` (§3d).

## §5. Phase-1 completion checklist
- [x] intent sources named (sessions-and-scheduling + pomodoro 5-aspect · ADR-004 · ADR-002 §5.20) · [x] scope boundary
  doc-fixed (3 signals) · [x] table roster from the §5.20 ledger with per-table [FACT] shape (drafted 7 → **corrected
  to 6** in §P3.0: `focus_sessions` = timer runtime, `pomodoro_sessions` RETIRED) · [x] NOT-list (spine,
  session_effects, scheduled_study_sessions, other extensions, engines, interface reconcile) · [x] all-plaintext
  confirmed (BR-S6) · [x] 2 intent-vs-shipped gaps recorded as FACT (batch `failed`; batch scope widen) · [x] **zero
  decisions** — Phase 3 is a straight authoring plan.

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)

Verified on disk 2026-08-19 (`grep sqliteTable` / `CREATE TABLE` across `schema/**` + `migrations/**`).

### Already authored — DO NOT re-create (reconcile-and-extend targets)
| Table | File | Migration | Role |
|---|---|---|---|
| `sessions` (spine) | `foundation/sessions.ts` | `002` | base spine — holds all shared fields (§3a references it) |
| `session_type_registry` | `foundation/sessions.ts` | `002` | dims 2–4 as JSON (the `session_effects` concept) |
| `session_attachments` | `foundation/sessions.ts` | `002` | dim1 polymorphic attachment |
| `applied_effects` | `foundation/effects.ts` | `004` | R1 dedup ledger |
| `planned_blocks` | `foundation/scheduling.ts` | `010` | aggregator (SS-7); scheduling half already present |
| `templates` (generic) | `foundation/templates.ts` | `011` | ADR-009 generic — **unrelated** to `session_templates` |

### To author — 6 confirmed ABSENT (net-new)
`study_sessions` · `focus_sessions` · `study_availability` · `availability_exceptions` · `study_plan_batches` ·
`session_templates` → **all ABSENT** in both `schema/` and `migrations/`. `pomodoro_sessions` is also absent — and
**stays absent (RETIRED, R3)**, its runtime folding into `focus_sessions`. `[FACT: grep 2026-08-19]`

### `ENTITY_TYPES` diff (`_registry.ts`)
Current roster = `page·note·journal·tag·space` + DB-3 substrate (`value·contribution·purpose_review·plan_step·
review_curve·method_binding·review_event·store·rule·planned_block·template`). **`session` is NOT present** (AR-5 built
the tables but never appended the entity_type). Phase-4 append: **`session`** (+ `study_session` — it was a v2
`pomodoro_sessions.entity_type` member and a plausible link/attach target; confirm the exact sub-type set in Phase 3
against `_registry.ts` guidance + how attachments/`entity_links` reference sessions). `[FACT: _registry.ts:5-25]`

### Migration slot
`ALL_MIGRATIONS` length = 13 (last = `013_preferences`); `LATEST_VERSION` is derived from the array length. This unit
adds **`014_sessions_scheduling`** → version 14. `[FACT: runner.ts:23-24,48-49,94]`

### Baseline verdict
Pure **extend** — zero re-creation risk (all 7 absent, spine present). No shape ambiguity remains: the spine/extension
split (BR-S1) and the §5.20 dispositions fully determine every column home. Phase 3 is a **straight authoring plan**.

## Phase 3 — Implementation Plan (gate-1 draft)

> The *what & how*, drawn from the Phase-1/2 baseline. **Two Phase-1 corrections applied** (surfaced by grounding the
> DDL + reading the reframe docs): (a) **BR-S6 was wrong** — the realm has **four** `[E]` fields, not one; (b) the
> authoring set is **6 tables, not 7** — `focus_sessions` IS the `focus` timer runtime and `pomodoro_sessions` is
> **RETIRED** into it (R1/R3), per `notes-and-pages/structure-data.md:30`. Both are FACT corrections, cited.

### §P3.0 — Two reconciliations (doc-grounded, for the gate to scrutinize)
- **R1 · The `focus` timer table is `focus_sessions`; `pomodoro_sessions` is RETIRED — `[FACT]`, no decision.** The
  reframe is already resolved in the **consuming module's current reframe docs**: `notes-and-pages/structure-data.md:30`
  ("**`pomodoro_sessions` is retired**; the `/pomodoro` block is a widget-lens onto the **`focus_sessions`** extension of
  the `sessions` supertype, keyed by `session_id`") + `notes-and-pages/contract.md:19` ("launches a **`focus_sessions`**
  timer — the focus extension of the sessions supertype, ADR-004 §3.1"). So the `focus` sub-type's 1:1 extension is
  **`focus_sessions`** (exactly parallel to `study_sessions`), and it **is** the timer runtime — the reframed columns of
  the old `pomodoro_sessions` land here. There is **no separate `pomodoro_sessions` table** (v2 Notes table, retired) and
  **no separate empty `focus_sessions`** — one focus table, balanced. The "fold-vs-separate" framing in the meta/flow
  docs (`schema-foundation-build-flow.md:149`, `part-1.2-reruns/pomodoro.md` C2) is **superseded by the reframe docs**,
  which settle it. The only `[UNKNOWN — build-phase]` the docs leave is the `sub_type` *discriminator string value*
  (`notes-and-pages/structure-data.md:30`) — and `sessions.sub_type` is OPEN vocab (no CHECK); the value is `'focus'`
  (`SESSION_SUB_TYPE` member, `session.ts:22`), a runtime insert literal, not a DDL shape. `[FACT: notes-and-pages/structure-data.md:30, contract.md:19; pomodoro/structure-data.md:22-24 (re-home); ADR-004 §3.1; SESSION_SUB_TYPE session.ts:22]`
- **R2 · `[E]` correction (BR-S6).** The realm's `[E]` fields: `sessions.key_learnings` (spine, built) +
  `study_plan_batches.name` + `session_templates.name` + `availability_exceptions.reason`. `study_sessions`,
  `study_availability`, `focus_sessions` are **zero-`[E]`**. `[FACT: ADR-002 §5 DDL L2831 (name [E]), L2894 (name [E]), L2809 (reason [E]), L1151 (pomodoro zero-E)]`
- **R3 · `pomodoro_sessions` is a RETIRE, not an ADD.** The v2 Notes-owned `pomodoro_sessions` table (ADR-002 L1458,
  polymorphic `entity_type`/`page_id`) is **retired** and NOT re-created; its reframed columns land on `focus_sessions`
  (R1). Verify absent on disk (it is — Notes group #1 confirmed N&P no longer owns it), drop `idx_pomodoro_*` from the
  forward set, and record the RETIRE in the §5.20/§7 reconcile (`pomodoro_sessions → focus_sessions`). The
  `PomodoroType`/`PomodoroStatus`/`PomodoroEntityType` enums + `PomodoroSession` interface (`note.ts`) re-home to the
  Sessions realm with `focus_sessions` — but the enum/interface **MOVE is DB-11** (mirror-only now; group #1
  precedent); `POMODORO_ENTITY_TYPE` is retired with `entity_type`. `[FACT: notes-and-pages/structure-data.md:30,49 (retired + type re-home); ADR-016 DB-11]`

### §P3.1 — The 6 tables (exact DDL intent)
**⚠ Extension PK pattern — corrected by preflight (§P3.7).** All 6 tables (extensions included) use full
`...baseColumns` (own **`id` UUIDv7 PK** — BR-DB-1 is a hard invariant; the repository factory *generates* `id` and
forbids caller-supplied ids, so a `session_id`-PK table can't persist via the standard Repository). Extensions add
**`session_id TEXT NOT NULL UNIQUE`** — the 1:1 extension key (ADR-004 §3.1 "keyed by `session_id`" = a key column, not
a PK override; UNIQUE enforces 1:1; plain TEXT no FK — BR-S2). Each extension is a separate sync blob (ADR-004 §3.4).
`[FACT: database-layer/current-business-rules.md:9,51-52 (BR-DB-1); ADR-004 §3.1/§3.4]`

1. **`study_sessions`** (extension, zero-`[E]`): `...baseColumns` (own `id` PK) · **`session_id TEXT NOT NULL UNIQUE`**
   (1:1 key, no FK) · `resource_type` (CHECK ← `STUDY_SESSION_RESOURCE_TYPE`) · `resource_id` · `pages_read?` ·
   `lessons_completed?`. Spine fields NOT re-stored (BR-S1). Index `(resource_type, resource_id)`. `[FACT: ADR-002 L2557 cols − spine; ADR-004 §3.1; BR-DB-1]`
2. **`focus_sessions`** (the `focus` sub-type extension = the timer runtime; zero-`[E]`): `...baseColumns` (own `id` PK)
   · **`session_id TEXT NOT NULL UNIQUE`** (1:1 key; replaces the retired v2 `pomodoro_sessions.entity_type`/`entity_id`,
   PD-1, and `page_id`, PD-2) · `duration_seconds?` · `type` (CHECK ← `POMODORO_TYPE`, note.ts) · `status` (CHECK ←
   `POMODORO_STATUS`, note.ts) · `completed_count` (NOT NULL DEFAULT 0) · **+ v1 restores (PD-5/6):** `paused_at?` ·
   `total_pause_seconds` (NOT NULL DEFAULT 0) · `was_interrupted` (NOT NULL DEFAULT 0) · `interruption_reason?`.
   `started_at`/`ended_at` are spine (`sessions`), NOT re-stored (BR-S1). Index `(status)`. **`pomodoro_sessions` is
   NOT authored — RETIRED** (see R3). `[FACT: notes-and-pages/structure-data.md:30 (focus_sessions is the table); ADR-002 L1458 (v2 columns − entity_type/page_id); pomodoro business-rules PD-1/4/5/6; ADR-004 §3.1]`
3. **`study_availability`** (PK `id`, zero-`[E]`): `day_of_week` (CHECK 0..6) · `start_time`/`end_time` (HH:MM) ·
   `is_available` · `preference_score?` (CHECK 1..5) · `preset_block?` (CHECK ← the **existing** `PRESET_BLOCK` tuple,
   `knowledge.ts:30-39`, 7 values — reuse, no new tuple; E2) · `max_session_minutes?`. `[FACT: ADR-002 L2781; SS-9; knowledge.ts:30]`
4. **`availability_exceptions`** (PK `id`, `reason [E]`): `exception_date` (YYYY-MM-DD) · `is_available` ·
   `reason [E]` · `start_time?`/`end_time?`. `[FACT: ADR-002 L2809; SS-9]`
5. **`study_plan_batches`** (PK `id`, `name [E]`): `name [E]` · **`scope_type?`/`scope_id?`** `[INTERP` — the
   *intent* "widen scope beyond course (G5)" is FACT (structure-data.md:56) + the `course_id REFERENCES courses` FK is
   dropped by no-FK BR-S2; the `scope_type`/`scope_id` *column shape* is my realization mirroring the platform-wide
   polymorphic `resource_type/id`·`entity_type/id` convention, not a quoted DDL shape`]` · `status` (CHECK ←
   `STUDY_PLAN_BATCH_STATUS` **+ `failed`**) · `total_sessions` (DEFAULT 0) · `generated_at?` · `approved_at?`.
   `[FACT: ADR-002 L2831 (base cols); structure-data.md:56 (G5 intent); business-rules.md:89 (failed) | INTERP: scope_type/scope_id column shape]`
6. **`session_templates`** (PK `id`, `name [E]`): v2 cols (`name [E]` · `work_minutes` · `short_break_minutes` ·
   `long_break_minutes` · `intervals_before_long_break` · `auto_start_breaks` · `auto_start_work` · `is_default`) **+
   v1 restores (structure-data.md:58):** `focus_technique?` · `description?` `[INTERP: [E]` — free-form user text, no
   v2 DDL column exists to cite a marker; encrypt by nature, consistent with `name [E]``]` · `notifications?` ·
   `sounds?` · `usage_count` (DEFAULT 0) · `last_used_at?`. `[FACT: ADR-002 L2894 (v2 cols); structure-data.md:58 (v1-restore field list) | INTERP: description [E]]`

### §P3.2 — Enum + registry + cross-group
- **E1 · `STUDY_PLAN_BATCH_STATUS += 'failed'`** — **edit the existing tuple** (`@vida/types/knowledge.ts:41`); the
  shipped validator `StudyPlanBatchStatusSchema = z.enum(STUDY_PLAN_BATCH_STATUS)` (`validators/knowledge.ts:19`)
  auto-flows the new member (single source — do NOT add a new validator). Grounded in `business-rules.md:89` (terminal
  state). `[FACT: knowledge.ts:41; validators/knowledge.ts:19; business-rules.md:89]`
- **E2 · `preset_block` — REUSE the existing `PRESET_BLOCK` tuple (gate-2 finding #1 — my gate-1 "grep clean" was
  FALSE).** `PRESET_BLOCK` **already exists** at `@vida/types/knowledge.ts:30-39` with the exact 7 values
  (`early_morning · morning · late_morning · afternoon · late_afternoon · evening · night`), its validator
  `PresetBlockSchema = z.enum(PRESET_BLOCK)` ships at `validators/knowledge.ts:18`, and the `StudyAvailability`
  interface already consumes it (`knowledge.ts:219`). → **No `@vida/types` change.** The `study_availability.preset_block`
  SQL CHECK sources from the existing tuple; the only Phase-4 action is the **enum-parity row**. (Do NOT author a
  duplicate in a Sessions-domain file — that would be a two-source-of-truth violation.) `[FACT: knowledge.ts:30-39,219; validators/knowledge.ts:18; matches ADR-002 L2788-2791]`
- **E3 · `ENTITY_TYPES += 'session'`** (`_registry.ts`) — the base session becomes a valid polymorphic link/attach
  target (AR-5 never appended it). Sub-types are addressed via the base `session_id`, so **only `session`** is
  appended (not `study_session`/`focus`), unless a Phase-4 grep finds a live `study_session` link target. `[FACT: _registry.ts:5-25; ADR-004 §3.1 (base = identity)]`
- **X1 · Cross-group flag → group #2 (Preferences).** PD-7's **global** config on `user_preferences` —
  `auto_start_breaks` · `auto_start_next_interval` · `show_notifications` · `play_sounds` — is **absent** from the
  shipped `013_preferences` (only the 4 `pomodoro_*` interval cols landed). These are **Preferences-owned** (single-writer,
  BR from group #2), NOT this unit's tables. Record as a **group #2 backfill defect**; since the `db-4` branch is
  unreleased, it folds into `013` or a small additive migration — Preferences' call, not group #3's. (`session_templates`
  carries its own per-preset `auto_start_*`; the global default layer is what's missing.) `[FACT: pomodoro business-rules PD-7; grep 013_preferences.ts 2026-08-19]`

### §P3.3 — Files, migration, tests
- **Migration** `migrations/014_sessions_scheduling.ts` (hand-written SQL, header-commented like `013`), registered in
  `runner.ts` `ALL_MIGRATIONS` (→ version 14). `up()` must NOT open its own transaction (runner wraps it).
- **Drizzle mirrors:** append availability/exceptions/batches/`session_templates` to `foundation/scheduling.ts`
  (co-located with `planned_blocks`); new `foundation/session-extensions.ts` for `study_sessions` + `focus_sessions`
  (the two session-keyed extensions). Export from `schema/index.ts`. Exact split is a mirror detail — the SQL is authority.
- **Tests:** `enum-parity.test.ts` rows for every new FIXED TEXT-CHECK column (`resource_type`, `type`, `status`
  ×batch/pomodoro, `preset_block`); the runner test auto-covers "migration applies"; **Phase-5 DDL-introspection parity**
  (`PRAGMA table_info`) diffs each real table vs the Drizzle mirror + `@vida/types` interface on nullability/default/
  column-set/type (the mandatory bookend — caught the group-#2 `time_format` type-lie).
- **`@vida/types` interface reconcile → DB-11** (mirror-only now; group #1 `entity_links`/`EntityLink` precedent). The
  **complete DB-11 ledger for this unit** (gate-2 finding #3 — name them all so the reconcile isn't lopsided):
  - `PomodoroSession` (`note.ts:162`) — pre-reframe `entity_type`/`page_id`; the `focus_sessions` table drops them (+ the
    `POMODORO_*` enums re-home from `note.ts` to the Sessions realm, R3).
  - `StudyPlanBatch` (`knowledge.ts:237`) — still carries `course_id: Id | null`; the table replaces it with
    `scope_type`/`scope_id` (G5 widen). A dropped column + two new — larger than a rename.
  - `StudySession` (`learning.ts:216`) — still carries the spine fields (`focus_rating`/`energy_level`/
    `distraction_count`/`duration_minutes`/`started_at`/`ended_at` + `key_learnings`) that the extension drops to the
    `sessions` spine (BR-S1).
  `[FACT: note.ts:162; knowledge.ts:237; learning.ts:216,220-222; [[stale-source-plus-live-convention-is-fact-not-a-decision]]]`

### §P3.4 — Plan checklist (pre-critique)
- [x] 6-table DDL from the §5.20 ledger + v2 columns − spine (BR-S1) · [x] 2 reconciliations cited (R1 focus, R2 [E]) ·
  [x] enum `+failed` + `preset_block` tuple source + `ENTITY_TYPES += session` · [x] PD-7 cross-group backfill flagged ·
  [x] migration/mirror/test layout · [x] interface reconcile deferred to DB-11 · [ ] **gate-1 `/critique`** (next) ·
  [ ] Approval 1 · [ ] preflight · [ ] gate-2 `/critique` · [ ] Approval 2.

### §P3.5 — Gate-1 critique verdict (independent) → REVISE → resolved
Independent adversarial critic verified every load-bearing citation vs the ADRs/specs/on-disk truth. Verdict **REVISE**
(DDL/enum/[E]/migration/registry/cross-group all verified correct). ⚠ **The critic ALSO validated a manufactured fork**
on R1 (pushed "treat focus_sessions/pomodoro_sessions as an open build-decision to surface") — Victor caught it: there
is **no decision**; the reframe docs (`notes-and-pages/structure-data.md:30`, `contract.md:19`) settle it to
`focus_sessions` (pomodoro_sessions RETIRED). Lesson: cross-check a critic's "this is a decision" against the reframe
docs too ([[verify-a-critiques-escalation-and-defer-target-before-relaying]]). Blockers, all cleared:
1. **R1 — corrected twice → final FACT (§P3.0 R1 + R3):** `focus_sessions` IS the `focus` extension = timer runtime;
   `pomodoro_sessions` is a RETIRE. **6 tables, zero decisions.** (My first pass collapsed into `pomodoro_sessions`
   [wrong name]; the critic pushed "keep both as a build-decision" [wrong]; the reframe docs settle it.) ✅
2. **Stale Phase-1 BR-S6** ("only one `[E]`/7 tables") → **struck + pointed at §P3.0 R2** (§2 BR-S6). ✅
3. **Three `[FACT]`→`[INTERP]` downgrades** — `study_plan_batches.scope_type/scope_id` shape, `session_templates.
   description [E]`, and `preset_block` needs `PRESET_BLOCK` authored into `@vida/types` before parity-claim. ✅
Post-revision: **every element of group #3 is doc-determined (FACT-cited)** — no build-decision remains.

### §P3.6 — Approval 1 ✅ (Victor, 2026-08-19)
6-table model approved (zero decisions; `focus_sessions` = timer runtime, `pomodoro_sessions` RETIRED). → preflight → gate-2.

### §P3.7 — Preflight → BLOCKED (1 gap) → resolved
Ran against `docs/infrastructure/database-layer/current-{spec,business-rules}.md`. All layers specified (DB-only unit:
6 tables, ops = migration DDL + Drizzle query mirror; no frontend/endpoint/auth surface). **1 BLOCKER found + fixed:**
- **G-P1 · Extension PK contradicted BR-DB-1.** The plan's `PK = session_id` (no `baseColumns`) contradicts BR-DB-1
  (`current-business-rules.md:9` "PK = `id` UUIDv7 client-generated") + the repository factory (`:51-52` generates `id`,
  forbids caller ids). A `session_id`-PK table can't persist via the standard Repository. **Resolved (§P3.1):**
  extensions use full `...baseColumns` (own `id` PK) + `session_id TEXT NOT NULL UNIQUE` (the 1:1 key). ADR-004 §3.1
  "keyed by session_id" = a key column, not a PK override. ✅
**Assumptions if implemented now (all doc-grounded, low-risk):** (a) column nullability/defaults for `focus_sessions` +
`session_templates` follow the v2 DDL + v1-restore convention (e.g. `type`/`status` NOT NULL, `completed_count`/
`total_pause_seconds`/`was_interrupted` NOT NULL DEFAULT 0, `usage_count` DEFAULT 0); (b) `session_templates.description`
+ `study_plan_batches.scope_type/scope_id` are `[INTERP]` (flagged §P3.1); (c) `session_id` UNIQUE index doubles as the
1:1 lookup. **VERDICT: PASSED** (after G-P1 fix) — ready for gate-2.

### §P3.8 — Gate-2 critique (independent, post-preflight) → REVISE → resolved
Second independent critic verified the corrected model against the ADRs, reframe docs, and on-disk source. Confirmed:
R1/R3 doc-determined (not a reopened decision); extension PK fix correct vs BR-DB-1; `[E]` set = exactly 4; no spine
field re-duplicated; `session_effects` correctly absent; migration/registry/X1/DB-11 scoping sound; 7→6 correction
internally consistent. Verdict **REVISE** — 1 material + 2 nits, all cleared:
1. **[MATERIAL] `PRESET_BLOCK` already exists** (`knowledge.ts:30-39` + `PresetBlockSchema` `validators/knowledge.ts:18`)
   — my gate-1 "grep clean → author it" was a **fabricated-clean citation** (faulty grep). **Fixed:** E2 now REUSES the
   shipped tuple (no `@vida/types` change; parity-row only). Supersedes the gate-1 §P3.5 blocker-#3 "author PRESET_BLOCK"
   note. ✅
2. **[NIT] `STUDY_PLAN_BATCH_STATUS += 'failed'`** edits the existing tuple; `StudyPlanBatchStatusSchema` auto-flows —
   E1/P-R3 clarified (not a new validator). ✅
3. **[NIT] DB-11 ledger was lopsided** (named only `PomodoroSession`) → §P3.3 now names `StudyPlanBatch`
   (`course_id`→`scope_type/scope_id`) + `StudySession` (spine fields) too. ✅
Post-revision: **VERDICT clean SHIP** — no schema-shape change, no reopened decision, no remaining overclaim.

### §P3.9 — Approval 2 ✅ (Victor, 2026-08-19) → Phase 4 (implement)

## Phase 4 — Implement (DONE)
Authored strictly from the approved §P3 plan:
- **`@vida/types/knowledge.ts`** — `STUDY_PLAN_BATCH_STATUS += 'failed'` (existing tuple; `StudyPlanBatchStatusSchema` auto-flows).
- **`migrations/014_sessions_scheduling.ts`** — hand-written SQL for the 6 tables (registered in `runner.ts` → v14).
- **`schema/foundation/session-extensions.ts`** (new) — `study_sessions` · `focus_sessions` Drizzle mirrors (own `id`
  PK + `session_id UNIQUE`).
- **`schema/foundation/scheduling.ts`** (appended) — `study_availability` · `availability_exceptions` ·
  `study_plan_batches` · `session_templates` mirrors.
- **`schema/_registry.ts`** — `ENTITY_TYPES += 'session'`. **`schema/index.ts`** — export the new module.
- **`validators/enum-parity.test.ts`** — +5 fixture rows, migration014 applied.
- **`PRESET_BLOCK` reused** (no `@vida/types` change). No `pomodoro_sessions` table (RETIRED, R3).

## Phase 5 — Foundation-soundness verify (DONE)
- **DDL-introspection parity (mandatory bookend)** — `db/tests/sessions-scheduling-introspection.test.ts` applies `014`
  in-memory (better-sqlite3 + `PRAGMA table_info`) and diffs each of the 6 tables vs the Drizzle mirror on all 4 flow-doc
  dimensions: **column-set · nullability · PK · default** (24 cases). Nullability logic handles SQLite implicit-PK-NOT-NULL
  and fails on drift in BOTH directions (post-impl critic verified discriminating power). Interface (`@vida/types`)
  divergences are the DB-11 deferrals, cited not asserted.
- **Independent post-impl critique → SHIP** — verified SQL↔mirror exact parity (column/nullability/type/default), BR-DB-1
  extension PK, spine non-duplication, exactly-4 `[E]`, all 5 CHECK sets ≡ tuples, migration mechanics. One nit (defaults
  untested) → **closed** by adding the default-parity check above.
- **§XXIX Currency promoted** (same session): `database-layer/current-spec.md` (group #3 table + row) +
  `current-business-rules.md` (BR-S4-1…10).
- **Foundation-readiness — PASS.** Downstream consumers find every table/column: MOD-sessions (#139) — spine (AR-5) +
  `study_sessions`/`focus_sessions` extensions + planner (`study_availability`/`availability_exceptions`/
  `study_plan_batches`/`session_templates`) + aggregator (`planned_blocks`, DB-3); MOD-notes `/pomodoro` widget —
  `focus_sessions` keyed by `session_id`. No gap.
- **Green:** `@vida/core` **221 tests** (+5 parity, +24 introspection) · typecheck **11/11** · lint **0-err** ·
  `LATEST_VERSION`=14.

### Deferred / cross-group (tracked, not this unit)
- **X1 → group #2 (Preferences):** PD-7 global config backfill (`auto_start_breaks`/`auto_start_next_interval`/
  `show_notifications`/`play_sounds`) on `user_preferences`.
- **DB-11 interface reconcile:** `PomodoroSession` (entity_type/page_id) · `StudyPlanBatch` (course_id→scope) ·
  `StudySession` (spine fields).

**Group #3 COMPLETE.** 3 of 22 DB-4 groups done; 19 remain. Next = group #4 Tasks.







