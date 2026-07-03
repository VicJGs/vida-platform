<!-- Structure & Data — features/learning/education · /documentation Phase 2 · sources: ADR-002 §5.10/§5.18 · learning.ts · intake -->

# Structure & Data — Learning: Education  (level: Feature / Learning sub-context)

## Data model — FACT base: 3 tables `[FACT: ADR-002 §5.10 L2372-2403, §5.18 L3581-3630; learning.ts]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `courses` (→ **subjects**) | the study unit | title, description, provider, instructor, url, tags, metadata | `course_type` CHECK(4); `status` CHECK(4); `progress` 0-100; modules counters; `rating` 1-5 |
| `ics_feed_configs` | calendar feeds | feed_url, feed_name, last_error, metadata | `default_course_id` SET NULL; `sync_interval_hours` def 6 |
| `ics_synced_events` | synced events | summary, description, location, raw_event | `feed_id` CASCADE; **UNIQUE(feed_id, uid)**; `matched_course_id` SET NULL |

- `courses.metadata` `[E]` JSON held v1-style college data (schedule, grade) — **superseded** by the structured
  entities below. `[FACT: L2391; v1 CollegeClassData]`
- Structured columns sync **LWW**; vault blobs follow the attachment path. `[FACT: ADR-003]`

### ⚠ INTENDED model (the reframe — largest ADR-002 amendment yet) `[INTENT: reframe + H1–H12 + A1–A4]`
| New entity | Role | Key points |
|---|---|---|
| `institutions` | formal parent | real institutions; user-entered |
| `self_taught` | self-taught parent | SEPARATE table (H2); the mode container |
| `programs` | the pursuit | parents to institution OR self_taught (ED-2) |
| `curricula` | the shaped plan | fork lineage pointer; institution-bounded or free (ED-11) |
| degree tier | difficulty | a FIELD (enum: high_school/bachelor/master/doctorate), not a table |
| `terms` | time containers | hierarchical: year ⊃ semester ⊃ term (type + optional parent, ED-12); optional (A1) |
| **subjects** | = `courses` reinterpreted | always routed: curriculum → term? → degree tier (ED-3); "Subjects/Courses" display name = a Preference |
| `class_sessions` | meetings of a subject | weekly schedule renders from these; ICS events map here (ED-4/ED-6) |
| `subject_schedules` | single schedule source | fed by ics / document (deferred) / manual (ED-5) |
| `grading_systems` | grading builder | scope: institution/program/subject; weighted components (homework·tasks·exams·quizzes·tests·presentations·works), scale, per-professor flexibility (ED-7) |
| assessments | subject-attached | type ∈ exam/quiz/test/presentation/work; date, weight/points, **modality**, grade (ED-8) |
| education-task | homework | lives in the **Tasks Universe**, Education-scoped, via Tasks→Education API (ED-9) |
| subject vault | docs + notes | inline + R2, client-encrypted (ED-13, PJ-8 pattern) |
| Education measurement | fluid progress | multi-type (grade/deliverable/goal/manual/count), **Education-forged** — same pattern as Projects, separate storage (ED-10) |

- ⚠ Reconciliations at build: `course_type` vs the Institution/Self-taught mode level; `entity_links` gains the
  new entity_types; shared-tags migration for `courses.tags`.

## State management map `[FACT: ADR-001 State]`
- **React Query** owns hierarchy/subject/schedule/assessment reads + optimistic writes; **derived** grade/GPA and
  measurement computations (invalidate up the chain on any descendant change); device-side ICS sync jobs.
- **Zustand** owns ephemeral UI: hub tab + view mode + grouping per tab, curriculum-builder draft, template-fork
  state, schedule editor, grading-system builder draft.
- Grades, GPA, and progress are **derived** (ED-7/ED-10) — never hand-maintained truth.

## Page / route map `[INTENT H9]`
- **Programs Dashboard** — all programs, grouped/filtered by mode; progress + acing/lacking areas.
- **Education Hub** — 11 tabs (Institutions · Self-Education · Curriculums · Degree · Term/Semester/Year ·
  Subjects/Courses · Modules/Units · Topics · Grading Systems · **Assessments** · Homework), each with
  user-chosen view modes (timeline/list/kanban/…) + Education-scoped tag grouping; **defaults always shipped**
  (ED-15).
- **Dedicated pages:** per Institution · per Program · per Curriculum (**builder** + template-gallery subtab) ·
  per Degree (scopes Terms/Subjects/Modules below; default schema + user views) · per Term/Semester/Year
  (hierarchical UI) · per Subject (schedule, vault+notes, assessments, homework; sparse-data-graceful, ED-14) ·
  **per assessment TYPE** (all exams / quizzes / tests / presentations / works).
- ⚠ INTENDED-immature (perfect later; lean on other modules): **My-Week** cross-subject schedule ·
  cross-subject assessments view · grades/GPA report.

## Dependencies / graph
- **Wave 2; THE Learning hub.** In-edges: Books, Knowledge, Study Sessions, Flashcards (siblings attach here);
  Journal/Calendar read sessions+assessments. Out-edges: Tasks (Education API), Notes (pages/vault), Preferences,
  shared tags; ⚠ extension layer (document extraction). No direct cross-module table reads (§6). `[FACT: core §6; intake]`

## Single source of truth (constitution §3)
- **Schedule:** one `subject_schedule` per subject; sessions + weekly views derive from it (ED-5).
- **Grades/GPA:** derive from assessments through the grading system (ED-7) — never stored as authority.
- **Progress:** the Education measurement entity (ED-10) — one measured value per ref, derived.
- **Homework:** owned by Tasks, read via the API (ED-9) — never copied.
- Enums as string-literal unions + CHECK + Zod, declared once. `[FACT: learning.ts; conventions]`

## ADRs / structural decisions
- **ADR-002 §5.10/§5.18** — FACT base. **ADR-001** — RQ+Zustand, TipTap notes, R2. **ADR-003** — LWW + attachments.
- ⚠ **Surfaced:** (1) the hierarchy amendment (14 entities above — largest yet); (2) grading-system component
  model (design pass); (3) measurement pattern shared w/ Projects, forged separately (design pass); (4) document
  extraction under the extension-model/AI ADR. `[INTENT]`

## Completion checklist
- [x] data model (FACT 3 + INTENDED 14) · [x] dep graph (Learning hub) · [x] state + route map · [x] ADRs · [x] single source per concern · [x] [FACT/INTENT/INTERP] each claim
