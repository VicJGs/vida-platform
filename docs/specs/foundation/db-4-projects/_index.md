# DB-4 · Domain Group #5 — Projects · Unit Spec

<!-- Forward spec for DB-4 group #5 (Projects). Per-domain schema authoring under the schema-foundation
     5-phase lifecycle (docs/roadmap/schema-foundation-build-flow.md §2). No-Guessing: every claim is
     [FACT: src] / [INTENT: src] / [UNKNOWN]. Authored 2026-08-19 (branch db-4-per-domain-schema). -->

- **Unit:** DB-4 group #5 — Projects (`projects` · `milestones` · `deliverables` · `project_documents`)
- **Profile / scenario:** add-backend-component / Default (schema-foundation build)
- **Blocked by:** DB-3 substrate (consumed by reference: `entity_tags`, `pages`, `entity_links`, `contributions`)
- **Intent source:** ADR-002 §5.4 (FACT floor) + §5.20 Stream (ii) + the 5 `docs/features/projects/` aspects + ADR-011
- **Precedent:** group #4 Tasks (`schema/tasks.ts` · `migrations/015_tasks.ts`) — the pursuable-column pattern

---

## §0. Source model

Frontend/code-first interim; documented intent is the source of truth (`docs/specs/foundation/frontend-source-of-truth.md`).
This unit authors **backend schema only** — no rendered surface, no Visual Gate. The intent is closed by the docs
(No-Decisions Gate); Phase 3 is a straight authoring plan.

---

## §1. Identity — what this unit is

The Projects domain schema in the v2 surface: a **four-level hierarchy** (Project > Milestone > **Deliverable** >
Task) + a confidential **document vault**, authored per-feature (ADR-016 §3.5). `projects`/`milestones`/
`project_documents` are the ADR-002 §5.4 FACT floor; **`deliverables`** is the build-phase INTENDED addition (G2) —
the real level between milestones and tasks, an ADR-011 **pursuable**. `[FACT: ADR-002 §5.4; INTENT: structure-data.md G2]`

### Scope boundary — doc-FIXED (substrate owns the shared primitives, not a decision)

- **Tags** are NOT here → `entity_tags` (`entity_type='project'`; inline `projects.tags` RETIRED, PJ-12/G11).
- **Notes + vision/mission pages** are NOT here → `pages` (`entity_type` ∈ project/milestone/deliverable; mission is a
  **page**, not a column — PJ-7/G3/G10).
- **Tasks** are NOT here → owned by group #4 `tasks` (reached via a service, PJ-5); Projects authors no task table.
- **Purpose rollup** is NOT here → `contributions` (DB-3 substrate; retired `purpose_projects`, M7).
- **Progress derivation, measurement-source seam (M5/R7), DAG guard** are SERVICES (ADR-011) — not schema.

### Boundary — what this unit is NOT (scoped to partner domains, doc-cited)

| Not authored here                                                | Home                                                                    | Cite                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| `project_contacts(role)`                                         | **Relationships**                                                       | contract.md:30 "via the Relationships contract"     |
| `project_habits`                                                 | **Habits** (kept junction)                                              | habits/contract.md:40,47 · habits/conventions.md:55 |
| project events / project↔account                                 | integration **seams** (no events/calendar table exists; `entity_links`) | contract.md consumed-via-contract                   |
| `contributions` (purpose rollup)                                 | **Purpose / DB-3** substrate                                            | §5.20 Stream (i); ADR-011                           |
| External ingest (ADR-014) · AI (ADR-015) · R2 pipeline (ADR-003) | Layer-3 services                                                        | PJ-11; ADR-003                                      |

---

## §2. Business Rules (inherited invariants — the intake honors these)

- **PJ-1 — Encrypted content [E]:** `projects.title/description/vision`, `milestones.title/description`,
  `deliverables.title/description`, `project_documents.name/encrypted_blob`. Config (scope/complexity/status/priority/
  dates/progress/color/icon) is plaintext. `[FACT: ADR-002 §5.4 [E]; project.ts @encrypted]`
- **PJ-2 — Four-level hierarchy:** Project > Milestone > Deliverable > Task. Milestones nest
  (`parent_milestone_id`); deliverables sit under a milestone; tasks point up via Tasks' refs. `[INTENT G2]`
- **PJ-3 — Progress is a nullable override slot.** `projects.progress`/`milestones.progress`/`deliverables.progress`
  are `INTEGER` **nullable** (`NULL ⇒ derive` via `progress()` on-read); never `NOT NULL DEFAULT 0`. `[INTENT M3 — ADR-011 §3.2/§3.4]`
- **PJ-3b — DOWN nesting weight is a per-child column** (`nesting_weight`, `NULL ⇒ equal-weight`) on the rollup
  children (`milestones`, `deliverables`; `tasks` already has it). Not on `projects` (top-level; UP ladder uses
  `contributions.contribution_percentage`). `[INTENT M4 — ADR-011 §3.3]`
- **PJ-4 — A deliverable carries `measurement_kind` + `binding_mode`; projects/milestones do not.** The projects
  aspect docs (Stream ii — the authoritative per-table roster for DB-4) attach the pair to `deliverables` ONLY, in
  all 5 files (`structure-data.md:21,24-27`, `business-rules.md:21-28`, `identity.md:18-21`, `conventions.md:8-11,34`,
  `contract.md:17`); they frame `projects`/`milestones` as **pure bottom-up rollups** (`business-rules.md:18-20`,
  `conventions.md:6`) whose `measurement_kind` is implicitly `milestone`. A project measured by "$ raised" expresses
  that as a _financial deliverable under it_ (PJ-4.1), never on the project row. ADR-011 §3.4 (`ADR-011:57`) is
  satisfied — it requires a pursuable to _declare_ a kind, which a rollup declares implicitly; it does not mandate a
  stored column on every pursuable. §5.20:3816's "**Projects/Deliverables**" is the amend-locus grouping (the
  Projects-domain pursuable = the deliverable), not a per-row mandate. The Tasks precedent is consistent: a task
  carries the pair (`tasks.ts:67`) because its measure _varies_ (a leaf can be quantitative/rate/event-triggered);
  the module doc — not an ADR grouping-notation or a broad §3.4 list — is the DB-4 table roster and closes this.
  The bespoke `measurement_type` enum is retired. `[FACT: structure-data.md:21,24-27; ADR-011 §3.4; §5.20:3816]`
- **PJ-8 — Documents are a secure vault.** `project_documents` stores client-encrypted files; small inline
  (`encrypted_blob`), large → R2 (a service seam). `[FACT: ADR-002 §5.4; INTENT G6/ADR-003]`
- **PJ-9 — Cascade & integrity are app/sync-layer (no-FK).** All cross-table refs are plain TEXT (BR-DB3-1);
  project→milestones/documents cascade + milestone→sub-milestone/document SET NULL + deliverable reparent are
  enforced by the app/sync layer, not SQL FKs. Soft-delete hides (`projects`/`milestones`). `[FACT: §5.4; BR-DB3-1]`
- **PJ-12 — Local-first, LWW on structured columns.** `[FACT: ADR-003]`

### Enum CHECK sets (schema-relevant, all FIXED → SQL CHECK)

- `projects.scope` ∈ PROJECT_SCOPE (4) · `projects.complexity` ∈ PROJECT_COMPLEXITY (4)
- `{projects,milestones}.status` ∈ STATUS (5) · `projects.priority` ∈ PRIORITY (5)
- `deliverables.measurement_kind` ∈ MEASUREMENT_KIND (4) · `deliverables.binding_mode` ∈ BINDING_MODE (3, nullable)
- All tuples **already exist** in `@vida/types` (`project.ts`, `common.ts`, `measurement.ts`) — **no net-new enum**.

---

## §3. Intended shape — the 4 tables (FACT floor + INTENDED, cited)

### §3a. `projects` — the project `[FACT: ADR-002 §5.4 L1561-1596]`

`...baseColumns` · `title[E]` NN · `description[E]` · `vision[E]` · `scope` CHECK dflt 'personal' ·
`complexity` CHECK dflt 'moderate' · `status` CHECK NN dflt 'not_started' · `priority` CHECK NN dflt 'medium' ·
**`progress` INTEGER nullable** (0-100 override slot — was `NOT NULL DEFAULT 0`; ADR-011 §3.2) ·
`start_date`/`target_end_date`/`actual_end_date` (YYYY-MM-DD) · `estimated_hours`/`actual_hours` INTEGER (minutes) ·
`color` · `icon` · `deleted_at`. **Inline `tags` RETIRED** (→ `entity_tags`, PJ-12). Index: `idx_projects_status`
partial `WHERE deleted_at IS NULL` (SQL-migration-only, notes.ts precedent).

### §3b. `milestones` — milestone (nestable) `[FACT: ADR-002 §5.4 L1602-1626]`

`...baseColumns` · `project_id` (no-FK) · `parent_milestone_id` (self-ref, no-FK) · `title[E]` NN · `description[E]` ·
`status` CHECK NN dflt 'not_started' · **`progress` INTEGER nullable** · **`nesting_weight` INTEGER nullable**
(NULL⇒equal, ADR-011 §3.3) · `due_date` (YYYY-MM-DD) · `sort_order` NN dflt 0 · `deleted_at`. Index:
`idx_milestones_project` on `project_id`.

### §3c. `deliverables` — the pursuable level (INTENDED G2, build-phase → now) `[INTENT: structure-data.md G2; ADR-011 §3.1/§3.4/§3.5]`

`...baseColumns` · `milestone_id` (no-FK) · `title[E]` NN · `description[E]` ·
**`measurement_kind`** CHECK NN dflt 'milestone' (MEASUREMENT_KIND) · **`binding_mode`** CHECK **nullable** (BINDING_MODE,
NULL⇒derive-natural, ADR-011 §3.2 grain — mirrors tasks.binding_mode) · **`progress` INTEGER nullable** ·
**`nesting_weight` INTEGER nullable** · `sort_order` NN dflt 0 · `deleted_at`. Index: `idx_deliverables_milestone`
on `milestone_id`. **No invented `status`/`due_date`/`source`** — progress + measurement_kind carry state; source
binding is an `entity_links` row + the M5/R7 service seam, not a column. **Deliberate asymmetry vs `milestones`:**
milestones carry `status` + `due_date` from the §5.4 FACT floor; a deliverable is a net-new INTENDED pursuable
framed purely by measurement (no aspect doc owes it a `status`/`due_date`), so it omits them by design — a recorded
choice, not an accidental gap. `[FACT: no deliverable status/due_date in any projects aspect; ADR-011 §3.4]`

### §3d. `project_documents` — secure vault `[FACT: ADR-002 §5.4 L1632-1651]`

`...baseColumns` · `project_id` (no-FK) · `milestone_id` (no-FK) · `name[E]` NN · `file_type` · `file_size` INTEGER ·
`encrypted_blob` **BLOB** `[E]` (Drizzle `blob`, `Uint8Array`). **No `deleted_at`** (faithful to §5.4 — hard-deletes
with the project via app-layer cascade) · **no index** (§5.4 declares none). Not a polymorphic target → not registered.

### §3e. `ENTITY_TYPES` registry — reconcile append (`_registry.ts`)

`+= 'project', 'milestone', 'deliverable'` — valid `pages`/`entity_links`/`entity_tags` targets (notes, vision/
mission pages, shared tags). `project_documents` addressed via `project_id` → **not** registered (task_time_logs
precedent). `[FACT: ADR-006 §3.2; INTENT G10]`

### §3f. `@vida/types` interface — reconcile is DB-11 (fixed boundary, not a choice)

`Project` (progress→`number|null`, −`tags`), `Milestone` (+`nesting_weight`, progress→`number|null`), **new
`Deliverable`** interface → **DB-11** (mirror-only now; no `$inferSelect`↔interface assertion exists → compiles).
Enum tuples reused as-is. Standing boundary per the No-Decisions Gate step 4. `[[first-runtime-consumer-surfaces-latent-barrel-defects]]`

---

## §4. Physical home & authoring model (P-R)

- **CREATE** `packages/core/src/db/schema/projects.ts` — Drizzle QUERY mirror (4 tables; `enumText` unions; plain
  indexes only, partial index is SQL-migration-only).
- **CREATE** `packages/core/src/db/migrations/016_projects.ts` — hand-written SQL DDL (ADR-016 §3.5), `version: 16`,
  mirrors `schema/projects.ts`; runs inside the runner's BEGIN/COMMIT (no own transaction).
- **MODIFY** `schema/index.ts` — `export * from './projects'`.
- **MODIFY** `schema/_registry.ts` — append the 3 entity types.
- **MODIFY** `migrations/runner.ts` — import + register `migration016Projects` (→ `LATEST_VERSION` 16).
- **Encryption (BR-DB6-3):** `[E]` fields are the M3 target; the Repository registers an EMPTY `[E]` set in M1.0
  (pass-through). No behavior here — the schema only marks intent via `/** @encrypted */`.

---

## §5. Phase-1 completion checklist

- [x] All 5 aspects of `docs/features/projects/` read + ADR-002 §5.4/§5.20 + ADR-011 §3.1-§3.7.
- [x] Concept grep across corpus (project_contacts/project_habits/events/measurement_kind/nesting_weight).
- [x] FACT floor (3 §5.4 tables) + INTENDED (`deliverables`) separated, each column cited.
- [x] Boundaries scoped OUT with domain-ownership citations (§1) — not time-defers.
- [x] No net-new enum; DB-11 interface reconcile = standing boundary (§3f).
- [x] No manufactured DEFAULT (`binding_mode` nullable; `progress` nullable) — override-slot grain.

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. **4 tables** (3 §5.4 FACT floor + `deliverables` INTENDED). `[FACT: §5.4; INTENT G2]`
2. **`progress` nullable** on projects/milestones/deliverables. `[INTENT ADR-011 §3.2; PJ-3]`
3. **`measurement_kind`/`binding_mode` on `deliverables` ONLY** — doc-determined; all 5 projects aspects attach the
   pair to deliverables alone, projects/milestones are pure rollups. `[FACT: structure-data.md:21,24-27; the module doc is the DB-4 roster]`
4. **`nesting_weight` on milestones + deliverables** (rollup children), not projects. `[INTENT ADR-011 §3.3]`
5. **Inline `tags` RETIRED** → `entity_tags`. `[INTENT PJ-12/G11; tasks precedent]`
6. **All refs no-FK, plain TEXT.** `[FACT: BR-DB3-1]`
7. **Registry += project/milestone/deliverable.** `[INTENT G10]`
8. **No net-new enum tuple** (all reused). `[FACT: @vida/types]`

_String-check (self-analysis): clean — no decision / lean / TBD / open-point / either-or._

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create (referenced substrate)

`entity_tags` · `pages` · `entity_links` (AR-6 `foundation/spaces.ts`) · `contributions` (DB-3 `foundation/purpose.ts`)
· the `_shared.ts` helpers (`baseColumns`/`enumText`/`calendarDate`/`timestampMs`). Tasks (`tasks`) authored group #4.

### To author — 4 confirmed ABSENT (net-new in v2)

`projects` · `milestones` · `deliverables` · `project_documents` — no `schema/projects.ts`; v1 forms exist only in
quarantined `_legacy/`. `[FACT: ls schema/ — no projects.ts; migrations stop at 015]`

### `ENTITY_TYPES` diff (`_registry.ts`)

Present: …`task`. **Absent → append:** `project`, `milestone`, `deliverable`.

### Migration slot

Highest = `015_tasks` (v15). **New = `016_projects` (v16).** `ALL_MIGRATIONS` append after `migration015Tasks`.

### Baseline verdict

Net-new authoring (mirror the group #4 Tasks pattern exactly). No modification of on-disk tables → the ADR-011
"AMEND progress→nullable" is authored correct-the-first-time, not a migration of an existing column.

---

## Phase 3 — Implementation Plan (gate-1 draft)

### §P3.0 — Grounding recap (the doc-closures, for the gate to scrutinize)

1. `deliverables` authored now (build-phase INTENDED, [[build-phase-flags-mean-resolve-now-not-defer]]).
2. `measurement_kind`/`binding_mode` scoped to `deliverables` (structure-data PJ-4), NOT broadcast to projects/milestones.
3. `project_contacts`/`project_habits` scoped to partner domains (doc-cited ownership), NOT this unit.
4. Interface reconcile = DB-11 (standing boundary). No net-new enum.

### §P3.1 — Exact DDL intent (4 tables)

Per §3a-§3d. All: `...baseColumns` (id · created*at · updated_at · 6 `\_sync*\*`). No-FK on every cross-table ref.
FIXED enums → SQL CHECK sourced from the `@vida/types`tuple.`progress`nullable, no default.`binding_mode`nullable, no default.`measurement_kind`NN DEFAULT 'milestone' (doc-licensed natural — the rollup kind).`project_documents`has NO`deleted_at`, NO index (faithful to §5.4).

### §P3.2 — Registry & validators

`_registry.ts` += 3 types. SQL CHECK for entity_type refs is registry-derived (existing mechanism). Zod validators
(DB-9) reuse the existing tuples — no change owed here.

### §P3.3 — Files, migration, tests

CREATE `schema/projects.ts`, `migrations/016_projects.ts`; MODIFY `schema/index.ts`, `_registry.ts`, `runner.ts`.
Tests: (a) enum-parity rows for the new CHECK columns; (b) Phase-5 DDL-introspection parity (PRAGMA table_info)
on nullability · default · column-set · type vs the Drizzle mirror.

### §P3.4 — DB-11 deferrals (cited, not fixed here)

`Project`/`Milestone` amend + new `Deliverable` interface → DB-11 (mirror-only; group #1/#3/#4 precedent; P5-exempt).

### §P3.5 — Plan checklist (pre-critique)

- [x] DDL intent complete + cited · [x] no-FK · [x] no manufactured default · [x] registry append · [x] migration slot
- [x] files enumerated · [x] tests named · [x] boundaries scoped with citations

### §P3.6 — Gate-1 critique verdict (independent) → REVISE → resolved

Independent adversarial critic, 2026-08-19. Verdict **REVISE** (1 material/blocker + 2 fixes); 6 points verified OK
(project_documents faithfulness, tasks-precedent accuracy, no manufactured default, boundary scoping, registry
append, no net-new enum). Resolutions:

- **F1 (blocker) — measurement-scope: critic escalated it to a Victor decision.** RE-GROUNDED (Victor drift-catch,
  2026-08-19): the docs CLOSE it — the module doc (Stream ii) is the authoritative DB-4 table roster and attaches the
  pair to `deliverables` only across all 5 aspects; ADR-011 §3.4 is satisfied by implicit declaration on a rollup, and
  §5.20:3816's "Projects/Deliverables" is a locus grouping, not a per-row mandate. There is **no tension and no
  decision** — deliverables-only is doc-determined. The critic's "escalate to Victor" was itself drift (an escalation
  must be doc-checked before relaying; [[verify-a-critiques-escalation-and-defer-target-before-relaying]]). The
  earlier `[INTERP]`/"put to Victor" framing was wrong and is removed. The Tasks precedent is _consistent_ (tasks vary
  → carry the pair), not contradictory.
- **F2 (material) — `project_habits` cite ambiguous/wrong file.** FIXED → `habits/contract.md:40,47 · habits/conventions.md:55`.
- **F3 (minor) — deliverable status/due_date asymmetry vs milestones unstated.** FIXED: §3c now records the
  deliberate asymmetry.

### §P3.7 — Approval 1 ✅ (2026-08-19) — spec is ZERO-decision, doc-determined → preflight

No open decisions; the one point the gate-1 critic escalated was re-grounded as doc-determined (F1). Proceeding to
preflight + gate-2 autonomously (per the autonomy directive — no decision-questions to raise).

### §P3.8 — Preflight → PASSED (5 folds)

Completeness check against the codebase, PASSED with 5 resolved folds:

1. **`encrypted_blob` is NULLABLE** — §5.4 declares `encrypted_blob BLOB` (no NOT NULL) and `Project­Document.encrypted_blob: Uint8Array | null`. Use `blob('encrypted_blob', { mode: 'buffer' })` — do NOT copy notes.ts `note_attachments`' `.notNull()` (a different table). `[FACT: ADR-002 §5.4 L1639; project.ts]`
2. **`blob` pattern confirmed** — `blob('name', { mode: 'buffer' })`, import `blob` from `drizzle-orm/sqlite-core` (notes.ts:31,94 precedent).
3. **`project_documents` uses `...baseColumns` only** (id·created*at·updated_at·6 \_sync*\*) — NO `deleted_at` add (faithful §5.4). The other 3 tables add `deleted_at`.
4. **enum-parity test** (`validators/enum-parity.test.ts`) — splice `migration016Projects.up(driver)` after 015 in `ddlFor`, import it + `PROJECT_SCOPE`/`PROJECT_COMPLEXITY`, add 7 FIXTURE rows: projects.{scope,complexity,status,priority}, milestones.status, deliverables.{measurement_kind,binding_mode}. `project_documents` has no CHECK col.
5. **DDL-introspection test** — new `db/tests/projects-introspection.test.ts` mirroring `tasks-introspection.test.ts` (4 tables; column-set · nullability · PK='id' · defaults).

### §P3.9 — Gate-2 critique (independent, post-preflight) → SHIP

Independent critic, 2026-08-19. Verdict **SHIP** — all 3 gate-1 fixes verified landed (F1 escalation fully removed +
doc-determined; F2 cite correct; F3 asymmetry recorded); 8 implementation-readiness points confirmed correct
(mirror-ability, `encrypted_blob` nullable, test folds complete, `sort_order` convention-parity, indexes, migration
v16/registration, registry append, DB-11 compile-safe). 1 MINOR doc-hygiene note (non-blocking). No new gaps.

### §P3.10 — Approval 2 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → Phase 4 (implement)

## Phase 4 — Implement (DONE)

- CREATE `schema/projects.ts` (4-table Drizzle mirror) + `migrations/016_projects.ts` (hand-written SQL, v16).
- MODIFY `schema/index.ts` (export), `schema/_registry.ts` (`+= project/milestone/deliverable`),
  `migrations/runner.ts` (register `migration016Projects`; `LATEST_VERSION`=16).
- Tests: 7 enum-parity FIXTURE rows + splice migration016 into `ddlFor`; new `db/tests/projects-introspection.test.ts`.
- Isolated fix during impl: removed an unused `timestampMs` import (TS6133) — no plan divergence.

## Phase 5 — Foundation-soundness verify (DONE)

- **DDL-introspection parity** (`projects-introspection.test.ts`, 16 cases: column-set · nullability · PK · default × 4)
  — GREEN. Confirms no `$inferSelect` type-lie (mirror ≡ SQL on all 4 tables).
- `@vida/core` **264 tests** green (was 240 → +16 introspection + the enum-parity rows); typecheck clean; eslint 0-err;
  `LATEST_VERSION`=16.
- Independent post-impl `/critique` → **SHIP** (SQL↔mirror faithful, no-FK universal, 7 CHECK sets match tuples, 11 `[E]`
  dual-marked, registry/registration correct, FACT-floor complete). 3 MINOR notes = tracked forward-obligations (DB-11
  interface reconcile; structure-data.md INTENDED→owned doc-hygiene).
- **§XXIX Currency promote:** `docs/infrastructure/database-layer/current-spec.md` (roster row + group #5 narrative +
  count 5/22) + `current-business-rules.md` (BR-PJ5-1…12) updated — ship in the same commit.
- **Foundation-readiness:** a downstream MOD-projects / the Tasks service (which references `project_id`/`milestone_id`)
  finds every promised table/column — PASS.

### Deferred / cross-group (tracked, not this unit)

- **DB-11 interface reconcile:** `Project` (progress→nullable, −`tags`) · `Milestone` (+`nesting_weight`, progress→nullable)
  · new `Deliverable`.
- **Measurement-source seam (M5/R7), external ingest (ADR-014), AI (ADR-015), R2 pipeline (ADR-003)** — Layer-3 services.
- **Partner-domain junctions:** `project_contacts` (Relationships), `project_habits` (Habits) — authored with those groups.
