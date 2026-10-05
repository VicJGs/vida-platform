<!-- CURRENT-SPEC · module: learning-education · the living contract (§XXIX Currency Rule) · never lags the code -->

# Learning: Education — CURRENT SPEC  (`@vida/core` `services/learning-education`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-learning-education ① S1 (LIF-130, #52). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createLearningEducationService(deps)` — the ① backend service tier for **the Learning hub (Education)** over
DB-4 `024_learning_education` (15 tables, the heaviest DB-4 group). The full design lives in
`docs/features/learning/education/` (aspect docs) + `docs/features/learning/education/delivery/`
(interpretation · slice-map · seam-contract). Build state: **① IN PROGRESS — S8 of 10 shipped** (hierarchy
spine + routing · subjects + DB-11 reconcile · curriculum fork + lineage · schedule + class sessions · ICS feeds +
events · grading systems + components · assessments + grade/GPA compute · education measurement). Next: S9 subject vault + tags.

A **pure service tier over a finished schema** (no DDL — DB-4 #12 authored all 15 tables; the aspect docs'
"⚠ INTENDED/no schema" language is pre-DB-4 and stale). The 7 Education entity_types
(`subject`/`institution`/`program`/`curriculum`/`term`/`assessment`/`subject_document`) are already registered
in `db/schema/_registry.ts:100-106` — composed, never re-registered.

## Delivered surface (as of S8)

`createLearningEducationService({ db, deviceId, sessions, sessionRegistry, ics? }) → LearningEducationService`.
Factory-object, hoisted closures, no `this.`. Deps grow per slice — S4 added the BUILT, injected
`sessions: SessionsService` + `sessionRegistry: SessionRegistry`; **S5 added the deny-safe `ics?: IcsFetchPort`**
(absent at M1 ⇒ `syncFeed` throws `IcsUnavailableError`); S6+ add spaces/notes/journalRegistry + `attachment?`/`tasks?`/`ai?`
+ the dormant `effects?` seam.

| Method | Leg | Contract |
|---|---|---|
| `createInstitution/update/delete/get/listInstitutions` | ED-2 | formal parent CRUD; soft-delete; update/delete error-first (`InstitutionNotFoundError`) |
| `createSelfTaughtPath/…/listSelfTaughtPaths` | ED-2/H2 | SEPARATE table from institutions; same CRUD shape (`SelfTaughtPathNotFoundError`) |
| `createProgram(parent, input)` | ED-2 | `parent:{type:'institution'\|'self_taught', id}`; **parent must resolve** (fail-loud) or `Institution/SelfTaughtPathNotFoundError` |
| `updateProgram/deleteProgram/getProgram/listProgramsFor(parent)` | ED-2 | `listProgramsFor` filters `deleted_at` (R4) |
| `createCurriculum(programId, input)` | ED-11 | program must resolve (`ProgramNotFoundError`); `forked_from_id:null` on scratch build (fork = S3); `is_template` default false |
| `updateCurriculum/deleteCurriculum/getCurriculum/listCurriculaFor(programId)` | ED-11 | — (unchanged at S3; no template write-guard) |
| `forkCurriculum(sourceId, {name?})` | ED-11 · A3 · H10 | **S3** — deep-copy live terms+subjects → new tree; `forked_from_id=source`; copy `is_template=false`; base never mutated (writes only new rows); term/subject refs remapped (shape-preserved), `progress` reset, `metadata` preserved; `CurriculumNotFoundError` on missing/deleted source. `TemplateImmutableError` is EXPORTED vocabulary, not wired (R9) |
| `createTerm(curriculumId, input)` | ED-12 | hierarchical `level` ∈ {year,semester,term}; optional `parent_term_id` (must resolve if given); curriculum must resolve |
| `updateTerm/deleteTerm/getTerm/listTermsFor(curriculumId)` | ED-12 | — |
| `createSubject(input)` | ED-3 | the study unit (`subjects` = reshaped `courses`); routing ENFORCED (`UnroutedSubjectError` iff a GIVEN ref fails; empty routing allowed, A1); `progress` never settable (R2/M3); `course_type` nullable modality (R6) |
| `updateSubject(id, input)` | ED-3 | re-routing re-validates the resulting pair; `progress` never in the patch |
| `deleteSubject/getSubject` | ED-3 | soft-delete; `SubjectNotFoundError` |
| `listSubjects({curriculumId?, termId?, status?})` | ED-3 | filters `deleted_at` (R4); empty filter = all live subjects |
| `resolveParentChain({curriculumId?, termId?})` | ED-3 | routing primitive; returns `{ok, curriculum, term, program}` — `ok`=every given ref resolved + chain consistent |
| `registerLearningEducation()` | ED-4 · S1–S7(sessions) | **S4** — registers the `class` session sub-type (`DuplicateSubType`-guarded, idempotent); must run before `createClassSession` |
| `setSchedule(subjectId, {source})` | ED-5 | **S4** — upsert one `subject_schedules` row per subject (UNIQUE); `source ∈ ics/document/manual`; `SubjectNotFoundError` |
| `createClassSession(subjectId, input)` | ED-4 · BR-ED-7 | **S4** — base `sessions('class')` + 1:1 `class_sessions` extension + attach subject (§3.2.1); `started_at` = required meeting time; returns `ClassSessionView {session, classSession}`; `SubjectNotFoundError` |
| `listSessions(subjectId)` | ED-4 | **S4** — a subject's class meetings; soft-deleted base excluded (via `sessions.getSession`→null) |
| `getWeeklySchedule(range)` | ED-4 | **S4** — cross-subject meetings with base `started_at` ∈ `[start,end]` (inclusive, matches `TimeRange`), sorted ascending; untimed/out-of-range excluded |
| `addFeed({url, default_subject_id?, auto_create_sessions?, feed_name?})` | ED-6 · X2 | **S5** — create an `ics_feed_configs` row; `is_active`/`auto_create_sessions`/`sync_interval_hours` backfilled to DB-default values for a faithful row; `auto_create_sessions` stored but auto-create is the M2 sync path |
| `syncFeed(feedId)` | X1 · X8 · X10 · R9 | **S5** — **deny-safe**: `ics?` absent ⇒ `IcsUnavailableError`; present+fetch-fail ⇒ `last_error` persisted then `IcsSyncError` (never silent-stale); success ⇒ clear `last_error` + stamp `last_synced_at` + add-only upsert on UNIQUE(feed_id,uid) (present/ignored ⇒ skip). Returns `SyncResult {added,skipped}`; `IcsFeedNotFoundError` |
| `matchEvent(eventId, {subject_id})` | X5 | **S5** — set `matched_subject_id`, return the event (no session spawned at M1); `IcsEventNotFoundError` / `SubjectNotFoundError` |
| `ignoreEvent(eventId)` | X8 | **S5** — set `is_ignored` (never delete; dedup keeps it out of re-syncs); `IcsEventNotFoundError` |
| `setFeedActive(feedId, active)` | X9 | **S5** — revoke/restore via `is_active` (never delete); `IcsFeedNotFoundError` |
| `listFeeds()` / `listEvents(feedId)` | R7 | **S5** — feeds (active+revoked); events (ignored+unmatched, so the UI surfaces unmatched for manual match) |
| `createGradingSystem(scope, {scale_type, scale_config?, name, description?, components:[{component_type, weight?, max_points?, name?}]})` | ED-7 · H3 | **S6** — scope `{type:institution\|program\|subject, id}` must resolve (fail-loud); **weight rule**: non-null weights (if any) sum to 10000 bp or `GradingWeightError` (never normalize); `scale_config` serialized `[E]` JSON; validated before any write → `GradingSystemView {system, components}` |
| `getGradingSystem(id)` | ED-7 | **S6** — `GradingSystemView \| null`; live components (`deleted_at`-filtered) |
| `listGradingSystems(scope)` | ED-7 | **S6** — live systems for a scope (multiple allowed — "create or inherit"; override-resolution is S7) |
| `createAssessment(subjectId, {type, grading_component_id?, title?, description?, date?, weight?, max_points?, modality?, source?})` | ED-8 · AI6 | **S7** — subject-attached; fail-loud subject + (given) component; `score` null at create; `source` backfills `'manual'`; `SubjectNotFoundError`/`GradingComponentNotFoundError` |
| `recordResult(assessmentId, {score})` | ED-8 | **S7** — sets `score` ONLY (grade derives, never stored); `AssessmentNotFoundError` |
| `listAssessments({subject_id?, type?, range?})` | ED-8 | **S7** — filters by subject/type/inclusive date range; soft-deleted excluded |
| `computeGrade(subjectId)` | ED-7 compute | **S7** — DERIVED via the resolved system (subject→program→institution) + the measurement engine (normalize per-assessment → equal-weight rollup per component → weighted rollup); returns `GradeResult {grade [0,1]\|null, scaleType, scaleConfig, systemId, systemScope, components[], flags[]}`; flags `no-system`/`ambiguous-system`/`incomplete`/`unmapped-assessments`/`missing-scale`; never throws on missing data (`SubjectNotFoundError` only) |
| `computeGPA({type:'term'\|'curriculum', id})` | ED-7 compute | **S7** — equal-weight rollup of per-subject grades (curriculum unions `curriculum_id` + term subjects); `GpaResult {gpa\|null, flagged, perSubject[]}`; `flagged` on any partial/missing; empty ⇒ `gpa:null, flagged:true`; `TermNotFoundError`/`CurriculumNotFoundError` |
| `setMeasurement({type:'subject'\|'program', id}, {measurement_kind, binding_mode?})` | ED-10 · M1/M2 | **S8** — Education-forged measure, one-per-ref upsert (fail-loud ref; preserves the progress override); `measurement_kind` required (kind-agnostic at M1), `binding_mode` omittable ⇒ derive; separate storage (C-M5); `EducationMeasurement` |
| `getProgress({type:'subject'\|'program', id})` | ED-10 · M3 | **S8** — DERIVED on read, integer 0–100 or null; stored override wins; subject `derived-pull`/no-mode ⇒ `computeGrade×100`, `manual`/`event-trigger` ⇒ null; program ⇒ equal-weight rollup of its subjects (`[0,1]`-fed); no row ⇒ null (unmeasured, never 0) |

## Composition & conventions

- One `createRepository` per table; all 5 hierarchy tables have `deleted_at` → `softDelete:true`.
- **M1.0 `encryptedFields:[]`** — the `[E]` name/description fields pass through (real field encryption = M3).
- **No FK** (ADR-016 §3.4) — parent integrity is enforced in the SERVICE on create (fail-loud NotFound); a
  dangling *leaf* ref at read time is tolerated (`resolveParentChain` keeps `ok` true for a dangling program ref).
- Row→interface mappers cast the plain-text `_sync_status` to the union.
- **S4 session composition** — a `class` meeting composes the BUILT `SessionsService`/`SessionRegistry` (injected, never
  reconstructed); the base `sessions` row owns lifecycle/timing/soft-delete, `class_sessions` is a 1:1 extension keyed
  `session_id` (`softDelete:false` — no `deleted_at`), `subject_schedules` is `softDelete:true`. Derived reads resolve
  base times via `sessions.getSession` (boundary-respecting; N+1 bounded, no second read path into the sessions tables).

- **S5 ICS composition** — `ics_feed_configs` + `ics_synced_events` have NO `deleted_at` → both repos `softDelete:false`
  (revoke via `is_active`/`is_ignored`, never delete). `syncFeed`'s live fetch is the deny-safe `ics?` port (M2); the
  schema + add-only UNIQUE(feed_id,uid) dedup are M1 and proven via an injected stub port.
- **S6 grading composition** — `grading_systems` + `grading_components` both `softDelete:true`. The weight rule is a
  SERVICE invariant (cross-field sum, not per-row validation): non-null weights sum to 10000 bp or `GradingWeightError`,
  flagged never normalized, enforced before any write. `scale_config` is `[E]` JSON (serialize/parse). Duplicate
  `component_type` permitted by design; override-resolution (which scope's system applies) deferred to S7.

## Not yet built (homed per slice-map.md)
S7 assessments + grade/GPA compute · S8 education measurement · S9 subject vault + tags · S10 cross-module fan-out +
Journal. Frontend (dashboards/hub/builders) = ② `fe-learning-education` (P6).
M2 defers: ICS live fetch, document extraction (AI), real Tasks→Education reads, the M2 sync loop (skip inactive feeds).

## Carry-forwards
- **S5 (ICS DB-11): ✅ RESOLVED at S5** — `@vida/types` `IcsFeedConfig.default_course_id` → `default_subject_id` and
  `IcsSyncedEvent.matched_course_id` → `matched_subject_id` (reframe F3, matching schema learning.ts:118,144); R8
  consumer grep clean (only `dist/` + `_legacy/`). The mappers are the first `$inferSelect`↔interface consumers.
