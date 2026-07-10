<!-- Contract — features/learning/education · /documentation Phase 2 · sources: ADR-002 §5.10/§5.18 · learning.ts · intake -->

# Contract — Learning: Education  (level: Feature / Learning sub-context)

> **Status:** types exist for the FACT base only (`Course`, `IcsFeedConfig`, `IcsSyncedEvent` in
> `@vida/types/learning.ts`); `@vida/core` `models/learning.ts` + `utils/ics-parser.ts` exist but are **empty
> placeholders (0 lines)** — no service. The entire hierarchy above subjects, grading
> systems, assessments, schedules, sessions, and measurement are ⚠ INTENDED (no schema). Signatures below are
> the **designed interface**. `[FACT: learning.ts L100-128, L407-440; ADR-002 §5.10/§5.18]`

## Exposed surface (via `@vida/core`)
- **Hierarchy CRUD (⚠ INTENDED):** `createInstitution` / `createSelfTaughtPath` · `createProgram(parentRef)` ·
  `createCurriculum(programId, {fromTemplate?})` (fork = deep copy + lineage, ED-11) · `createTerm(curriculumId,
  {level: year|semester|term, parent?})` (ED-12) · `createSubject(curriculumId, {termId?, degreeTier})` (routing
  enforced, ED-3) · `getHierarchy(programId)` (collapsed per A1)
- **Subjects (= `courses`, FACT base)** (`Course` `[FACT: learning.ts L100-128]`): CRUD + `listSubjects(filter)`;
  modules via `total_modules`/`completed_modules`.
- **Schedule & sessions (⚠ INTENDED):** `setSchedule(subjectId, source: ics|document|manual, data)` (ED-5) ·
  `getWeeklySchedule(range)` → sessions across subjects (My-Week, ⚠ immature) · `listSessions(subjectId)`
- **ICS (FACT base):** `addFeed(url, {default_course_id?, auto_create_sessions?})` · `syncFeed(id)` (device-side,
  ED-6) · `matchEvent(eventId, subjectId)` · `ignoreEvent(eventId)` `[FACT: §5.18]`
- **Grading systems (⚠ INTENDED, ED-7):** `createGradingSystem(scope: institution|program|subject, {scale,
  components:[{type, weight, points}]})` · `computeGrade(subjectId)` · `computeGPA(termId|curriculumId)`
- **Assessments (⚠ INTENDED, ED-8):** `createAssessment(subjectId, {type: exam|quiz|test|presentation|work,
  date, weight, modality})` · `recordResult(id, score)` → grade recomputes · `listAssessments(type|subject|range)`
- **Homework (⚠ INTENDED, ED-9):** consumed via the **Tasks→Education API** (Tasks owns the entity):
  `listEducationTasks(subjectId|all)` · education-scoped task UI.
- **Vault (⚠ INTENDED, ED-13):** `addDocument(subjectId, file)` (inline/R2) · `getVault(subjectId)` → docs +
  notes together.
- **Measurement (⚠ INTENDED, ED-10):** `setMeasurement(subjectId|programId, {type: grade|deliverable|goal|
  manual|count, source})` · `getProgress(ref)` — Education-forged entity.

## What it consumes (outside dependencies)
- **Tasks** — the dedicated Tasks→Education API (homework/education-tasks; TK-9-compliant). `[INTENT H4]`
- **Notes & Pages** — notes on Program/Curriculum/Subject (in-vault)/session via `pages` (`course` is a valid
  target today; new entity_types with the amendment). `[FACT: ADR-002 L1344; INTENT H11]`
- **Shared scoped tags** — Education scope, on Program/Curriculum/Subject. `[INTENT H11]`
- **Preferences** — Subjects-vs-Courses display name (visual only), view defaults, sync intervals. `[INTENT H9]`
- **⚠ Extension layer (deferred):** document extraction (syllabus→schedule/assessments) — AI-agentic, opt-in.

## Fed by / Consumed by
- **Hub for the Learning siblings:** Study Sessions (sessions target subjects), Flashcards (decks per
  subject) read Education's contract; **Books** (own module since 2026-07-03) connects via its **partition**
  (`book_subjects` + Books→Education API: books-per-subject, pace vs schedule/assessments); **Knowledge** (own
  module since 2026-07-10) links its objects to Education's planning Topics and **provides a mastery
  measurement source** — object mastery + assessment results + pace-vs-syllabus (KN-2/KN-10). Education owns
  the rollup + the syllabus-as-calendar entity. `[FACT: intake; ../../books/contract.md; ../../knowledge/contract.md; CLAUDE.md §7]`
- **Journal `/summary` + global Calendar** → today's class sessions + due assessments. `[INTENT]`
- **Purpose/Gamification** → study progress signals (⚠ INTENDED). `[INTENT]`

## Contract error cases
- `createSubject` without a resolvable parent chain → typed `UnroutedSubjectError` (ED-3). `[INTENT]`
- `syncFeed` failure → recorded in `last_error`, typed `IcsSyncError` (never silent-stale). `[FACT: L3590]`
- Grading components summing ≠ 100% → typed `GradingWeightError` (flag, don't normalize). `[INTERP ED-7]`
- `computeGPA` with mixed/missing systems → partial + flag, never a fabricated GPA. `[INTERP ED-7]`
- Fork of a template never mutates the base (`TemplateImmutableError` on attempted write). `[INTENT ED-11]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
