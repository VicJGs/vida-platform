# DB-4 · Group #12 — Learning / Education (+ICS) — Schema Authoring PLAN

> **Unit:** DB-4 per-domain schema, group #12 of 22 (the Learning hub — heaviest group).
> **Profile:** Add Backend Component · **Gate:** §XXVI double-gate (this file = gate-1 SPEC / PLAN).
> **Source model (§0):** frontend-source-of-truth = documented intent; code-first interim. No Figma dependency (backend schema unit).

## §0. Source & No-Guessing

Every column/enum/constraint below is `[FACT: source]` (live floor or settled convention) or `[INTENT: source]`
(the reframe intent this build phase authorizes — [[build-phase-flags-mean-resolve-now-not-defer]]). **Zero
decisions**: the intake §Resolution is marked **WHOLE** (`docs/intake/learning-education.md:104`); the Part-1.2
rerun is CRITIQUE-CLEAN + IMPLEMENTED (`part-1.2-reruns/learning-education.md`). The `(design pass)` labels in
`structure-data.md:79` are build-phase forward-pointers, not defer-signals — we ARE that build phase.

Grounding corpus read (P1): all 5 aspects `docs/features/learning/education/{identity,business-rules,contract,structure-data,conventions}.md`
· `docs/intake/learning-education.md` (§Resolution WHOLE) · the Part-1.2 rerun · ADR-002 §5.10/§5.18 (via
`@vida/types/learning.ts` FACT interfaces) · ADR-006 (SP1) / ADR-011 (M1/M2/M3/M4) / ADR-014 (X*) / ADR-015 (AI*).
P2 current-state: **net-new domain** — no `courses`/`ics_*` on disk; patterns grounded against `projects.ts`
(measurement axes + `project_documents` vault), `session-extensions.ts` (the `class` sub-type extension), `_shared.ts`.

## §1. Scope — authoring set & boundary

**Nature:** net-new (the FACT floor lives only in STALE ADR-002 §5.10/§5.18 DDL). Two live-FACT R6 reframes apply:
inline `courses.tags`→`entity_tags` (SP1); `courses.progress NOT NULL DEFAULT 0`→nullable override (M3).

### Authoring set = 15 tables

| # | Table | Kind | Grounding |
|---|-------|------|-----------|
| 1 | `subjects` | reshaped FACT (`courses`) | structure-data L9/L26; progress→nullable (M3), tags→entity_tags (SP1), +routing/degree_tier |
| 2 | `ics_feed_configs` | FACT floor | L10; `default_subject_id` no-FK |
| 3 | `ics_synced_events` | FACT floor | L11; **X8 add-only** `UNIQUE(feed_id,uid)`+`is_ignored` |
| 4 | `institutions` | INTENDED (ED-2) | roster L23 — formal parent |
| 5 | `self_taught` | INTENDED (ED-2/H2) | roster L24 — **separate** mode container |
| 6 | `programs` | INTENDED (ED-2) | roster L25 — parents institution OR self_taught |
| 7 | `curricula` | INTENDED (ED-11) | roster L26 — fork lineage |
| 8 | `terms` | INTENDED (ED-12) | roster L27 — hierarchical (level + parent) |
| 9 | `class_sessions` | **session extension** (`class`) | roster L28 / contract L49 — sub-type in `SESSION_SUB_TYPE:21` |
| 10 | `subject_schedules` | INTENDED (ED-5) | roster L29 — one per subject, 3-method |
| 11 | `grading_systems` | INTENDED (ED-7/H3) | roster L30 — builder scope+scale |
| 12 | `grading_components` | INTENDED (ED-7/H3) | roster L30 — weighted component template |
| 13 | `assessments` | INTENDED (ED-8) | roster L31 — type/date/weight/modality/score+source |
| 14 | `subject_documents` | INTENDED (ED-13) | roster L33 — the `project_documents` (PJ-8) vault pattern |
| 15 | `education_measurements` | INTENDED (ED-10) | roster L34 — dedicated entity, axes M1×M2, M3 |

### Deferred — owned elsewhere / runtime service (doc-fixed, NOT design passes)

- **homework / education-task** — Tasks-owned via Tasks→Education API; **no local homework table** (C-HW; conventions L15/L43).
- **`entity_tags` / `entity_links`** — AR-6-authored; Education only registers new `entity_type`s.
- **AI document-extraction pipeline** — ADR-014/015 service; the `source=ai` provenance column IS authored here (AI6). No `ai_connections`/`import_staging`.
- **grade/GPA computation + measurement-derive formulas + M4 rollup weight** — generic runtime SERVICE (M1.1+), as for every DB-4 group. The **schema** is authored now.
- **INTENDED-immature views** (My-Week, cross-subject assessments, GPA report) — no schema.

## §2. Invariants honoured (BR-ED-*)

- **BR-ED-1 (SP1)** inline `courses.tags` NOT authored → `entity_tags` (`entity_type='subject'`). `[INTENT ED-16; ADR-006]`
- **BR-ED-2 (M3)** `subjects.progress` + `education_measurements.progress` are **nullable override slots** (NULL ⇒ derive) — never `NOT NULL DEFAULT 0`. `[INTENT ED-10; ADR-011 §3.4]`
- **BR-ED-3 (M1/M2)** the measure carries `measurement_kind` (reuse MEASUREMENT_KIND) × `binding_mode` (reuse BINDING_MODE, nullable no-default ⇒ derive) — **Education-forged storage, never Projects'** (ED-10). `[INTENT; ADR-011 §3.1/§3.5]`
- **BR-ED-4 (X8)** `ics_synced_events` = add-only feed: `UNIQUE(feed_id, uid)` + `is_ignored`, **never delete** ⇒ no `deleted_at`. `[FACT §5.18; INTENT ADR-014 §3.5]`
- **BR-ED-5 (no-FK)** every cross-table ref is plain TEXT, no SQL FK (cascade/set-null = app/sync layer). `[FACT: live convention; ADR-004 §3.4]`
- **BR-ED-6 (routing)** a subject's `curriculum_id`/`term_id`/`degree_tier` are its parent chain; nullable per A1 optional depth (routing enforced at the app layer, not a DB FK). `[INTENT ED-3/A1]`
- **BR-ED-7 (class = session)** `class_sessions` is the 1:1 `class` extension of the AR-5 `sessions` spine (own `id` PK + `session_id` UNIQUE no-FK; spine fields on `sessions`; **no `deleted_at`**). `[FACT contract L49; SESSION_SUB_TYPE:21]` [[session-extensions-carry-no-deleted-at]]
- **BR-ED-8 (vault)** `subject_documents` mirrors `project_documents` (PJ-8): `baseColumns` only, `encrypted_blob` nullable BLOB + `storage_ref` for R2, **no `deleted_at`** (faithful §5.4). `[INTENT ED-13]`
- **BR-ED-9 (grade single-source)** grade/GPA derive from `assessments` through `grading_systems`+`grading_components` — the schema stores components (weight/points) + assessment results (score); **the computation is service, never a stored authority**. `[INTENT ED-7]`
- **BR-ED-10 (AI6)** assessment rows auto-recorded from extraction carry `source` ∈ RECORD_SOURCE (`manual|ai|import`). `[INTENT; ADR-015 §3.6]`
- **BR-ED-11 (ZK)** ICS/document fetch is device-mediated; no server-plaintext path (schema-neutral — [E] fields marked, Repository registers empty [E] set in M1.0). `[FACT ZK-1]`

## §3. Enums — 11 net-new + 4 reused

**Net-new (all FIXED → SQL CHECK + Zod parity), in `@vida/types` domain files + barrel:**

| Tuple | Values | Source |
|-------|--------|--------|
| `DEGREE_TIER` | high_school · bachelor · master · doctorate | conventions L31 |
| `TERM_LEVEL` | year · semester · term | conventions L31 (ED-12) |
| `PROGRAM_PARENT_TYPE` | institution · self_taught | ED-2 |
| `SCHEDULE_SOURCE` | ics · document · manual | ED-5 (H7) |
| `GRADING_SCOPE` | institution · program · subject | contract L24 (ED-7) |
| `GRADING_SCALE_TYPE` | letter · numeric · pass_fail · custom | H3 (`intake:119`) |
| `GRADING_COMPONENT_TYPE` | homework · task · exam · quiz · test · presentation · work | ED-7 |
| `ASSESSMENT_TYPE` | exam · quiz · test · presentation · work | conventions L31 (ED-8) |
| `ASSESSMENT_MODALITY` | online · in_person | conventions L32 (ED-8) |
| `MEASUREMENT_REF_TYPE` | subject · program | ED-10 |
| `RECORD_SOURCE` | manual · ai · import | AI6 (`rerun G-AI6`) |

**Reused:** `COURSE_TYPE`(4) · `COURSE_STATUS`(4) [FACT `learning.ts`] · `MEASUREMENT_KIND` · `BINDING_MODE` [`measurement.ts`].
**OPEN no-CHECK:** `subject_documents.doc_type` (user-extensible — syllabus/schedule/material catch-all, [[open-vocab-columns-take-no-sql-check]]).

## §4. Table shapes (column-level, migration `024_learning_education.ts`, v24)

> `...baseColumns` = `id`+`created_at`+`updated_at`+`_sync_*` (NO deleted_at — added explicitly). `[E]` = field-level libsodium.
> All refs plain TEXT, no FK (BR-ED-5). CHECK/index live in the hand-written SQL migration; Drizzle mirror uses `enumText`.

**1. `subjects`** (SyncableEntity + deleted_at) — reshape of `Course`:
`title`[E] · `description`[E]? · `provider`[E]? · `instructor`[E]? · `url`[E]? · `metadata`[E]? (generic slot, college-data superseded) · `course_type`(COURSE_TYPE, null) · `status`(COURSE_STATUS, notNull) · **`progress`** integer nullable (M3, no default) · `total_modules` int · `completed_modules` int · `start_date`/`end_date`/`target_completion` calendarDate · `estimated_hours` int null (min) · `rating` int null (CHECK 1..5) · **`curriculum_id`** TEXT null · **`term_id`** TEXT null · **`degree_tier`**(DEGREE_TIER, null) · `deleted_at`. Inline `tags` **RETIRED**→entity_tags. idx(`curriculum_id`).

**2. `ics_feed_configs`** (SyncableEntity, **no deleted_at** — FACT interface omits; X9 revoke = `is_active`):
`feed_url`[E] · `feed_name`[E]? · `is_active` bool · `auto_create_sessions` bool · **`default_subject_id`** TEXT null · `sync_interval_hours` int default 6 · `last_synced_at` ts null · `last_error`[E]? · `metadata`[E]?.

**3. `ics_synced_events`** (SyncableEntity, **no deleted_at** — X8 add-only):
`feed_id` TEXT · `uid` TEXT · `summary`[E]? · `description`[E]? · `location`[E]? · `start_time` ts notNull · `end_time` ts null · `recurrence_rule` TEXT null · **`matched_subject_id`** TEXT null · `created_session_id` TEXT null · `is_ignored` bool · `raw_event`[E]?. **UNIQUE(`feed_id`,`uid`)** · idx(`feed_id`).

**4. `institutions`** (SyncableEntity + deleted_at): `name`[E] · `description`[E]? · `deleted_at`.

**5. `self_taught`** (SyncableEntity + deleted_at): `name`[E] · `description`[E]? · `deleted_at`.

**6. `programs`** (SyncableEntity + deleted_at): **`parent_type`**(PROGRAM_PARENT_TYPE, notNull) · **`parent_id`** TEXT · `name`[E] · `description`[E]? · `deleted_at`. idx(`parent_type`,`parent_id`).

**7. `curricula`** (SyncableEntity + deleted_at): `program_id` TEXT · `name`[E] · `description`[E]? · **`forked_from_id`** TEXT null (lineage) · `is_template` bool default 0 · `deleted_at`. idx(`program_id`).

**8. `terms`** (SyncableEntity + deleted_at): `curriculum_id` TEXT · **`level`**(TERM_LEVEL, notNull) · **`parent_term_id`** TEXT null · `name`[E] · `start_date`/`end_date` calendarDate null · `deleted_at`. idx(`curriculum_id`).

**9. `class_sessions`** (session extension — `...baseColumns`, **no deleted_at**): `session_id` TEXT notNull UNIQUE (1:1 → sessions.id) · `subject_id` TEXT · `schedule_id` TEXT null · `source_event_id` TEXT null (the ics_synced_event it maps from) · `location`[E]?. idx(`subject_id`). *(Spine start/end/status live on `sessions`, never re-stored — BR-S1.)*

**10. `subject_schedules`** (SyncableEntity + deleted_at): `subject_id` TEXT · **`source`**(SCHEDULE_SOURCE, notNull) · `deleted_at`. **UNIQUE(`subject_id`)** — one schedule per subject (ED-5 single-source).

**11. `grading_systems`** (SyncableEntity + deleted_at): **`scope`**(GRADING_SCOPE, notNull) · **`scope_id`** TEXT · `name`[E] · `description`[E]? · **`scale_type`**(GRADING_SCALE_TYPE, notNull) · `scale_config`[E]? (JSON-as-text, custom scales) · `deleted_at`. idx(`scope`,`scope_id`).

**12. `grading_components`** (SyncableEntity + deleted_at): `grading_system_id` TEXT · **`component_type`**(GRADING_COMPONENT_TYPE, notNull) · `name`[E]? · `weight` int null (BasisPoints) · `max_points` int null · `deleted_at`. idx(`grading_system_id`).

**13. `assessments`** (SyncableEntity + deleted_at): `subject_id` TEXT · **`type`**(ASSESSMENT_TYPE, notNull) · `grading_component_id` TEXT null · `title`[E]? · `description`[E]? · `date` calendarDate null · `weight` int null (BasisPoints) · `max_points` int null · **`modality`**(ASSESSMENT_MODALITY, null) · `score` int null (result; grade derives via system) · **`source`**(RECORD_SOURCE, notNull default 'manual') · `deleted_at`. idx(`subject_id`) · idx(`type`).

**14. `subject_documents`** (`...baseColumns` only, **no deleted_at** — PJ-8 faithful): `subject_id` TEXT · `title`[E] · `description`[E]? · `doc_type` TEXT null (OPEN, no CHECK) · `encrypted_blob` BLOB null (inline) · `storage_ref` TEXT null (R2). *(No index — §5.4 declares none.)*

**15. `education_measurements`** (SyncableEntity + deleted_at): **`ref_type`**(MEASUREMENT_REF_TYPE, notNull) · **`ref_id`** TEXT · **`measurement_kind`**(MEASUREMENT_KIND, notNull, **no default**) · **`binding_mode`**(BINDING_MODE, null, no default ⇒ derive) · **`progress`** int null (override slot, M3) · `deleted_at`. idx(`ref_type`,`ref_id`).
> ⚠ **`measurement_kind` diverges from `deliverables` deliberately.** `projects.deliverables` uses `NOT NULL DEFAULT 'milestone'` because a rollup child has an *implicit* milestone kind (`016_projects.ts:117`). `education_measurements` is a **dedicated measure entity** whose caller always supplies the kind (`contract.md:32` `setMeasurement({measurement_kind,…})`); no doc licenses a natural default (ED-10). ⇒ notNull **no default** (caller-supplied, like `sessions.status`). Not an accidental inconsistency — recorded so the Phase-5 introspection diff reads it as intentional.

### `entity_type` registry appends (`_registry.ts` + `ENTITY_TYPES`) — PINNED = 7
`subject` · `institution` · `program` · `curriculum` · `term` · `assessment` · `subject_document`. `ENTITY_TYPES`
is ONE list feeding pages · entity_links · entity_tags (`_registry.ts`); it does not distinguish tag-vs-link
targets. The H11/conventions L65 rule "tags on Program/Curriculum/Subject only" is an **app-layer** scope, not a
registry split → all 7 register as valid link/notes targets. **`class_session` EXCLUDED** (session sub-type — the
base `session` type covers it; the `skill_action`/`reading_session` precedent). Count fixed by the docs, not open.

## §5. Implementation prompt (P4)

1. **`@vida/types` `learning.ts`**: add the 11 net-new tuples + derived unions; barrel-export via `index.ts`. Reconcile `Course`→`Subject` rename etc. = **DB-11** (mirror-only now, prior-group precedent).
2. **`packages/core/src/db/schema/learning.ts`** (net-new file): the 15 Drizzle table mirrors using `...baseColumns`, `enumText`, `calendarDate`, `boolInt`, `blob`. Session extension mirrors `session-extensions.ts`; vault mirrors `project_documents`. **Export the module from `schema/index.ts`** (the barrel — where `books` wired, `index.ts:58`).
3. **`migrations/024_learning_education.ts`** (v24): hand-written SQL DDL — CREATE TABLE ×15 with FIXED CHECK on every net-new + reused-enum column, `UNIQUE(feed_id,uid)` · `UNIQUE(subject_id)` on schedules, **`rating` range CHECK 1..5 ONLY** (`score`/`weight`/`max_points` = plain INTEGER, no range CHECK — F6), `-- [E]` comments, indexes as §4.
4. **`runner.ts`**: import `024` + append to `ALL_MIGRATIONS`. `LATEST_VERSION` **auto-derives from the array length** (`runner.ts:116`) — no manual bump.
5. **`_registry.ts`**: append the 7 `entity_type`s (§4 PINNED).
6. **Enum parity `enum-parity.test.ts`**: import the 11 tuples + `024`; chain `024.up()` in the test's **`ddlFor`** helper (the `ddlFor` chain lives HERE, not `runner.ts`); add a FIXTURE row for **every CHECK-backed column** — the 11 net-new **plus** the reused `education_measurements.measurement_kind`/`binding_mode` CHECKs (the deliverables/tasks precedent adds a row per CHECK column, so > 11 rows).
7. **Phase-5**: DDL-introspection parity (table/column/CHECK/index across all 4 dims) + `runner` rebuild to v24 + full `@vida/core` suite green + typecheck + lint.

## §5b. Preflight folds (resolved — build-ready)

- **F1 · enum home.** All 11 net-new tuples land in `packages/types/src/learning.ts` (the education-domain file already holding `Course`/`Ics*`); barrel re-export via `index.ts`. `RECORD_SOURCE` scoped here (Education/AI6) though generic. `[cohesion: types CLAUDE.md one-file-per-domain]`
- **F2 · class_sessions needs NO `session_type_registry` seed.** `'class'` is a shipped SESSION_SUB_TYPE (`session.ts:21`); shipped defs are in-memory (SS-4), like `study`/`focus`/`reading`/`practice` — the extension table is all that's authored. `[FACT session-extensions.ts precedent]`
- **F3 · ref renames follow the reframe.** `default_course_id`→`default_subject_id`, `matched_course_id`→`matched_subject_id` — mechanical consequence of `courses`→`subjects` (structure-data L9/L11); the row-interface reconcile is DB-11. Not a free rename.
- **F4 · `subject_schedules` is intentionally thin** (subject_id UNIQUE + source). The derived `class_sessions` ARE the schedule content (ED-5 "sessions derive from it"); no config column is doc-specified — minimal-but-grounded (the gate-1 critic confirmed this restraint is correct, not under-building).
- **F5 · structural boolean defaults** (the `focus_sessions`/finance precedent — NOT measurement override-slots): `ics.is_active` default 1 (a new feed is active), `ics.auto_create_sessions` default 0 (opt-in), `ics_synced_events.is_ignored` default 0, `curricula.is_template` default 0. `sync_interval_hours` default 6 `[FACT §5.18 L3581]`. These are unambiguous-semantic defaults, distinct from the struck-down measurement-axis defaults (binding_mode stays no-default).
- **F6 · range CHECKs.** `subjects.rating` CHECK 1..5 `[FACT learning.ts:161]`. `weight`/`max_points`/`score` = plain integer, NO range CHECK (bounds vary by grading system — no doc-fixed range; over-constraining would be invention).

## §6. Acceptance

- [ ] 15 tables authored; every ref plain TEXT no-FK (BR-ED-5); `class_sessions` = `class` extension (own id + session_id UNIQUE, no deleted_at).
- [ ] `progress` (subjects + education_measurements) nullable no-default; `binding_mode` nullable no-default; `measurement_kind` notNull no-default (BR-ED-2/3).
- [ ] `ics_synced_events` UNIQUE(feed_id,uid) + no deleted_at (X8); ICS tables no deleted_at (FACT interface).
- [ ] `subject_documents` = PJ-8 (baseColumns only, no deleted_at, nullable blob).
- [ ] 11 net-new FIXED enums → CHECK + Zod parity; reused `measurement_kind`/`binding_mode` CHECKs get FIXTURE rows too; `doc_type` OPEN no-CHECK; `rating` CHECK 1..5 only (no `score` CHECK).
- [ ] inline `tags` NOT authored (SP1); no homework table (C-HW); no `ai_connections`/`import_staging` (deferred); `source=ai` column present (AI6).
- [ ] `ENTITY_TYPES` += 7; runner v24; full suite + introspection green; typecheck 11/11; lint 0.
- [ ] Zero build-decisions — every column [FACT]/[INTENT] cited; No-Decisions Gate string-check clean.

## Change Log
| Date | Change |
|------|--------|
| 2026-08-20 | PLAN drafted from the full 5-aspect + intake §Resolution (WHOLE) + Part-1.2 rerun read + P2 pattern grounding (projects/session-extensions/_shared). 15-table authoring set; 11 net-new enums; grading + measurement authored (drift-corrected: the `(design pass)` labels are build-phase forward-pointers). Presented for gate-1. |
