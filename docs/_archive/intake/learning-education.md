# Intake: Learning — Courses & Classes

<!-- /documentation Phase 1 (Intake). Sub-context 1 of 5 of Learning. No-Guessing: every claim cited. -->

Context: features/learning/courses-and-classes (Wave 2 — Learning foundation; hub the other Learning sub-contexts + Tasks link to)
Sources: v2 (ADR-002 §5.10 courses + §5.18 ICS + @vida/types/learning.ts + CLAUDE.md §7) · v1 (life-os src/features/learning + types/learning.ts) · user intent
Session: 2026-07-01 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)

**Data model — 3 tables** (of the Learning domain; other 9 tables belong to sibling sub-contexts) `[FACT: ADR-002 §5.10 L2372-2403, §5.18 L3581-3630; learning.ts]`:

- `courses` (= courses AND classes): `title`[E], `description`[E], `provider`[E], `instructor`[E], `url`[E], `course_type`{online,in_person,hybrid,self_paced}, `status`{not_started,in_progress,completed,dropped}, `progress` 0-100, `total_modules`/`completed_modules`, `start_date`/`end_date`/`target_completion`, `estimated_hours` (min), `rating` 1-5, `tags`[E], **`metadata`[E] JSON — "course-specific data, e.g. college class schedule"**. `[FACT: L2372-2403; learning.ts L100-128]`
- `ics_feed_configs`: `feed_url`[E], `feed_name`[E], `is_active`, `auto_create_sessions`, `default_course_id` (SET NULL), `sync_interval_hours` (def 6), `last_synced_at`, `last_error`[E], `metadata`[E]. `[FACT: L3581-3601]`
- `ics_synced_events`: `feed_id` (CASCADE), `uid`, `summary`/`description`/`location`[E], `start_time`/`end_time`, `recurrence_rule`, `matched_course_id` (SET NULL), `created_session_id`, `is_ignored`, `raw_event`[E]. **UNIQUE(feed_id, uid)**. `[FACT: L3604-3630]`

**Intent (CLAUDE.md §7)** `[FACT: CLAUDE.md §7]`: class registration (college + online, `course_type` discriminator); **ICS feed sync** (add ICS URLs → relate to courses → auto-sync events); **weekly schedule** view from synced events; **class standalone pages** (info, schedule, syllabus, books, homework, exams); **homework** (registration + standalone pages within class); **schedule & syllabus** document upload (PDF/DOC); **exams/quizzes/tests** (registration + auto-record from scraped syllabus/schedule/ICS); **auto-record** (homework from ICS, exam/quiz dates from syllabus+schedule); **book-to-class linking**.

**Cross-cutting:** `course` is a valid `entity_links` note target `[FACT: ADR-002 L1344]`; Tasks link via `task.course_id` (homework?) `[FACT: ADR-002 §5.3]`; study_sessions/books/topics reference courses (sibling sub-contexts).

## B. WHAT v1 DID — life-os learning (legacy)

`[FACT: life-os src/features/learning + types/learning.ts]`

- Pages: CoursesPage · **CourseDetailPage** · LearningDashboard + (Books/Skills/Knowledge/StudyPlanner/StudySessions — sibling sub-contexts). `[FACT: pages]`
- v1 `course_type` = **`online_course` | `college_class`** (v2 changed to online/in_person/hybrid/self_paced). `[FACT: types L7]`
- v1 **`CollegeGrade`** enum (A+…F, W, I, P, NP) + **`CollegeClassData`** interface (schedule + `grade`) **stored in course metadata** — same metadata-JSON pattern v2 keeps. `[FACT: types L8, L16-25]`
- v1 **`TopicImportSource`** = {syllabus, toc, schedule, csv, manual} + "Reading Assignment Fields" (`class_date`) → **auto-import of topics/assignments from syllabus/schedule**. `[FACT: types L288, L321-322]`
- v1 had `schedule`/`scheduling` component dirs. `[FACT: components]`

### Key notes (v2 vs intent)

1. **Classes are `courses`**, distinguished by `course_type`; college class schedule lives in **`courses.metadata` JSON** (unstructured). `[FACT: L2391; learning.ts L126-127]`
2. **NO tables for homework, exams/quizzes/tests, syllabus/schedule documents** — all named in CLAUDE.md §7 but absent from the schema. `[FACT: §5.10 has none]`
3. v2 **dropped structured grades/GPA** (v1 `CollegeGrade`); only a 1-5 `rating` remains → the reconciliation "Learning verify" item. `[FACT: learning.ts vs v1 types L8]`
4. ICS sync is well-modeled (2 tables) incl. `auto_create_sessions` + event↔course matching. `[FACT: §5.18]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)

G1 — **Scope / views**: courses/classes list · **class standalone page** (info · schedule · syllabus · books · homework · exams · study sessions · knowledge) · **weekly schedule** view (from ICS). Confirm.
G2 — ⚠ **Class schedule structure**: today it's `courses.metadata` JSON (unstructured). Keep as JSON, or a **structured** class-schedule (a table / derived from `ics_synced_events`)? The "weekly schedule" view needs consistent structure. Resolve.
G3 — ⚠ **Grades / GPA (reconciliation verify)**: v1 had `CollegeGrade` + grade; v2 dropped it (only `rating`). **Restore structured grades + GPA calculation** for college classes? (ties to v1 CR-002 GPA, OR-003 grade calc.) Decide.
G4 — ⚠ **Homework model**: is homework a **Task** (`task.course_id`, reuse Tasks) or its own structured entity (registration + standalone page per CLAUDE.md)? If Tasks, how does "homework standalone page within class" work vs the Tasks module?
G5 — ⚠ **Exams / quizzes / tests**: no table. New **`course_assessments`** table (type ∈ exam/quiz/test, date, weight, grade)? Or Tasks/events? Plus auto-record from syllabus/ICS. Resolve shape.
G6 — ⚠ **Syllabus & schedule documents**: no table. Class doc upload (PDF/DOC) — reuse a `project_documents`-style **`course_documents`** table (inline blob + R2 for large, per Projects PJ-8)? Resolve.
G7 — ⚠ **Auto-record / auto-linking scope**: CLAUDE.md wants homework from ICS, exam/topic dates from **scraped syllabus/schedule**, book-TOC↔schedule linking. This = **device-side parsing** of user-uploaded docs + ICS (ZK-safe, extension-model). Which auto-records are in v1 scope vs deferred? (Parsing a PDF syllabus is non-trivial.)
G8 — **ICS sync flow**: confirm — user adds feed URL → **device-side fetch** (ZK) every `sync_interval_hours` → dedup by (feed_id, uid) → match to course (`matched_course_id`; how? by title/keyword?) → optionally `auto_create_sessions` (study sessions) + surface in the weekly schedule. Confirm matching + fetch-is-device-side.
G9 — **Cross-module / sub-context hub**: confirm this sub-context is the hub the others attach to — Books (book↔class linking), Knowledge (topics per class), Study Sessions (study on a class), Tasks (homework). Read via integration points.
G10 — **Notes via pages**: class/course notes + per-homework/per-exam notes via `pages` (`course` already valid; homework/exam entity_types if they become tables). Confirm.
G11 — **Tags**: `courses.tags` inline `[E]` → shared scoped tags? Confirm.
G12 — **Course progress**: `progress` + `total_modules`/`completed_modules` — auto-derived (from completed modules / study sessions / homework), or manual? Confirm.

## ⚠⚠ SCOPE REFRAME — IN PROGRESS (Victor, 2026-07-01) — NOT gaps yet; establish hierarchy first, THEN gaps

The current flat `courses`/`classes` organization is **wrong** vs Victor's vision. New model (net-new in v2, not in v1):

**Two study MODES** (unified under one hierarchy):

- **Formal education** — institution-granted (high school, university bachelor/master, doctorate/PhD).
- **Self-taught** — no institution; the learner **mirrors a formal degree's program/curriculum** to self-direct learning.

**Creation flow:** the user starts a new **Program** he wants to learn and picks **Institution** or **Self-taught**.
Self-taught can **draw inspiration from existing institutions' programs** — mix/fork them into his own curriculum.

**Full hierarchy (8 levels, top→down):** `[INTENT: Victor 2026-07-01]`

1. **Institution / Self-taught** — a real institution OR the self-taught mode marker.
2. **Program** — the field/pursuit the user wants to learn (Computer Science, Medicine).
3. **Curriculum** — **what the user wants to learn, as he shapes the program.** Formal → bounded by what the
   institution offers; Self-taught → user owns scope + direction (may be "messy" but purposeful). The forkable
   shaping layer.
4. **Degree** — level / difficulty tier (high-school · bachelor · master · doctorate/PhD). A curriculum may span
   several degrees.
5. **Term / Semester / Year** — time grouping (formal uses it; self-taught may skip).
6. **Subject / Course** — the study unit ("Calculus I") = today's `courses` table, reinterpreted.
7. **Module / Unit** — courses.total_modules/completed_modules.
8. **Topic** — study_topics / knowledge_notes.

⚠ Adds **4 new levels ABOVE the current `courses` table** (Institution · Program · Curriculum · Degree) + a Term
grouping → the sub-context will be **RENAMED** (no longer "Courses & Classes") and needs new parent tables.

**Accepted additions (Victor confirmed "it matches", 2026-07-02):** `[INTENT]`

- **A1 — Optional depth.** Every intermediate level is skippable; the hierarchy is the _maximum_ shape, each user
  collapses it (formal PhD = all 8; casual self-taught = Program → Subject → Topic).
- **A2 — Progress rolls up the whole chain** (derived cache, Projects pattern): Topic → Module → Subject → Term →
  Degree → Curriculum → Program. Degree may weight the rollup.
- **A3 — Curriculum = forkable template.** Institution programs modeled as curriculum templates a self-taught user
  can FORK and remix ("inspired by MIT CS"). Templates = local seed data / user-imported (ZK-safe, device-side).
- **A4 — Subject vs Class = Master-Instance (v1 SR-006).** Subject = reusable definition ("Calculus I"); Class =
  scheduled instance in a Term (ICS events, room, times) — separates "what I study" from "when it meets".

Status: **SCOPE SET** → gaps reshaped below.

## C2. RESHAPED GAP MAP (2026-07-02) — supersedes G1–G12 above (folded in; originals kept for audit)

H1 — **Naming**: rename the sub-context — "Learning: Education"? (folder `docs/features/learning/education/`).
H2 — **New tables**: `institutions` · `programs` · `curricula` (+ fork/template lineage) · `degrees` (or a
degree field on curriculum?) · `terms` · subjects = existing `courses` (renamed? reinterpreted?) · **`classes`
(Master-Instance, A4)**. Confirm which are real tables vs fields. → ADR-002 amendment (largest yet).
H3 — **Grades/GPA** (ex-G3): restore structured grades at the Class/assessment level, GPA rolls up per Term/
Degree/Curriculum? (v1 CollegeGrade + reconciliation verify-item.)
H4 — **Homework** (ex-G4): a Task (`course_id`→subject/class) surfaced class-scoped, or own entity?
H5 — **Assessments** (ex-G5): `course_assessments` table (exam/quiz/test, date, weight, grade → feeds H3)
attached to a **Class** (instance) or Subject?
H6 — **Documents** (ex-G6): syllabus/schedule vault per Subject/Class (Projects PJ-8 pattern, inline+R2)?
H7 — **Auto-record scope** (ex-G7): ICS auto-record NOW; syllabus/schedule scraping DEFERRED (AI/extension)?
H8 — **ICS flow** (ex-G8): device-side fetch; events match to a **Class** (A4) → weekly schedule. Confirm.
H9 — **Views** (ex-G1): hierarchy browser (Program→…→Topic) · Class standalone page · weekly schedule ·
program/curriculum dashboards (rollup, A2). Confirm set.
H10 — **Curriculum templates** (A3): source = local seed pack + user-imported files (ZK)? Fork = deep copy with
lineage pointer? Confirm.
H11 — **Notes/tags** (ex-G10/G11): pages on which levels (program/curriculum/subject/class)? shared scoped tags?
H12 — **Progress** (ex-G12): rollup weights — plain count first, degree-weighted later (A2)? Confirm.

## Resolution

`[INTENT: Victor, 2026-07-02/03]` — **WHOLE.** All H-gaps + views + review items resolved.

- **H1 — Name: "Learning: Education"** (folder `docs/features/learning/education/`). CONFIRMED.
- **H2 — Tables: SEPARATE `institutions` AND `self_taught` tables** (not one table with a mode flag) — both can
  parent Programs. Plus `programs` · `curricula` (fork lineage) · `terms` (time container: name + start/end +
  parent curriculum; optional per A1) · **subjects** (= reinterpreted `courses`, attached to a Term) ·
  **`class_sessions`** (see H5). Degree = a tier field, not a table. ⚠ "proper router for subjects" — Victor's
  phrase, interpretation pending confirmation (subject always routed up the chain: curriculum → term → degree
  tier, never orphaned).
- **H3 — Grades = a GRADING SYSTEM entity (builder), FULLY FLEXIBLE.** `[INTENT: refined 2026-07-03]` A
  `grading_systems` entity so the user can **shape a grading system equal to the one actually used** — defined
  per institution, per self-taught program, or overridden per subject. Must be flexible enough for real professor
  practice: **weighted components** (homework at different weights/punctuation, professor-given tasks, exams,
  quizzes, tests each carrying their own weight/points), per-professor variation per subject, and assessment
  **modality** (online vs requiring physical presence). Grades/GPA compute against the chosen system (A–F, 0–10
  Brazil, pass/fail, custom scales + custom component weights).
- **H4 — Homework = a dedicated Tasks-Universe entity for Education** (same pattern as Project-Tasks): lives in
  Tasks, separate entity/scope only for Learning: Education, consumed via a **dedicated Tasks→Education API**,
  education-scoped UI.
- **H5 — RESOLVED (Victor's simplification adopted): Class = a SESSION of a Subject.** Subject = the enrollable
  unit in a Term; **class_sessions** = its individual scheduled meetings (weekly schedule = sessions; ICS events
  map to sessions). **Assessments/grades/documents/homework attach to the SUBJECT.** Retake = new subject row in
  a new term. (Replaces A4's two-tier Master-Instance with Subject + sessions.)
- **H6 — Vault per Subject, holding documents AND the subject's notes** (notes surfaced inside the vault — one
  place per subject). CONFIRMED (inline+R2, PJ-8 pattern).
- **H7 — Auto-record: ICS now + DOCUMENT-derived + MANUAL shaping — via a new SCHEDULE entity.** `[INTENT]`
  Sometimes there is no ICS, only documents; sometimes the user must shape the schedule himself (esp.
  self-taught). ⇒ a **`subject_schedules` entity** per subject, fed by three methods: (a) ICS sync (now),
  (b) document extraction (⚠ deferred to AI/extension work), (c) manual/user-shaped. The schedule entity is the
  single source the weekly view + sessions derive from.
- **H8 — ICS matches per SUBJECT** (events → that subject's class_sessions). CONFIRMED, device-side (ZK).
- **H5 addendum (2026-07-03) — assessment types:** exams · quizzes · tests · **presentations** · **works**
  (catch-all for anything not fitting the other criteria). All carry weight/points/modality per the grading
  system. `[INTENT]`
- **H9 — VIEWS (Victor, 2026-07-03).** `[INTENT]`
  1. **Programs Dashboard** — all Programs, groupable/filterable by method (institutional vs self-taught);
     showcases progress + how the user is developing: areas he is **acing** vs **lacking/needs improvement**.
  2. **Education Hub page** — tabbed; every tab supports user-chosen view modes (timeline · list · kanban · …)
     AND grouping via the **universal tag system scoped to Learning: Education** (other modules can relate to
     programs/curricula/subjects through tags/links). Tabs:
     **Institutions** (user can have programs across several) · **Self-Education** (self-taught programs only) ·
     **Curriculums** · **Degree** · **Term/Semester/Year** (all time containers) · **Subjects/Courses** (the user
     picks which NAME to display — visual preference only, no DB change) · **Modules/Units** · **Topics** ·
     **Grading Systems** (create/group/view the systems built per subject).
  3. **Dedicated page per Institution.**
  4. **Dedicated page per Program.**
  5. **Dedicated page per Curriculum** — shaping surface: different views, forkable templates, and a curriculum
     **BUILDER** in its own terms.
  6. **Dedicated page per Degree** — scopes all Terms/Subjects/Modules below it, grouped by Institution and
     Curriculum; user-created views; ships a **default schema** with pre-filled views so the user situates
     himself instead of drowning in personalization.
  7. **Dedicated page per Term/Semester/Year** — with **internal time hierarchy: terms ⊂ semesters ⊂ years**,
     differentiated in the UI; personalization + a default scheme (same anti-lost principle).
  8. **Dedicated page per Subject** — schedule and everything attached. ⚠ NOTE: from Subject down to Topics,
     information is **sparse and progressively fillable** — pages must render gracefully with partial data and
     invite increments (not demand completeness).
  - **Design principle (Victor):** heavy personalization everywhere, but ALWAYS a sensible default scheme so the
    user "does not get lost and waste time personalizing instead of doing."
  - ⚠ **Terms refinement surfaced:** the time container is itself hierarchical (year > semester > term) — the
    `terms` entity needs a type/level + optional parent. `[INTENT]`
- **H9 addendum — review items ruled (Victor, 2026-07-03):** `[INTENT]`
  - **Assessments tab** added to the Education Hub + **a dedicated page per assessment TYPE** (all exams · all
    quizzes · all tests · all presentations · all works — cross-subject, per type).
  - Review items **1 (My-Week schedule), 2 (cross-subject assessments view), 3 (grades/GPA report): IN — but
    ⚠ INTENDED-IMMATURE**: they lean on information from other modules, so they are recorded as intent to be
    **perfected later**, not fully-shaped views.
  - **4 (all-homework education-scoped surface): IN** (small Hub tab, via the Tasks→Education API).
  - **5 (curriculum template gallery): IN** — a **subtab under Curriculums or inside the builder's view** (to be
    improved). Key mechanic: the user **inputs his institution's / each program's default curriculum** as the
    BASE, then picks and shapes his own from it, per his own needs and intent.
- **H10 — Forkable templates CONFIRMED + free shaping**: the user may also shape a curriculum entirely to his own
  accord/thought-system (fork-and-remix OR from scratch). Lineage pointer when forked.
- **H11 — Notes+tags CONFIRMED (elaborated):** `pages` notes on Program / Curriculum / Subject (surfaced in the
  subject vault, H6) / optionally class_session; Module/Topic notes stay with the Knowledge sub-context
  (`knowledge_notes` — no duplication). Shared scoped tags on Program/Curriculum/Subject only.
- **H12 — Progress = the PROJECTS methodology, FORGED SEPARATELY for Education.** `[INTENT: refined 2026-07-03]`
  Fluid, not pragmatically set: the user may define **deliverables and goals** for Subjects and the Program;
  progress may derive from different works/measures **depending on the grading system** etc. ⇒ Education follows
  the same multi-type measurement **PATTERN** as Projects (PJ-4: grade-derived · deliverable · goal · manual ·
  count) but as its **own Education-scoped entity** — NOT shared storage with Projects, so the two modules' data
  and purposes never mix. One design pattern, two separate forges. ⚠ the measurement design pass covers both.
- **H2 addendum — "proper router" CONFIRMED (2026-07-03):** every Subject is always routed up the chain
  (curriculum → term → degree tier) — never an orphaned flat list like v2's `courses`.

### ⚠ New INTENDED surface (→ ADR-002 amendment, largest yet + design passes)

`institutions` · `self_taught` · `programs` · `curricula`(+lineage) · `terms` · `class_sessions` ·
`subject_schedules` (3-method) · `grading_systems` (builder) · assessments (per subject, vs H5) · education-task
entity (Tasks Universe) · vault per subject · multi-type Education progress (shared design with Projects
measurement pass).

## Change Log

| Date          | Session                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-01    | documentation-blueprint | intake harvested (v2 ADR-002 §5.10 courses + §5.18 ICS + learning.ts + CLAUDE.md §7; v1 life-os learning — CollegeGrade/CollegeClassData/TopicImportSource); gap map G1–G12. ⚠ Big INTENDED surface: no tables for homework/exams/syllabus-docs; grades/GPA dropped; schedule is metadata JSON; heavy auto-record. First of 5 Learning sub-contexts.                                                                                                  |
| 2026-07-01/02 | documentation-blueprint | ⚠⚠ SCOPE REFRAME (Victor): 8-level hierarchy (Institution/Self-taught → Program → Curriculum → Degree → Term → Subject → Module → Topic) + A1–A4 additions accepted. G1–G12 superseded by reshaped H1–H12. Sub-context RENAMED → **Learning: Education**.                                                                                                                                                                                             |
| 2026-07-03    | documentation-blueprint | H1–H12 + views resolved → intake **WHOLE**. Grading-system builder (flexible weights/modality); assessments incl. presentations + works; homework = education-task in Tasks Universe; subject_schedules (ICS/doc/manual); Education-forged measurement (Projects pattern, separate storage); full H9 view set (dashboard, 10-tab hub, 6 dedicated-page families) + My-Week/assessments-view/GPA-report as INTENDED-immature; template gallery subtab. |
