<!-- Seam contract — features/learning/education ① backend · the service API the ② (fe-learning-education, P6)
     consumes. Signatures are the DESIGNED interface; exact types land per-slice via /api-contract.
     Session: 2026-10-02-mod-learning-education -->

# Seam contract — `LearningEducationService`

Factory: `createLearningEducationService(deps) => LearningEducationService`, mirroring `createBooksService` /
`createKnowledgeService`. **deps** (injected, all BUILT unless flagged deny-safe):

```
db, deviceId,
sessions: SessionsService,                 // createSession('class') + registry
measurement: { engine, /* no sourceRegistry advertise — C-M5 */ },
spaces: SpacesService,                      // entity_tags/entity_links/pages WRITES
backlinks/association resolvers,            // READ
knowledge?: { getMasterySource },          // consume object-mastery leaf (KN-10)
books?: { getPlansForConsumer },           // BK-12 passthrough (Books DONE)
journalRegistry: JournalRegistry,          // registerLearningEducationJournal
effects?: { rail: EffectRail; registry: EffectRegistry },  // S10 emit-only measurement signal; DORMANT at M1
                                           //   (no handler/named consumer, C-E2). Inline shape — `EffectsPort`
                                           //   name collides at the core barrel, don't import the symbol.
ics?: IcsFetchPort,                         // deny-safe ⇒ 'ics-unavailable' (M2)
attachment?: AttachmentPort,               // deny-safe ⇒ 'attachment-unavailable' (M2)
tasks?: TasksEducationPort,                // deny-safe ⇒ [] (services/tasks not built, C-HW)
ai?: AiPort,                               // deny-safe (document extraction = M2, C-AI4)
```
Entity_types (`subject`/`institution`/`program`/`curriculum`/`term`/`assessment`/`subject_document`) are
**already registered** (`_registry.ts:100-106`, DB-4 #12) — the service composes them, never calls `register`.

## Hierarchy (S1–S3)
- `createInstitution(input) → Institution` · `createSelfTaughtPath(input) → SelfTaughtPath`
- `createProgram(parentRef:{type:'institution'|'self_taught', id}, input) → Program`
- `createCurriculum(programId, input) → Curriculum`
- `forkCurriculum(sourceId, {name?}) → Curriculum`  — deep-copy + `forked_from_id` lineage; **throws `TemplateImmutableError`** on base write
- `createTerm(curriculumId, {level:'year'|'semester'|'term', parentTermId?}) → Term`
- `createSubject(input:{curriculumId?, termId?, degreeTier?, title, …}) → Subject`  — **throws `UnroutedSubjectError`** if the parent chain can't resolve (A1 levels skippable)
- `getHierarchy(programId) → HierarchyTree`  — collapsed per A1
- `listSubjects(filter) → Subject[]` · `update*`/`softDelete*` per entity (the 11 soft-delete tables; R4)

## Schedule & sessions (S4)
- `registerLearningEducation(): Promise<void>`  — registers the `class` session sub-type (idempotent; **call once before `createClassSession`**, R1)
- `setSchedule(subjectId, {source:'ics'|'document'|'manual'}) → SubjectSchedule`  — one per subject (UNIQUE)
- `createClassSession(subjectId, {scheduleId?, sourceEventId?, location?, …}) → ClassSessionView`  — `createSession('class')` + 1:1 extension
- `listSessions(subjectId) → ClassSessionView[]` · `getWeeklySchedule(range) → ClassSessionView[]`  (cross-subject)

## ICS (S5) — add-only; fetch deny-safe
- `addFeed(url, {defaultSubjectId?, autoCreateSessions?}) → IcsFeedConfig`
- `syncFeed(feedId) → SyncResult`  — **deny-safe**: `ics?` absent ⇒ typed `IcsUnavailable` (live fetch = M2); failure → `last_error` + `IcsSyncError` (never silent-stale)
- `matchEvent(eventId, subjectId) → IcsSyncedEvent` · `ignoreEvent(eventId) → void`  — add-only, revoke feed via `setFeedActive(id,false)` (never delete)

## Grading & assessments (S6–S7)
- `createGradingSystem(scope:{type:'institution'|'program'|'subject', id}, {scaleType, scaleConfig?, components:[{componentType, weight, maxPoints?}]}) → GradingSystem`  — **throws `GradingWeightError`** when component weights ≠ 100% (flag, never normalize)
- `createAssessment(subjectId, {type, gradingComponentId?, date?, weight?, maxPoints?, modality?, source?}) → Assessment`
- `recordResult(assessmentId, score) → Assessment`  — grade recomputes
- `listAssessments(filter:{subjectId?|type?|range?}) → Assessment[]`
- `computeGrade(subjectId) → GradeResult`  — derived via weighted components (R2)
- `computeGPA(termId|curriculumId) → GpaResult`  — partial + `flagged` on mixed/missing systems, never fabricated

## Measurement (S8) — Education-forged, derive-on-read
- `setMeasurement(ref:{type:'subject'|'program', id}, {measurementKind, bindingMode?}) → EducationMeasurement`  — `measurementKind` required (R3); separate storage (C-M5)
- `getProgress(ref) → number | null`  — derives via `measurement/engine` (`resolveProgress`/`rollup`); grade-derived mode pulls `computeGrade`; `null` = unmeasured

## Vault & tags (S9)
- `addDocument(subjectId, {title, docType?, blob?|storageRef?}) → SubjectDocument`  — **deny-safe** `attachment?` absent ⇒ `AttachmentUnavailable`
- `getVault(subjectId) → { documents: SubjectDocument[], notes: Page[] }`
- `tagEntity(ref, tagId)` / `linkEntities(from, to)`  — compose SpacesService (Education-scoped; guard `tagId` resolves, R: [[spaces-junctions-split-read-write-tagentity-blind-inserts]])

## Cross-module (S10) — deny-safe consume + Journal PULL
- `listEducationTasks(subjectId|'all') → EducationTask[]`  — **deny-safe** `tasks?` absent ⇒ `[]` (C-HW)
- `getBookPlansForSubject(subjectId) → ReadingPlan[]`  — passthrough to Books `getPlansForConsumer`
- `getMasteryForSubject(subjectId) → MasterySource`  — consume Knowledge KN-10 leaf `getMasterySource(subjectId: string)` (Education owns rollup)
- `getDayEducationDigest(date) → SectionData`  + `registerLearningEducationJournal(registry)`  — `/summary` PULL (class sessions + due assessments)

## Typed errors (fail loud — constitution §5)
`UnroutedSubjectError` · `TemplateImmutableError` · `GradingWeightError` · `IcsSyncError` · `IcsUnavailable`
· `AttachmentUnavailable` · `SubjectNotFoundError` (+ per-entity NotFound) · `InstitutionNotFoundError` …
All deny-safe ports return a typed `*-unavailable` outcome, **never a wired throw with no M1-reachable cause** (R9).

## What the ② (fe-learning-education, P6) owns, NOT this contract
Rendered dashboards/hub/builders, view-mode state (Zustand), optimistic cache (React Query), and the
immature My-Week/cross-subject/GPA-report views. `[FACT: slice-map.md backend/frontend split]`
