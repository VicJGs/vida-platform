# DB-3 — Stream (i) Substrate Schema · Unit Spec

> **Unit:** the M1.0 schema-foundation substrate build (the 11 remaining ADR-002 §5.20 Stream (i) ADD tables +
> session sub-type extensions + column-level AMENDs + the RETIRE reconcile).
> **Issue:** LIF-65 · M1/M1.0 `#9` · profile **add-backend-component** · ← DB-1 ✅.
> **Flow:** the 5-phase lifecycle in `docs/roadmap/schema-foundation-build-flow.md §2`. **This file = Phase 1 (Intent
> intake).** Phase 2 (current-state) + Phase 3 (plan double-gate) append their sections below.
> **No-Guessing:** every claim `[FACT: src]` / `[INTERP]` / `[UNKNOWN]`. Ship-scope trimming is **forbidden in Phase 1**
> — a foundation intakes the WHOLE documented intent so nothing is silently omitted
> (`[[intake-captures-intent-not-ship-scope]]`).

## §0. Source model

Backend schema unit — the frontend source-of-truth guard (`docs/specs/foundation/frontend-source-of-truth.md`) is
**N/A** (no DS/UI/UX token surface). The source of truth here is **ADR-002 §5.20 Stream (i)** (the enumerated ADD /
RETIRE / AMEND ledger), cross-checked against each amending ADR (ADR-004/005/009/011/012) for column shape.

## §1. Identity — what this unit is

DB-3 authors the **Stream (i) substrate schema** as a self-contained, gated M1.0 foundation build (Model B, decided
2026-08-18). The substrate is the spine DB-4 (per-domain) and every M1.1+ module hangs off. 11 of the §5.20 Stream (i)
ADD line-items are already authored (AR-5/6/7 → `schema/foundation/{sessions,spaces,effects,capability,economy}.ts`,
migrations 002–006); **this unit authors the 11 remaining substrate ADD tables**, reconciles the RETIRE set, and
classifies the session sub-type extensions + column-level AMENDs (author-now vs defer). `[FACT: schema-foundation-build-flow.md §3]`

**Boundary (what DB-3 is NOT):**

- **NOT** the per-domain module tables — that is **DB-4** (Stream (ii), the 19+ `structure-data.md` docs). `[FACT: §5.20 Stream (ii)]`
- **NOT** the sync-column/HLC AMENDs (`_sync_field_ts`, HLC representation) — that is **DB-2** (ADR-003 §17), re-homed to M4. `[FACT: _index.md db-2 row]`
- **NOT** encryption wiring (DB-5 / M3) or FTS5 (DB-8).
- Authoring model: **hand-written SQL migrations** (ADR-016 §3.5 — no drizzle-kit) + Drizzle query-mirror modules + `ENTITY_TYPES` appends.

## §2. Business Rules (inherited invariants — the intake honors these)

Every ADD table DB-3 authors is a normal **syncable** table upholding `database-layer/current-business-rules.md`
invariants #1–#9 (UUIDv7 PK · Unix-ms timestamps · INTEGER bool/money · TEXT enums with SQL `CHECK` + Zod · the 6
`_sync_*` columns · polymorphic `entity_type` from `_registry.ts` · soft delete · three-layer encryption) **unless** the
amending ADR marks it device-local/non-synced. `[FACT: database-layer/current-business-rules.md]`

- **BR-DB3-1 — device-local exception.** `applied_effects` is local-only (dedup ledger, `sync_queue` precedent — no
  `baseColumns`/`syncColumns`). Any DB-3 table the ADR marks local-only follows that precedent, not the syncable default. `[FACT: §5.20; effects.ts]`
- **BR-DB3-2 — `[E]` field marking.** Fields the ADR marks `[E]` (e.g. `templates.name`, `values.name/description`,
  `contribution_notes`) are declared in the `[E]` set for M3 activation; in M1.0 the repository's pass-through runs over
  the empty active set (BR-DB6-3), so marking them now is inert-but-correct. `[FACT: repository.ts; ADR-017:20]`
- **BR-DB3-3 — polymorphic FK CHECKs from the registry.** `contributions` (`goal_type`/`contributor_type`),
  `plan_steps` (`owner_type`), `store` (`ref_type`) author their CHECK from `ENTITY_TYPES` / a scoped enum, appended in `_registry.ts`. `[FACT: _registry.ts pattern]`
- **BR-DB3-4 — RETIRE = absent, not migrated-away.** The v2 surface is authored from zero (no v1 rows exist locally in
  M1.0), so RETIRE = **verify the superseded table/column never appears in `schema/foundation/`**, not a data migration. `[FACT: storage-rebuild-strategy]`

---

## §3. Intent ledger (Phase 1 intake — the FULL §5.20 Stream (i) set)

### 3a. The 11 remaining ADD tables (the core of DB-3)

`[FACT: ADR-002 §5.20 Stream (i) ADD; shapes cross-checked to the amending ADR]`

| #   | Table             | ADR              | Sync?    | Shape (from §5.20 + ADR)                                                                                                                                                                                                                                                                                                    | Readiness                                                              |
| --- | ----------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `planned_blocks`  | ADR-004 §3.1     | syncable | aggregator-scheduled time blocks (the Study-Planner replacement engine's output)                                                                                                                                                                                                                                            | ⏳ shape-open — resolve cols from ADR-004 §3.1 in P3                   |
| 2   | `templates`       | ADR-009          | syncable | `id · name [E] · serialized bundle [E]` — light store                                                                                                                                                                                                                                                                       | ✓ shape-locked                                                         |
| 3   | `review_curves`   | ADR-005          | syncable | Knowledge generic-review-engine curve config                                                                                                                                                                                                                                                                                | ↔ confirm cols vs `docs/features/knowledge/structure-data.md` in P2/P3 |
| 4   | `method_bindings` | ADR-005          | syncable | binds a study method to a reviewable                                                                                                                                                                                                                                                                                        | ↔ confirm cols vs Knowledge structure-data                             |
| 5   | `review_events`   | ADR-005          | syncable | generic review-event log (supersedes `flashcard_reviews`)                                                                                                                                                                                                                                                                   | ↔ confirm cols vs Knowledge structure-data                             |
| 6   | `values`          | ADR-011 PG4      | syncable | core-beliefs layer above purposes: `name [E] · description [E] · sort_order`                                                                                                                                                                                                                                                | ✓ shape-locked                                                         |
| 7   | `contributions`   | ADR-011 PG7/PG10 | syncable | polymorphic weighted goal-edge: `goal_type · goal_id · contributor_type · contributor_id · contribution_percentage · contribution_notes [E]` (Purpose-domain, **not** a Spaces primitive)                                                                                                                                   | ⏳ resolve enum sets in P3                                             |
| 8   | `purpose_reviews` | ADR-011 PG3      | syncable | alignment/fulfillment loop: `still_aligned · fulfillment_rating · clarity_rating · renewed_commitment · …[E]`                                                                                                                                                                                                               | ✓ shape-locked                                                         |
| 9   | `plan_steps`      | ADR-011 PG5      | syncable | lightweight DOC layer on task/target: `owner_type · owner_id · title [E] · note [E] · order · is_completed` (not a tracked entity)                                                                                                                                                                                          | ⏳ confirm owner enum in P3                                            |
| 10  | `store`           | ADR-012          | syncable | **shape-open in-source** (Finance-owned): nestable storage layer `parent_id (self-nest) · node_kind{group,wrapper} · (wrapper) ref_type{account,investment,asset}/ref_id · name [E] · is_locked · dream_id?/purpose_id? · currency overlay`; canonical single-parent (no double-count); existing Finance entities UNTOUCHED | ⏳ **P3 resolves DDL from ADR-012 intent**                             |
| 11  | `rules`           | ADR-012          | syncable | **shape-open in-source** (headless-automation): ADR-011 binding-ref (condition) + typed-consequence set + (user-authored) ADR-010 grant; NOT an ADR-008 render-Block                                                                                                                                                        | ⏳ **P3 resolves DDL from ADR-012 intent**                             |

**Ledger corrections vs the earlier drifted "11 missing" list** `[FACT: §5.20]`: **+`values`** (an owed Stream (i) ADD,
was omitted); **+`review_events`** replacing the drifted **`topic_reviews`** (which is per-domain / DB-4, not
substrate); **−`measurement`** (a column-level AMEND, see 3c — not a table).

### 3b. Session sub-type 1:1 extensions (§5.20: "some settle at build" — P3 decides each)

`reading_sessions` · `class_sessions` · `workout_sessions` · `work_sessions` · `study_sessions` (redefined as a 1:1
extension, not the retired flat table) · `focus_sessions`. Each is a 1:1 extension keyed by `session_id` off the
`sessions` spine (ADR-004 §3.1). **Phase 3 decides per table: author now (substrate) vs defer to its consuming domain
(DB-4/M1.1)** — the decision is recorded, never silently dropped. `[FACT: §5.20 ADD "…etc — some settle at build"]`

> **[INTERP]** likely default: defer the domain-heavy extensions (`class_sessions`, `reading_sessions`,
> `workout_sessions`) to their DB-4 domain group, author only those a substrate consumer needs. P3 confirms against the
> ADR-004 integration-contract. `[UNKNOWN until P3]`

### 3c. Column-level AMENDs (§5.20 AMEND — P3 classifies each: DB-3 · other-issue · build-deferred)

`[FACT: ADR-002 §5.20 AMEND table]` — many are **owned by other issues**; DB-3's job is to classify, apply the ones it
owns, and record the deferral home for the rest.

| Amend                                                                                                                     | Owner                  | Disposition (intake — P3 confirms)                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| `_sync_field_ts` on every syncable table                                                                                  | **DB-2** (ADR-003 §17) | **NOT DB-3** — re-homed to M4; DB-3 tables get it when DB-2 lands                             |
| HLC representation of `_sync_lww_ts`/`_sync_field_ts` + HLC-state home                                                    | **DB-2 / F6**          | **NOT DB-3**                                                                                  |
| `effect_event_id` on effect-triggering rows; UNIQUE on effect-output rows                                                 | ADR-004 F1             | ↔ partly authored (economy handlers); P3 checks DB-3's ADD tables that trigger/output effects |
| `measurement_kind` + `binding_mode` on pursuable entities                                                                 | ADR-011 §3.1/§3.5      | **cross-cutting → per-domain (DB-4)**; the contract is locked, not per-table DDL here         |
| nullable-progress override slots (`purposes.progress`, `targets.current_value` → NULL=derive)                             | ADR-011 §3.2           | **on per-domain tables → DB-4**                                                               |
| `targets.purpose_id` nullable; restore `targets.success_criteria[E]`/`measurement_method`; `purpose_metrics.*`            | ADR-011                | **on per-domain tables → DB-4**                                                               |
| `category_bidx` blind index on transactions                                                                               | F7/D7                  | **on the Finance domain table → DB-4**                                                        |
| `user_profile` split by single-writer                                                                                     | ADR-012 §3.10          | **on Gamification/Preferences tables → DB-4**                                                 |
| `achievements.condition` → measurable predicate; `level` derived                                                          | ADR-012 §3.7/§3.8      | **on Gamification tables → DB-4**                                                             |
| `notifications` delivery-audit; `import_staging`/`connection_config`; `ai_connections`; Fiscal&Legal; device `push_token` | ADR-013/014/015        | **per-domain / server → DB-4 or later**                                                       |

> **[INTERP]** Net: **DB-3 owns ~0 of the AMENDs directly** — they land on per-domain tables (DB-4) or are DB-2/M4.
> DB-3's AMEND duty is to **classify + record the home**, and to ensure its own 11 ADD tables carry the standard `_sync_*`
> set (minus `_sync_field_ts`, which DB-2 adds platform-wide). P3 confirms this reading. `[UNKNOWN until P3]`

### 3d. RETIRE reconcile (§5.20 RETIRE — verify absent from the v2 surface)

`[FACT: §5.20 RETIRE table]` DB-3 verifies **none** of these exist in `schema/foundation/` (BR-DB3-4):
flat `study_sessions` (Learning-only) · §5.11 flat Study Planner (`study_availability`, `availability_exceptions`,
`study_plan_batches`, `scheduled_study_sessions`, `session_templates`) · `flashcard_decks` · `flashcard_reviews` ·
SM-2 columns on `flashcards`/`study_topics` · `page_tags` · INTENDED `task_views` · `purpose_habits`/`purpose_routines`/
`purpose_projects` · `xp_history`. _(Most are per-domain and simply never authored in v2; the substrate-adjacent ones —
`study_planner` engine → `planned_blocks`, `xp_history` → `consequence_ledger`, `page_tags` → `entity_tags` — are
already superseded by authored substrate. P2 confirms absence.)_

## §4. Acceptance (this unit is Done when)

- [ ] All 11 remaining Stream (i) ADD tables authored (hand-written SQL migration 007+ + Drizzle module + `ENTITY_TYPES` appends), each upholding §2 invariants or its ADR's device-local exception.
- [ ] `store` + `rules` DDL resolved from ADR-012 intent (P3), cited — not guessed.
- [ ] Session sub-type extensions: each author-now/defer decision recorded with rationale.
- [ ] Column-level AMENDs: each classified (DB-3 / DB-4 / DB-2-M4) with its home recorded.
- [ ] RETIRE set verified absent from `schema/foundation/`.
- [ ] Migration is atomic + forward-only (BR-DB7-3), registered in the runner; green: `@vida/core` tests + root typecheck + Zod parity (DB-9 pattern).
- [ ] **Foundation-soundness (P5):** `current-spec.md` + `current-business-rules.md` promoted; a representative downstream consumer (e.g. DB-4 Purpose domain needs `values`/`contributions`/`purpose_reviews`/`plan_steps`) finds every table it needs, documented.

## §5. Implementation Prompt

**Deferred to Phase 3** (the PLAN double-gate) → the `sessions/IMPLEMENTATION-PLAN-*.md`. Phase 1 (this intake) does not
author schema; Phase 2 reads current-state; Phase 3 plans what & how (resolving every ⏳/↔ above) through
critique→Approval 1→preflight→critique→Approval 2; Phase 4 implements strictly from the approved plan.

---

## Phase 2 — Current-state read (verified on disk 2026-08-18)

`[FACT: grep over packages/core/src/db/schema/foundation/**]` — reconcile-and-extend baseline, never from-zero.

**The 11 remaining ADD tables — all ABSENT ✗** (DB-3 authors each): `planned_blocks` · `templates` · `review_curves` ·
`method_bindings` · `review_events` · `values` · `contributions` · `purpose_reviews` · `plan_steps` · `store` · `rules`.

**Already authored (context — the 15 substrate tables done by AR-5/6/7, migrations 002–006):** `sessions`(+`session_type_registry`,
`session_attachments`) · `tags` · `entity_tags` · `entity_links` · `spaces` · `space_enabled_blocks` · `views` ·
`applied_effects` · `capability_definitions` · `block_instances` · `capability_grants` · `currencies` · `consequence_ledger`.
Plus `sync_queue` (DB-6) + `app_state` (DB-7). Next migration = **007**.

**RETIRE set — all absent ✓** from the v2 surface (BR-DB3-4 satisfied at baseline). The only hit, `xp_history` in
`economy.ts:3`, is a **supersession comment** ("consequence_ledger … the generalized xp_history"), not an authored
table — verified. No RETIRE reference to remove.

**Session sub-type extensions — none authored ✗** (expected; P3 decides author-now vs defer per sub-type).

**Baseline verdict:** clean greenfield for all 11 ADD tables; no divergent/partial authoring to reconcile; the RETIRE
reconcile is already satisfied. DB-3 is purely additive (migration 007+). The only open work before implementation is
P3's shape resolution (`store`, `rules`, `planned_blocks`, `contributions`/`plan_steps` enums, `review_*` columns) + the
session-sub-type + AMEND classification decisions.

<!-- Phase 3 (plan double-gate) appends its PLAN + IMPLEMENTATION-PLAN sections when it runs (own session split). -->
