<!-- CURRENT-SPEC · module: learning-education · the living contract (§XXIX Currency Rule) · never lags the code -->

# Learning: Education — CURRENT SPEC  (`@vida/core` `services/learning-education`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-learning-education ① S1 (LIF-130, #52). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createLearningEducationService(deps)` — the ① backend service tier for **the Learning hub (Education)** over
DB-4 `024_learning_education` (15 tables, the heaviest DB-4 group). The full design lives in
`docs/features/learning/education/` (aspect docs) + `docs/features/learning/education/delivery/`
(interpretation · slice-map · seam-contract). Build state: **① IN PROGRESS — S4 of 10 shipped** (hierarchy
spine + routing · subjects + DB-11 reconcile · curriculum fork + lineage · schedule + class sessions). Next: S5 ICS feeds.

A **pure service tier over a finished schema** (no DDL — DB-4 #12 authored all 15 tables; the aspect docs'
"⚠ INTENDED/no schema" language is pre-DB-4 and stale). The 7 Education entity_types
(`subject`/`institution`/`program`/`curriculum`/`term`/`assessment`/`subject_document`) are already registered
in `db/schema/_registry.ts:100-106` — composed, never re-registered.

## Delivered surface (as of S4)

`createLearningEducationService({ db, deviceId, sessions, sessionRegistry }) → LearningEducationService`.
Factory-object, hoisted closures, no `this.`. Deps grow per slice — S4 added the BUILT, injected
`sessions: SessionsService` + `sessionRegistry: SessionRegistry`; S5+ add spaces/notes/journalRegistry + deny-safe
`ics?`/`attachment?`/`tasks?`/`ai?` + the dormant `effects?` seam.

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

## Not yet built (homed per slice-map.md)
S5 ICS (deny-safe fetch) · S6 grading builder · S7 assessments + grade/GPA compute · S8 education measurement ·
S9 subject vault + tags · S10 cross-module fan-out + Journal. Frontend (dashboards/hub/builders) =
② `fe-learning-education` (P6). M2 defers: ICS live fetch, document extraction (AI), real Tasks→Education reads.

## Carry-forwards
- **S5 (ICS DB-11):** `@vida/types` `IcsFeedConfig.default_course_id` + `IcsSyncedEvent.matched_course_id` still
  carry pre-reframe names; the schema columns are `default_subject_id` / `matched_subject_id` (learning.ts:118,144,
  "reframe F3"). Reconcile in S5's ICS mapper (the first `$inferSelect`↔interface consumer). Caught by S2 review.
