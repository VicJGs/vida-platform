<!-- CURRENT-BUSINESS-RULES · module: learning-education · living invariants (§XXIX) · never lags the code -->

# Learning: Education — CURRENT BUSINESS RULES  (`@vida/core` `services/learning-education`)

> The invariants the code enforces, promoted per slice from the slice PLANs. Inherits the CORE constitution
> (ZK-1/2/3, LF-1/2/3). Born at S1 (LIF-130, #52). Source rules: `docs/features/learning/education/business-rules.md`
> (ED-1..16) + `docs/specs/foundation/db-4-learning-education/_index.md` (BR-ED-*) + the delivery interpretation
> (R1..R10).

## Shipped invariants (as of S1 — hierarchy spine + routing)

- **BR-LE-S1-1 (one hierarchy, two modes / ED-2)** — every `Program` parents to an `institution` OR a
  `self_taught` row via `parent_type`+`parent_id`; the two are SEPARATE tables (H2), never one mode flag.
  `[code: service.ts createProgram; schema/learning.ts programs]`
- **BR-LE-S1-2 (parent resolves on create / ED-2, no-FK)** — `createProgram`/`createCurriculum`/`createTerm`
  validate the immediate parent exists and throw the typed `*NotFoundError` (fail-loud, the BookNotFound
  precedent). No FK exists in the DB (ADR-016 §3.4) — integrity is service-enforced; an orphan is never written.
  `[code: service.ts assertParentExists / createCurriculum / createTerm]`
- **BR-LE-S1-3 (terms are hierarchical / ED-12)** — `terms.level` ∈ {year,semester,term}; a `parent_term_id`
  (year ⊃ semester ⊃ term) is optional but, when given, must resolve (`TermNotFoundError`). `[code: service.ts createTerm/updateTerm]`
- **BR-LE-S1-4 (curriculum fork deferred / ED-11)** — `createCurriculum` always sets `forked_from_id:null`
  (a scratch build has no lineage); the fork deep-copy + lineage pointer lands in S3. `is_template` default false.
  `[code: service.ts createCurriculum]`
- **BR-LE-S1-5 (routing primitive / ED-3)** — `resolveParentChain({curriculumId?, termId?})` returns
  `{ok, curriculum, term, program}`. `ok` is true iff every GIVEN ref resolved to a LIVE (non-soft-deleted) row
  AND the chain is consistent (a given termId's `curriculum_id` must equal a given curriculumId). The program is
  resolved via the curriculum; a dangling program ref does NOT flip `ok` (no-FK leaf tolerance). An empty ref ⇒
  `ok:true` with all nulls — S2 owns the "a subject needs ≥1 parent" policy + `UnroutedSubjectError`.
  `[code: service.ts resolveParentChain; tests cover full/curriculum-only/unresolvable/mismatch/empty]`
- **BR-LE-S1-6 (soft-delete + the findWhere filter / R4)** — all 5 hierarchy tables use `softDelete:true`
  (`delete()` soft-deletes; `findById`/`findAll` filter `deleted_at`). The `listXFor` readers use `findWhere`,
  which SKIPS the auto filter, so each adds `isNull(deleted_at)` explicitly. `[code: service.ts listProgramsFor/listCurriculaFor/listTermsFor]`
- **BR-LE-S1-7 (encrypted fields dormant / ED-1, M1.0)** — `name`/`description` are `[E]` but
  `encryptedFields:[]` at M1.0 (pass-through); real field encryption = M3. `[code: service.ts createRepository calls]`
- **BR-LE-S1-8 (DB-11 reconcile started)** — `@vida/types` gained the 5 hierarchy interfaces
  (`Institution`/`SelfTaughtPath`/`Program`/`Curriculum`/`Term`). The `Course`→`Subject` rename + retired-column
  reconcile is S2, not S1. `[code: packages/types/src/learning.ts]`

## Shipped invariants (as of S2 — subjects + routing enforcement)

- **BR-LE-S2-1 (subjects always routable, routing enforced / ED-3 + A1)** — `createSubject`/`updateSubject`
  validate a GIVEN routing ref (curriculum_id and/or term_id) resolves to a live, consistent chain, else
  `UnroutedSubjectError`. An EMPTY routing (neither given) is **allowed** — a lone subject, organized later.
  Grounding (doc-reconciled): schema `curriculum_id` nullable "per A1 optional depth" (learning.ts:100) + subjects
  "sparse and progressively fillable" (ED-14, identity.md:49-50); the pre-DB-4 "never an orphaned flat list"
  (ED-3) targets the v2 flat-list anti-pattern, not a creation mandate. `[code: service.ts assertRouting]`
- **BR-LE-S2-2 (progress never settable / R2/M3)** — `progress` is absent from `CreateSubjectSchema`/
  `UpdateSubjectSchema` (Zod strips a force-passed value), hardcoded `null` on create, never in the update patch.
  Derivation lands at S8. `[code: service.ts createSubject/updateSubject; validators/learning.ts]`
- **BR-LE-S2-3 (DB-11 `Course`→`Subject` complete)** — `@vida/types` `Course` is REPLACED by `Subject`: inline
  `tags` retired (→ entity_tags, SP1/S9), `progress`→nullable (M3), `total_modules`/`completed_modules`→nullable,
  +`curriculum_id`/`term_id`/`degree_tier`; `course_type` kept as a nullable subject modality (R6). The
  `CourseType`/`CourseStatus` tuples are retained (schema + validators). No remaining `Course` interface consumer.
  `[code: packages/types/src/learning.ts]`
- **BR-LE-S2-4 (metadata defensive parse / R10)** — `subjects.metadata` is a superseded TEXT [E] slot; `toSubject`
  parses it defensively (malformed/non-JSON ⇒ `null`, never throws) and S2 writes no metadata (create sets null).
  `[code: service.ts parseMetadata/toSubject]`
- **BR-LE-S2-5 (listSubjects filter + R4)** — `listSubjects({curriculumId?, termId?, status?})` always filters
  `isNull(deleted_at)` (findWhere skips the auto filter); empty filter = all live subjects. `[code: service.ts listSubjects]`

## Shipped invariants (as of S3 — curriculum fork + lineage, ED-11/A3/H10)

- **BR-LE-S3-1 (fork = deep copy + lineage)** — `forkCurriculum(sourceId, {name?})` creates a NEW curriculum
  (fresh UUIDv7/`_sync_*`/timestamps) with `forked_from_id = sourceId`, `program_id = source.program_id`,
  `name = input.name ?? source.name`, `description = source.description`; it deep-copies the source's LIVE terms
  and LIVE subjects into the new tree. `[code: service.ts forkCurriculum]`
- **BR-LE-S3-2 (base never mutated — by construction)** — the fork writes EXCLUSIVELY new rows; no write path
  targets a source row, so "base never mutated on fork" is a structural invariant, not a runtime guard. `[code: service.ts forkCurriculum — every create targets newCurriculum.id; the one update targets a cloned term id]`
- **BR-LE-S3-2b (`TemplateImmutableError` = exported vocabulary, NOT wired / R9)** — because the base is never
  mutated by construction, there is no M1-reachable site that writes a template, so `TemplateImmutableError` is
  EXPORTED typed vocabulary with no wired throw (the `IntegrationConsentError` precedent). It is NOT wired to
  `updateCurriculum`, child writes, or deletion; `updateCurriculum` is unchanged from S1 (an update on a template
  still succeeds). `[code: types.ts TemplateImmutableError (exported, never thrown); service.ts updateCurriculum unchanged]`
- **BR-LE-S3-3 (the fork is a working instance — `is_template=false`)** — the copy is created with
  `is_template=false` (the F5 structural default "a new curriculum is not a template"; `db-4-learning-education/_index.md:151`);
  `is_template` is immutable on fork — written to neither the base nor `true` on the copy. `[code: service.ts forkCurriculum is_template:false]`
- **BR-LE-S3-4 (term hierarchy remapped)** — two-pass: clone each live term with `parent_term_id:null`, build an
  old→new id map, then set each clone's `parent_term_id` to the CLONED parent via the map. A parent not in the
  live set (soft-deleted/absent) ⇒ clone `parent_term_id` stays `null` (no-FK leaf tolerance, R5). `[code: service.ts forkCurriculum term two-pass]`
- **BR-LE-S3-5 (routing SHAPE preserved; refs remapped; progress reset; metadata preserved)** — a cloned subject
  remaps ONLY refs that were set: `curriculum_id = src.curriculum_id==null ? null : new.id`,
  `term_id = src.term_id==null ? null : map.get(src.term_id) ?? null` (a term-only subject keeps `curriculum_id`
  null; a dangling term ref drops to null). `progress` is reset to `null` (derived override, never cloned, R2/M3);
  `metadata` is preserved verbatim (diverges from `createSubject`'s null). `[code: service.ts forkCurriculum subject create]`
- **BR-LE-S3-6 (the complete subject set)** — a subject belongs to the source curriculum if
  `curriculum_id = source` OR `term_id ∈ {source live term ids}` (a subject may route by term only). Fork gathers
  the union in one `or()` query (each row returned once; empty term set short-circuits `inArray`). `[code: service.ts forkCurriculum subject query]`
- **BR-LE-S3-7 (per-row, eventually-consistent — NOT transactional / R5)** — the deep-copy is a sequence of
  `repository.create`s (curriculum → terms → subjects); no-FK eventually-consistent, no transaction mandated
  (ADR-016 §3.4). `[code: service.ts forkCurriculum]`
- **BR-LE-S3-8 (soft-deleted children excluded)** — only LIVE (`deleted_at IS NULL`) terms/subjects are copied
  (`findWhere` + explicit `isNull(deleted_at)`, R4). `[code: service.ts forkCurriculum term/subject queries]`
- **BR-LE-S3-9 (source must resolve)** — fork on a missing or soft-deleted source throws `CurriculumNotFoundError`
  (`findById` filters `deleted_at`). `[code: service.ts forkCurriculum]`

## S4 — Schedule + class sessions (ED-4/ED-5; register the `class` sub-type)
- **BR-LE-S4-1 (register the `class` sub-type — call-once, idempotent)** — `registerLearningEducation()` registers
  `CLASS_SESSION_TYPE_DEF` via the injected `SessionRegistry`; a 2nd call throws `DuplicateSubType` → caught → no-op.
  `createClassSession` → `sessions.createSession('class')` surfaces `SessionTypeNotFound` until this runs.
  `[code: service.ts registerLearningEducation; books registerBooks precedent]`
- **BR-LE-S4-2 (`CLASS_SESSION_TYPE_DEF` = an ADR-004 §3.2 transcription)** — `sub_type:'class'`,
  `owner_module:'learning-education'`, `attachment_defaults:{}`, **`effects:[]`** (§3.2.2 + C-E2 — Education is a
  non-feeder; any completion grant rides the base sub-type), shared lifecycle `scheduled→in_progress→completed`
  (§3.2.3), **`permissions.allowed_effects:[]`** (§3.2.4 — module envelope ⊆ shipped; `∅` subset-legal).
  `default_purpose` is OMITTED (no Education doc fixes a class purpose; optional dim — No-Guessing).
  `[code: service.ts CLASS_SESSION_TYPE_DEF]`
- **BR-LE-S4-3 (one schedule per subject — UNIQUE, upsert)** — `setSchedule(subjectId,{source})` updates the live
  row's `source` if one exists, else creates it (one row per subject; the DB UNIQUE is the backstop). `findWhere`
  skips the soft-delete filter → `deleted_at` filtered explicitly. Unknown subject → `SubjectNotFoundError`.
  `[code: service.ts setSchedule]`
- **BR-LE-S4-4 (a class meeting = base session + 1:1 extension; `started_at` = the MEETING TIME)** —
  `createClassSession(subjectId,input)` guards the subject exists, then `sessions.createSession({sub_type:'class',…})`
  + writes its own `class_sessions` row keyed `session_id` + attaches the subject. `started_at` is REQUIRED and set at
  create regardless of `status` (the spine has no other time column — sessions.ts:32-34 — and the #32 engine only
  auto-stamps on a transition into `in_progress`). `class_sessions` has NO `deleted_at` → `softDelete:false`; the base
  owns lifecycle (BR-ED-7). Three writes, no outer tx — an orphan is harmless + re-drivable (no-FK, eventually-consistent).
  `[code: service.ts createClassSession]`
- **BR-LE-S4-5 (the subject is the §3.2.1 target)** — after create, `sessions.attach(sessionId,'subject',subjectId,
  'instance')` (`subject` is a registered ENTITY_TYPE). `[code: service.ts createClassSession]`
- **BR-LE-S4-6 (derived reads go through the base session)** — `listSessions(subjectId)` reads its own
  `class_sessions` then resolves each base via `sessions.getSession`; a soft-deleted base (→ null) is excluded.
  `getWeeklySchedule(range)` is cross-subject: base `started_at` ∈ `[start,end]` (INCLUSIVE both ends — matches the
  reused `TimeRange` contract, not a silent half-open divergence), sorted ascending; untimed/out-of-range excluded.
  `[code: service.ts listSessions/getWeeklySchedule/toView]`
- **BR-LE-S4-7 (schedule source is FIXED vocab)** — `source ∈ SCHEDULE_SOURCE` (ics/document/manual), Zod-validated
  (the column is a CHECK). `[code: validators/learning.ts SetScheduleSchema]`
- **BR-LE-S4-8 (`@vida/types` `ClassSession` + `SubjectSchedule` — net-new)** — both added `extends SyncableEntity`,
  mirroring the schema rows; `ClassSession` OMITS `deleted_at` (session extension). `[code: packages/types/src/learning.ts]`

### S5 — ICS feeds + events (ED-6 · X1/X2/X5/X8/X9/X10)
- **BR-LE-S5-1 (ICS tables are add-only — no soft-delete)** — `ics_feed_configs` + `ics_synced_events` omit
  `deleted_at` → both repos `softDelete:false`. A feed is revoked via `is_active` (X9), an event hidden via
  `is_ignored` (X8) — **never deleted**. `[code: service.ts icsFeedConfigsRepo/icsSyncedEventsRepo; schema learning.ts:109-153]`
- **BR-LE-S5-2 (`addFeed` backfills DB-default-equal columns for a faithful row)** — `create()` echoes the input and
  does NOT read back DB column defaults ([[repository-create-returns-input-row-not-db-defaults]]), so `is_active=true`,
  `auto_create_sessions` (default false) and `sync_interval_hours=6` (FACT §5.18) are set explicitly in the create
  input (values equal the DB defaults — no divergence). `auto_create_sessions` is STORED but does not auto-create a
  class session at M1 (that path is the M2 sync). `[code: service.ts addFeed]`
- **BR-LE-S5-3 (`syncFeed` is deny-safe — live fetch = M2)** — the `ics?` port absent ⇒ `IcsUnavailableError`
  (fail-loud: a sync that cannot run must not silently return empty/stale). The configs/events schema + the add-only
  dedup logic are fully M1; only the network fetch+parse is M2 (ADR-014 X1). `[interpretation.md:52-54; code: service.ts syncFeed]`
- **BR-LE-S5-4 (`syncFeed` never silent-stale)** — a PRESENT port that throws ⇒ the feed's `last_error` is persisted
  BEFORE `IcsSyncError` is thrown; a successful run clears `last_error` and stamps `last_synced_at`. No path stamps
  success on failure, nor leaves `last_error` stale on success. `[seam-contract.md:48; code: service.ts syncFeed]`
- **BR-LE-S5-5 (add-only dedup on UNIQUE(feed_id,uid) — X8)** — `syncFeed` inserts only uids not already present for
  the feed; the dedup set counts IGNORED rows too (an ignored event is never resurrected); in-batch duplicate uids are
  also skipped (no UNIQUE violation under any ordering). Returns `SyncResult {added, skipped}`. `[code: service.ts syncFeed; migration 024 UNIQUE(feed_id,uid)]`
- **BR-LE-S5-6 (`matchEvent` sets the link, spawns no session at M1 — X5)** — `matchEvent(eventId,{subject_id})` sets
  `matched_subject_id` and returns the event; fail-loud `SubjectNotFoundError` on an unknown subject (no dangling ref);
  the event→class-session auto-create is the M2 sync path, so `created_session_id` stays null at M1. `[code: service.ts matchEvent]`
- **BR-LE-S5-7 (unmatched events surface — R7)** — `listEvents(feedId)` returns ALL events (ignored + unmatched) so
  the UI can surface unmatched ones for manual match; an unmatched event stays unmatched until `matchEvent`. `[interpretation.md:104; code: service.ts listEvents]`
- **BR-LE-S5-8 (four typed ICS errors — all with real throw sites, No-Guessing)** — `IcsUnavailableError` /
  `IcsSyncError` / `IcsFeedNotFoundError` / `IcsEventNotFoundError`; no invented or dead error. `[code: types.ts]`
- **BR-LE-S5-9 (DB-11 ICS reconcile — the S5 carry-forward RESOLVED)** — `@vida/types` `IcsFeedConfig.default_course_id`
  → `default_subject_id` and `IcsSyncedEvent.matched_course_id` → `matched_subject_id` (reframe F3), now matching the
  schema columns; the R8 consumer grep confirms zero non-legacy references to the old names. `[code: packages/types/src/learning.ts:693-716]`
- **Forward-note (M2 sync loop):** `syncFeed` does NOT gate on `is_active` at M1 — no doc mandates it and live fetch is
  M2. When the M2 sync loop lands, skip inactive feeds so a revoked feed is not silently re-synced (g2 NIT1).

### S6 — grading systems + components (ED-7 · H3)
- **BR-LE-S6-1 (a grading system is scoped + fail-loud on create)** — `createGradingSystem(scope,{…})` validates the
  scope entity exists (`Institution`/`Program`/`SubjectNotFoundError` by `scope.type`) BEFORE any write (no-FK, the
  `BR-LE-S1-2` convention). A `subject`-scoped system OVERRIDES the broader one; the override-RESOLUTION (which system
  applies to a subject) is S7's concern, not stored here. Multiple systems per scope are allowed ("create or inherit").
  `[code: service.ts createGradingSystem/assertScopeExists]`
- **BR-LE-S6-2 (weight rule — flag, NEVER normalize)** — the non-null component weights, if any are given, must sum to
  EXACTLY 10000 bp (100%); otherwise `GradingWeightError` (never normalized). An all-null set (unweighted scale —
  `pass_fail`/points) is unconstrained. `weight: 0` is a non-null weight (a lone `0` ≠ 100% → flagged), NOT "unset".
  Validated before any write → a rejected system leaves zero partial rows. `[contract.md:63; business-rules.md:73; code: service.ts createGradingSystem]`
- **BR-LE-S6-3 (`scale_config` is `[E]` JSON-as-text)** — serialized via `JSON.stringify` on write (only when non-null),
  defensive-parsed on read (malformed ⇒ null, reuses `parseMetadata`). `[R10; code: service.ts createGradingSystem/toGradingSystem]`
- **BR-LE-S6-4 (both grading tables soft-delete)** — `grading_systems` + `grading_components` have `deleted_at` →
  `softDelete:true`; `getGradingSystem`/`listGradingSystems` filter `deleted_at` explicitly on `findWhere`
  ([[repository-findwhere-skips-softdelete-filter]]). `[code: service.ts]`
- **BR-LE-S6-5 (`GradingSystemView` enriches the seam)** — `createGradingSystem`/`getGradingSystem` return
  `{system, components}` (the created/live composite, the `ClassSessionView` precedent); `listGradingSystems` returns
  systems only (components via `getGradingSystem`). Per-row component writes, no outer tx (eventually-consistent, re-drivable). `[code: service.ts]`
- **BR-LE-S6-6 (`@vida/types` `GradingSystem` + `GradingComponent` — net-new)** — both `extends SyncableEntity`,
  declare `deleted_at`; a component is weight-based (`weight` BasisPoints) OR points-based (`max_points`), both nullable;
  `scale_config` typed `Record<string,unknown> | null` (parsed). `[code: packages/types/src/learning.ts]`
- **BR-LE-S6-7 (duplicate `component_type` allowed by design)** — no uniqueness guard on components; a system may hold
  two same-type buckets (e.g. two `exam` components), per ED-7 "each with own weight/points, per professor" (No-Guessing — no doc mandates uniqueness). `[code: service.ts createGradingSystem]`

### S7 — assessments + grade/GPA compute (ED-8 · ED-7 compute · AI6)
- **BR-LE-S7-1 (an assessment attaches to a subject; create is fail-loud)** — `createAssessment(subjectId, input)` guards
  the subject exists (`SubjectNotFoundError`) and, when `grading_component_id` is given, that it resolves to a live
  component (`GradingComponentNotFoundError`); a null component id is allowed (unmapped). `score` starts null; `source`
  backfilled to `'manual'` service-side so the create-echoed row is faithful (not the DB default). `[business-rules.md
  ED-8; code: service.ts createAssessment; [[repository-create-returns-input-row-not-db-defaults]]]`
- **BR-LE-S7-2 (grade is DERIVED, never stored)** — `recordResult(assessmentId, {score})` writes `score` ONLY and
  returns the updated assessment; there is no stored grade. A subject's grade is derived-on-read by `computeGrade`.
  `[business-rules.md:37-38 "derived … never hand-set"; ED-10 M3; code: service.ts recordResult]`
- **BR-LE-S7-3 (applicable system resolves by nearest scope: subject → program → institution)** — `resolveGradingSystem`
  checks subject scope, then the subject's program (via `resolveParentChain`), then — only when
  `program.parent_type==='institution'` — the institution (`program.parent_id`); a self_taught-rooted program stops at
  program (self_taught ∉ `GRADING_SCOPE`). >1 live system at the chosen scope ⇒ most-recently-created picked +
  `ambiguous-system` flag (never a throw); none anywhere ⇒ `grade:null` + `no-system`. `[business-rules.md:74;
  code: service.ts resolveGradingSystem/pickSystem]`
- **BR-LE-S7-4 (`computeGrade` = the engine's two-level rollup; partial, never fabricated)** — per scored assessment,
  `normalize({kind:'quantitative', current:score, baseline:0, target: assessment.max_points ?? component.max_points,
  isHigherBetter:true})` (score>max clamps to 1.0, no >100%); per component, equal-weight `rollup` of its normalized
  assessments; subject grade = `rollup` of component progress weighted by `weight` bp (null/0 ⇒ equal-weight; null-progress
  components excluded). Flags: `incomplete` (a component had no scored assessment), `unmapped-assessments` (a scored
  assessment with a null OR foreign `grading_component_id` — grouping is by the resolved system's components, never a
  silent drop), `missing-scale` (a scored assessment with no max anywhere). Empty/all-null ⇒ `grade:null`, never 0.
  `[business-rules.md:92; engine.ts normalize/rollup; code: service.ts computeGrade]`
- **BR-LE-S7-5 (`computeGPA(ref)` = equal-weight rollup; partial + `flagged`)** — `ref={type:'term'|'curriculum', id}`.
  Subject set: `term` ⇒ `term_id===id`; `curriculum` ⇒ `curriculum_id===id` OR `term_id ∈ the curriculum's live terms`
  (the S3 fork union). Guards the ref (`TermNotFoundError`/`CurriculumNotFoundError`). `gpa = rollup(per-subject grades,
  equal-weight)` (no credit-hours in schema → engine default); `flagged` iff any subject grade is null OR any per-subject
  flags non-empty; empty set ⇒ `gpa:null, flagged:true`. Never fabricated. `[contract.md:64; business-rules.md:92;
  code: service.ts computeGPA]`
- **BR-LE-S7-6 (grade returned normalized [0,1] + scale metadata; label mapping is NOT S7)** — `GradeResult.grade` is the
  normalized value; `scaleType` + parsed `scaleConfig` ride along for the display tier. The letter/numeric boundary
  algorithm is undefined in the aspect docs → ②/M-later, not fabricated here (No-Guessing). `[grep clean — scale named
  only as an enum business-rules.md:37; code: service.ts computeGrade/types.ts GradeResult]`
- **BR-LE-S7-7 (`@vida/types` `Assessment` — net-new)** — `extends SyncableEntity`, mirrors `AssessmentRow` exactly
  (`grading_component_id`/`title`/`description`/`date`/`weight`/`max_points`/`modality`/`score` nullable; `source`
  `RecordSource`; `deleted_at`). `assessments` is `softDelete:true`. `[code: packages/types/src/learning.ts; schema learning.ts]`
- **BR-LE-S7-8 (compute never throws on missing data — it flags)** — `computeGrade`/`computeGPA` throw ONLY on a bad
  REFERENCE (unknown subject/term/curriculum); a missing system / score / unmapped / missing-scale is a flag on the
  result. `GradeResult`/`GpaResult` are result objects, not errors. `[business-rules.md:92; code: service.ts]`

### S8 — education measurement (ED-10 · M1/M2/M3)
- **BR-LE-S8-1 (Education-forged measure, one per ref, upsert, fail-loud)** — `setMeasurement(ref,{measurement_kind,
  binding_mode?})` where `ref={type:'subject'|'program', id}` guards the ref (`SubjectNotFoundError`/`ProgramNotFoundError`)
  then upserts the single `education_measurements` row for `(ref_type,ref_id)` (update kind/mode if present — PRESERVING
  the `progress` override; else create). Separate storage, never Projects' (C-M5). `[schema learning.ts:324-339 non-unique
  index; the setSchedule precedent; code: service.ts setMeasurement/findMeasurement]`
- **BR-LE-S8-2 (`measurement_kind` REQUIRED; `binding_mode` nullable ⇒ derive; kind is declared metadata)** —
  `measurement_kind ∈ MEASUREMENT_KIND` caller-supplied (no default — a dedicated measure entity); `binding_mode ∈
  BINDING_MODE` nullish (omittable ⇒ null ⇒ derive, M2). **The M1 derivation does NOT branch on `measurement_kind`** —
  it is kind-agnostic (grade/rollup); the kind is persisted for the record + the M-later direct per-kind `normalize`
  path (a subject measured not-via-grade). `[schema learning.ts:331-334; code: validators SetMeasurementSchema, service.ts]`
- **BR-LE-S8-3 (`getProgress` returns integer 0–100 or null; engine works in [0,1])** — the `progress` override column is
  `integer` (can't hold a [0,1] float) → the unit is 0–100 (the `books.progress` + `subjects.progress` precedent);
  getProgress derives in [0,1] and scales to a rounded 0–100 at the boundary; null = unmeasured (BR-2), never 0.
  `[schema learning.ts:335 integer; books/service.ts:1093; engine.ts:11; code: service.ts getProgress]`
- **BR-LE-S8-4 (`getProgress` inlines resolveProgress §3.2: stored-override wins, else derive)** — no measurement row ⇒
  null (nothing configured); a non-null stored `progress` override wins (clamped 0–100); else derive. Inlined (not the
  generic `resolveProgress`) to bridge the 0–100-stored ↔ [0,1]-derive unit gap — the books `getUnifiedProgress`
  precedent. **At M1 the override is NEVER written** (no setter in the seam) → the derive branch always runs; the override
  column is a forward seam (M-later manual set). `[engine.ts:55-61; books/service.ts:1091-1096; code: service.ts getProgress]`
- **BR-LE-S8-5 (subject derivation: `derived-pull`/no-mode pull the grade; `manual`/`event-trigger` ⇒ null)** — for a
  subject, `binding_mode==='derived-pull'` OR `null` (derive-by-default) ⇒ `computeGrade(subjectId).grade` (Education's
  natural progress signal, [0,1]|null); `'manual'` ⇒ null (manual has no auto-derivation — the override is its only
  source, ED-10 "manual→manual"); `'event-trigger'` ⇒ null (no event source until M2). `[business-rules.md:49;
  BINDING_MODE measurement.ts:9; code: service.ts deriveProgress01]`
- **BR-LE-S8-6 (program derivation: the engine's fractal `rollup` over its subjects)** — for a program, roll up its
  subjects' [0,1] progress via `rollup` (equal-weight; null-progress subjects excluded). The subject set = the union over
  the program's live curricula of (`curriculum_id===c.id` OR `term_id ∈ c's live terms`), deduped (the S7 computeGPA/S3
  fork union, iterated per curriculum). Each subject contributes `getProgress(subject)/100` (honoring its own
  override/mode) → fed to `rollup` as [0,1] (never 0–100 — that would wrongly clamp to 1). Depth 1 (subject⊂program), no
  cycle. `[engine.ts:38-53; seam-contract.md:61; code: service.ts deriveProgress01/programSubjectIds]`
- **BR-LE-S8-7 (`@vida/types` `EducationMeasurement` — net-new)** — `extends SyncableEntity`, mirrors
  `EducationMeasurementRow` (`ref_type: MeasurementRefType`, `ref_id`, `measurement_kind: MeasurementKind`, `binding_mode:
  BindingMode|null`, `progress: number|null`, `deleted_at`). `softDelete:true`. `[code: packages/types/src/learning.ts; schema learning.ts:370]`
- **BR-LE-S8-8 (no `advertise()`, no Projects storage — C-M5)** — Education exposes progress ONLY via the `getProgress`
  method (the KN-10 per-subject-measure-is-a-method pattern); never calls the measurement source-registry `advertise()`
  (global scalars only) and never writes Projects' measure tables. `[seam-contract.md:13;
  [[measurement-source-registry-is-sync-scalar-per-subject-uses-a-method]]; code: service.ts — no advertise call]`

## S9 — Subject vault + tags/links/notes (ED-13 · ED-16 · SP1 · PJ-8)
- **BR-LE-S9-1 (vault write is subject-scoped, fail-loud, NO soft-delete)** — `addDocument(subjectId, input)` guards
  `subjectsRepo.findById` live (`SubjectNotFoundError`, the no-FK app-layer integrity convention), then creates one
  `subject_documents` row. The table has NO `deleted_at` → `softDelete:false` (the PJ-8 `project_documents` vault
  pattern). `title` required; `description`/`doc_type` nullable; `doc_type` is an OPEN vocab (no CHECK/enum).
  `[schema learning.ts:310-322; code: service.ts addDocument / subjectDocumentsRepo]`
- **BR-LE-S9-2 (file routing — inline on absent port, typed only on a real R2 failure)** — the vault's typed error is a
  "decrypt/R2 error → typed" (business-rules.md:89) and ED-16 mandates "every write succeeds locally first", so an
  absent `attachment?` port NEVER throws: `storage_ref` given ⇒ stored as-is (no port); `file` + present port ⇒
  `attachment.upload` FIRST (nothing persists on failure, the books addAsset precedent) → `storage_ref=fileRef`; a
  present port that REJECTS ⇒ `DocumentFileError` (that "decrypt/R2" state); `file` + absent port ⇒ INLINE
  `encrypted_blob = file.bytes` (local-first, no throw); neither ⇒ a metadata-only row. `file` and `storage_ref` are
  mutually exclusive (`ConflictingFileSourceError`, pre-write). mimeType is NOT persisted (no mime column; inline/R2
  symmetric). The seam-contract's absent-⇒`AttachmentUnavailable` wording was design-time drift, overridden by the
  aspect authority. `[business-rules.md:64,89; ED-16; learning.ts:316-317; code: service.ts addDocument]`
- **BR-LE-S9-3 (`getVault` = documents + notes together)** — `documents` = all `subject_documents` for the subject,
  mapped `→ SubjectDocument`, sorted by `created_at` in JS (`findWhere` has no orderBy, non-mutating `[...rows].sort`);
  `notes` = `notes.getPagesForEntity('subject', subjectId)` returned as `PageRow[]` raw (the NotesService convention —
  no `toPage` mapper exists; already excludes soft-deleted pages). Guards the subject (fail-loud). `[seam-contract.md:65;
  notes/service.ts:144-148; code: service.ts getVault]`
- **BR-LE-S9-4 (`tagEntity` guards the tag resolves BEFORE the blind insert)** — `spaces.tagEntity` blind-inserts an
  unresolved `tag_id`, so `tagEntity(ref, tagId)` guards `tagsRepo.findById(tagId) == null ⇒ TagNotFound` first, then
  delegates (idempotent revive/no-op). An unregistered `entityType` ⇒ `UnknownEntityType` (from spaces). Remove stays the
  SpacesService surface. `[knowledge/service.ts:434-437; spaces/service.ts:128-143;
  [[spaces-junctions-split-read-write-tagentity-blind-inserts]]; code: service.ts tagEntity]`
- **BR-LE-S9-5 (`linkEntities` reuses the `page_id` anchor slot)** — `entity_links` is page→entity, so
  `linkEntities(from, to, context?)` delegates to `spaces.createLink(from.entityId, to.entityType, to.entityId,
  context)` — the source entity id rides the generic `page_id` TEXT slot (no FK), the knowledge `linkObjects` precedent.
  spaces asserts the TARGET type; `from.entityType` is informational-only (no source-type column — neither stored nor
  validated). `[knowledge/service.ts:411-413; spaces/service.ts:158; code: service.ts linkEntities]`
- **BR-LE-S9-6 (`@vida/types` `SubjectDocument` — net-new)** — `extends SyncableEntity`, mirrors `SubjectDocumentRow`
  (`subject_id`, `title`, `description|null`, `doc_type|null`, `encrypted_blob: Uint8Array|null`, `storage_ref|null`);
  NO `deleted_at` (PJ-8). The mode-less `blob()` infers `{}` on the Row → a sound `as Uint8Array` cast in the mapper
  (runtime Buffer ⊂ Uint8Array). `[packages/types/src/learning.ts; schema learning.ts:368; code: service.ts toSubjectDocument]`
- **BR-LE-S9-7 (deps grew by `spaces`/`notes` required + `attachment?` deny-safe)** — plus a READ-only `tagsRepo` for the
  BR-LE-S9-4 guard. Port types named `EducationFileBlob`/`EducationAttachmentPort` (not `FileBlob`/`AttachmentPort`) to
  avoid the flat `@vida/core` barrel collision with the books types (the `HabitDateRange` rename-on-collision precedent;
  Education's subject-keyed `upload` ≠ the books book-keyed one, so NOT reused). `[code: types.ts Deps + port interfaces;
  knowledge/types.ts:66,75]`

## Scope guards honored (the C-* negatives — rerun-ratified)
- **C-HIER** — hierarchy + subject shape is DB-4-done; S1/S2 are CRUD only, no schema redesign.
- **C-E2 / C-M5 / C-HW / C-AI4** — not yet touched at S1/S2/S4 (no economy grant, no `advertise()`, no homework table,
  no AI agent); the `class` sub-type declares `effects:[]`/`allowed_effects:[]` (C-E2 honored). Enforced from the
  slices that introduce those seams (S8/S10).
