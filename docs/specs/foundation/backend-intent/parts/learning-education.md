# Backend Intent — Part A: learning-education

> Scope: the **Learning: Education** hub (`docs/features/learning/education/*`) — the heaviest module: an
> 8-level academic hierarchy (Institution/Self-taught → Program → Curriculum → Degree → Term → Subject →
> Module → Topic) + ICS-synced schedules + a fully-flexible grading-system builder + assessments +
> per-subject vaults + measured progress. **FACT base = 3 schema-only tables** (`courses`→subjects,
> `ics_feed_configs`, `ics_synced_events`) with **0 lines of service logic** — `@vida/core`
> `models/learning.ts` + `utils/ics-parser.ts` are empty placeholders (contract.md:6-9). **Nearly the entire
> hierarchy is ⚠ INTENDED** (the largest ADR-002 amendment yet); the designed interface in contract.md is the
> intent authority for the service surface.
>
> Sources used: S1 (5-aspect education docs), S2 (`docs/intake/learning-education.md`), S4
> (`part-1.2-reruns/learning-education.md` — the rerun that named the X*/AI*/M1-M2/SP1 tokens), S7
> (`services/learning/CLAUDE.md` — directory home only), S8 (CLAUDE.md §7). **No §9 bucket:** Education is an
> **M1.2 Learning** module (m1.1-delivery-plan.md:251 "Education → M1.2 Learning"), so it has no MOD-* build
> block in the M1.1 delivery plan (only M1.1 modules do — confirmed). The rerun is CRITIQUE-CLEAN / IMPLEMENTED
> (rerun:4) so the aspect docs already carry the driver tokens.
>
> Boundary calls carried from the rerun (do NOT re-derive): homework is **Tasks-owned** (ED-9, C-HW),
> Education is **NOT** an economy feeder (C-E2, no `grant_currency`), extraction is a **scoped extract not an
> AI4 agent** (C-AI4), no M5 measure-source seam (C-M5), Knowledge PROVIDES the mastery source (Education owns
> the Program-level rollup). Everything above the 3-table floor is ⚠ INTENDED unless a FACT-base column is
> cited.

| id | description | source (file:line) | evidence | boundary | cross-cutting | candidate home |
|----|-------------|--------------------|----------|----------|---------------|----------------|
| LEA-01 | `createInstitution({name,...})` — create a formal-education parent (real institution, user-entered) | contract.md:12-13; structure-data.md:20; intake:109-112 | FACT (designed interface, ⚠ INTENDED — no schema) | service | module-local | education-service |
| LEA-02 | `createSelfTaughtPath({...})` — create a self-taught parent in a SEPARATE table (ED-2: never one table with a mode flag) | contract.md:12-13; business-rules.md ED-2:16-17; structure-data.md:21; intake:108-112 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-03 | `createProgram(parentRef)` — create a Program parenting to an institution OR a self_taught row (ED-2) | contract.md:13; business-rules.md ED-2:16-17; structure-data.md:22 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-04 | `createCurriculum(programId,{fromTemplate?})` — create a curriculum; fork = deep copy + lineage pointer (ED-11) | contract.md:13-14; business-rules.md ED-11:52-55; structure-data.md:23; intake:174 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-05 | `createTerm(curriculumId,{level:year\|semester\|term, parent?})` — create a hierarchical time container year ⊃ semester ⊃ term (ED-12) | contract.md:14-15; business-rules.md ED-12:56-57; structure-data.md:25; intake:155-163 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-06 | `createSubject(curriculumId,{termId?, degreeTier})` — create a Subject with the parent chain enforced (ED-3 routing) | contract.md:14-15; business-rules.md ED-3:18-19; structure-data.md:26 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-07 | Enforce ED-3 — a Subject is ALWAYS routed up the chain (curriculum → term? → degree tier), never an orphaned flat list; unresolvable parent → typed `UnroutedSubjectError` | business-rules.md ED-3:18-19; contract.md:61; conventions.md:6-7,39 | FACT (invariant, ⚠ INTENDED) | service | module-local | education-service |
| LEA-08 | `getHierarchy(programId)` — read the hierarchy, collapsed per A1 (skipped intermediate levels are collapsed, not broken) | contract.md:15; identity.md:25; business-rules.md:19; intake:71-73 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-09 | Optional depth (A1) — every intermediate hierarchy level is skippable; the hierarchy is the MAXIMUM shape, collapse on read | identity.md:25; business-rules.md ED-3:18-19; conventions.md:6-7; intake:71-73 | FACT (rule, ⚠ INTENDED) | service | module-local | education-service |
| LEA-10 | Subject CRUD (= `courses` FACT base) — create/read/update/delete over the live `courses` table (reinterpreted as subjects) | contract.md:16-17; structure-data.md:9; intake:9; learning.ts L100-128 | FACT (courses table is live schema; service is 0-line placeholder) | service | module-local | education-service |
| LEA-11 | `listSubjects(filter)` — list/query subjects | contract.md:16-17 | FACT (⚠ INTENDED service; courses table live) | service | module-local | education-service |
| LEA-12 | Modules/Units tracking via `total_modules`/`completed_modules` counters on the subject | contract.md:17; structure-data.md:9; intake:65-66 | FACT (live columns) | service | module-local | education-service |
| LEA-13 | `createTerm`/degree tier enum handling — degree tier is a FIELD (`high_school\|bachelor\|master\|doctorate`), not a table (ED-12 / structure-data) | structure-data.md:24; conventions.md:30-31; intake:61-62 | FACT (enum, ⚠ INTENDED) | service | module-local | education-service |
| LEA-14 | Curriculum fork = deep-copy the base curriculum + set a lineage pointer; template edits never mutate the base; attempted base write → typed `TemplateImmutableError` (ED-11) | business-rules.md ED-11:52-55; contract.md:65; conventions.md:20-21; intake:174-176 | FACT (invariant, ⚠ INTENDED) | service | module-local | education-service |
| LEA-15 | Curriculum-base IMPORT — user inputs an institution's/program's default curriculum as a BASE (local seed / imported), device-mediated (X1), ZK (ED-11) | business-rules.md ED-11:52-55; identity.md; structure-data.md:74; rerun:54,115; intake:98-99,172-173 | FACT (intent; X1 device-mediated) | service | shared (ingestion ADR-014 X1: education curricula + skills/languages imports) | cross-cutting: device-mediated ingestion (Part B) |
| LEA-16 | Curriculum template gallery — surface built curricula as forkable templates (subtab under Curriculums / inside builder) | structure-data.md:53; identity.md:34; intake:172-173 | FACT (intent, ⚠ INTENDED) | both | module-local (service: list/fork; UI: gallery) | education-service (service half) |
| LEA-17 | `setSchedule(subjectId, source: ics\|document\|manual, data)` — write the ONE `subject_schedule` per subject via exactly 3 methods (ED-5); views never read feeds directly | contract.md:18-19; business-rules.md ED-5:24-27; conventions.md:8-11; structure-data.md:28; intake:129-133 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-18 | Enforce ED-5 single-source-of-truth — the `subject_schedule` is the sole source; `class_sessions` + weekly view DERIVE from it | business-rules.md ED-5:24-27; structure-data.md:66; conventions.md:8-11; intake:129-133 | FACT (invariant + derivation) | service | module-local | education-service |
| LEA-19 | DERIVE `class_sessions` (meetings of a subject) from the `subject_schedule`; ICS events map to sessions per subject (ED-4/ED-6) | business-rules.md ED-4:20-22,ED-6:29-33; structure-data.md:27; contract.md:19; intake:123-126 | FACT (derivation, ⚠ INTENDED) | service | module-local | education-service |
| LEA-20 | Enforce ED-4 — a class is a SESSION of a Subject; assessments/grades/documents/homework/notes attach to the **Subject**, never a session; retake = new subject row in a new term | business-rules.md ED-4:20-22; conventions.md:8-9,42; intake:123-126 | FACT (invariant, ⚠ INTENDED) | service | module-local | education-service |
| LEA-21 | `listSessions(subjectId)` — list a subject's class sessions | contract.md:19 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-22 | `getWeeklySchedule(range)` — AGGREGATE class sessions ACROSS subjects into the weekly / My-Week view (⚠ INTENDED-immature) | contract.md:19; structure-data.md:57; business-rules.md:84; intake:168 | FACT (aggregation; view immature) | both | shared (schedule aggregation feeds Journal `/summary` + global Calendar) | education-service (service half); cross-cut candidate: cross-module schedule aggregation |
| LEA-23 | `addFeed(url,{default_course_id?, auto_create_sessions?})` — register an ICS feed; a user-added URL = the X2 `user-managed` connector layer, gated on `external_in_ok` (X5) | contract.md:21-22; business-rules.md ED-6:29-33; structure-data.md:10; rerun:55-56; intake:10 | FACT (feed config table is live; X2/X5 named by rerun) | service | shared (external ingestion ADR-014 X2/X5: education + any feed-based module) | cross-cutting: external-ingestion grant/layer (Part B) |
| LEA-24 | `syncFeed(id)` — DEVICE-MEDIATED ICS fetch every `sync_interval_hours` (X1); server never sees feed plaintext (ZK-1); add-only, add-only-dedup by `UNIQUE(feed_id,uid)` (X8), never delete | contract.md:22; business-rules.md ED-6:29-33; structure-data.md:11; conventions.md:47-48; rerun:57; intake:39 | FACT (device-side ingestion; UNIQUE dedup is live schema) | service | shared (device-mediated ingestion ADR-014 X1/X8) | cross-cutting: device-mediated ingestion (Part B) |
| LEA-25 | ICS is IDEMPOTENT / add-only feed — events dedup by natural key `UNIQUE(feed_id, uid)` + `is_ignored`, never delete (X8, already conforms in schema) | business-rules.md ED-6:29-33; structure-data.md:11; rerun:57; intake:11 | FACT (live schema `UNIQUE(feed_id,uid)`; X8 named) | service | shared (add-only-feed pattern ADR-014 X8) | cross-cutting: device-mediated ingestion (Part B) |
| LEA-26 | `matchEvent(eventId, subjectId)` — match a synced ICS event to a Subject (X8; per-subject); an event matching no subject stays unmatched (surfaced for manual match), never guessed | contract.md:22; business-rules.md:72; structure-data.md:11; intake:134 | FACT | service | module-local | education-service |
| LEA-27 | `ignoreEvent(eventId)` — mark a synced event ignored (`is_ignored`, X8) instead of deleting | contract.md:22-23; business-rules.md ED-6:29-33; structure-data.md:11 | FACT | service | module-local | education-service |
| LEA-28 | Revoke a feed = stop future fetch but KEEP synced events (X9); the feed→events shape is a declared normalization contract (X10) | business-rules.md ED-6:29-33; rerun:58; conventions.md | FACT (X9/X10 named) | service | shared (external ingestion ADR-014 X9/X10) | cross-cutting: external-ingestion normalization (Part B) |
| LEA-29 | ICS fetch/parse failure → recorded in `last_error`, typed `IcsSyncError`, surfaced on the feed config (never silent-stale schedules) | business-rules.md:93; contract.md:62; structure-data.md:10; intake:10 | FACT (live `last_error` column) | service | module-local | education-service |
| LEA-30 | `auto_create_sessions` — optionally auto-create class sessions from matched ICS events (live feed-config flag) | contract.md:21; intake:10,29,39 | FACT (live column) | service | module-local | education-service |
| LEA-31 | `createGradingSystem(scope: institution\|program\|subject,{scale, components:[{type,weight,points}]})` — the grading-system builder; weighted components (homework·tasks·exams·quizzes·tests·presentations·works), any scale (A–F/0–10/pass-fail/custom), per-professor (ED-7) | contract.md:24-25; business-rules.md ED-7:34-38; structure-data.md:29; intake:113-119 | FACT (⚠ INTENDED; design-pass = component model) | service | module-local | education-service |
| LEA-32 | Validate grading-system component weights — components summing ≠ 100% → FLAGGED, typed `GradingWeightError`, never silently normalized (ED-7) | business-rules.md:73; contract.md:63; conventions.md:12-13 | FACT (validation/invariant) | service | module-local | education-service |
| LEA-33 | `computeGrade(subjectId)` — DERIVE a subject's grade from its assessments THROUGH the grading system (ED-7); never hand-set as truth | contract.md:25; business-rules.md ED-7:34-38; structure-data.md:43-45,67; conventions.md:12-13,40; intake:118-119 | FACT (derivation, ⚠ INTENDED) | service | module-local | education-service |
| LEA-34 | `computeGPA(termId\|curriculumId)` — DERIVE a GPA ROLLUP up the hierarchy weighted by the grading-system components (M4: grade weights = child weights); mixed/missing systems → partial + flag, never a fabricated GPA | contract.md:25,64; business-rules.md ED-7:34-38; structure-data.md:44-45; rerun:48,172(N2); intake:34,89 | FACT (rollup derivation; weight model deferred to grading design-pass) | service | shared (weighted-rollup pattern = ADR-011 M4 analogue; grading-system-weighted, Education-forged) | cross-cutting: measurement/rollup engine (Part B — Education-forged variant) |
| LEA-35 | Grade fallback resolution — a subject with no grading system falls back to program's/institution's; none anywhere → progress still measurable by deliverable/goal/manual (ED-7/ED-10) | business-rules.md:74-75; intake:117 | INTERPRETATION (fallback chain derived from ED-7/ED-10) | service | module-local | education-service |
| LEA-36 | A failed grade/progress computation shows a FLAGGED PARTIAL, never a wrong number as truth (fail-loud, constitution §5) | business-rules.md:91-92; contract.md:63-64 | FACT (invariant) | service | module-local | education-service |
| LEA-37 | `createAssessment(subjectId,{type:exam\|quiz\|test\|presentation\|work, date, weight, modality})` — create a subject-attached assessment (ED-8); modality ∈ online/in_person | contract.md:26-27; business-rules.md ED-8:39-42; structure-data.md:30; conventions.md:31; intake:135-137 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-38 | `recordResult(assessmentId, score)` — record an assessment result → subject grade RECOMPUTES (feeds the grading system) | contract.md:27; business-rules.md ED-8:39-42; structure-data.md:87 | FACT (write + triggered recompute) | service | module-local | education-service |
| LEA-39 | `listAssessments(type\|subject\|range)` — list assessments filtered by type/subject/range (feeds per-type pages + cross-subject view) | contract.md:27; structure-data.md:56 | FACT (⚠ INTENDED) | service | module-local | education-service |
| LEA-40 | Auto-record assessments from ICS now / from documents later (ED-8); rows auto-recorded from extraction carry `source=ai` (AI6) | business-rules.md ED-8:39-42; identity.md:46-48; rerun:68; intake:13,36 | FACT (intent; ICS-now, doc-deferred; AI6 provenance) | service | shared (ingestion + AI provenance ADR-014/015 AI6) | cross-cutting: auto-record/ingestion + AI provenance (Part B) |
| LEA-41 | `listEducationTasks(subjectId\|all)` — read education-scoped homework via the **Tasks→Education API** (Tasks OWNS the entity, ED-9); never a local homework table, never direct task reads (TK-9) | contract.md:28-29,38; business-rules.md ED-9:43-44; conventions.md:14-15,43; rerun:77; intake:120-122 | FACT (facade/delegation; boundary held) | service | shared (Tasks→Education API: tasks + education) | cross-cutting: Tasks→Education facade (Part B) |
| LEA-42 | AI-autorecord of homework from documents writes THROUGH the Tasks API with `source=ai` (AI6) — never a local homework write | rerun:77; business-rules.md ED-8:39-42; contract.md:45 | INTERPRETATION (rerun C-HW note; homework stays Tasks-owned) | service | shared (tasks + education + AI provenance) | cross-cutting: Tasks→Education facade + AI provenance (Part B) |
| LEA-43 | `addDocument(subjectId, file)` — add a document (syllabus/schedule/materials) to the per-subject VAULT; inline small / R2 large, client-encrypted (ED-13, PJ-8 pattern) | contract.md:30-31; business-rules.md ED-13:58-59; structure-data.md:32; conventions.md:25-26; intake:127-128 | FACT (⚠ INTENDED) | service | shared (attachment/vault pattern PJ-8: education + projects + books) | cross-cutting: attachment/blob pipeline (Part B) |
| LEA-44 | `getVault(subjectId)` — read the subject vault: documents AND the subject's notes together (one place per subject, ED-13) | contract.md:30-31; business-rules.md ED-13:58-59; intake:127-128 | FACT (⚠ INTENDED) | service | module-local (composes pages + attachments) | education-service |
| LEA-45 | Vault decrypt/R2 error → typed error (terminal state); never silent | business-rules.md:89; contract.md | FACT (terminal state) | service | shared (attachment/blob pipeline) | cross-cutting: attachment/blob pipeline (Part B) |
| LEA-46 | `setMeasurement(subjectId\|programId,{measurement_kind, binding_mode, source})` — configure the Education-forged measurement entity; the bespoke `grade\|deliverable\|goal\|manual\|count` DECOMPOSES to `measurement_kind` (M1) × `binding_mode` (M2), the Projects axes, SEPARATE STORAGE (ED-10) | contract.md:32-35; business-rules.md ED-10:45-51; structure-data.md:33; conventions.md:16-19; rerun:46-47; intake:179-184 | FACT (⚠ INTENDED; decomposition ratified by rerun) | service | shared (measurement axes = ADR-011 M1/M2 pattern; Education forges its OWN entity, separate storage) | cross-cutting: measurement engine (Part B — Education-forged, separate-storage variant) |
| LEA-47 | `getProgress(ref)` — DERIVE progress on-read (M3: `NULL ⇒ derive`, nullable override); never a `NOT NULL DEFAULT 0` counter | contract.md:34-35; business-rules.md ED-10:45-51; structure-data.md:43-44,68; conventions.md:16-19,40-41; rerun:40 | FACT (derivation; M3 reframe of live `courses.progress`) | service | shared (derived-progress pattern ADR-011 M3) | cross-cutting: measurement engine (Part B) |
| LEA-48 | R6 reframe (live FACT) — retire `courses.progress NOT NULL DEFAULT 0` (`schema.ts:628`) → nullable override; progress derives (M3) | structure-data.md:9,44,68; business-rules.md:104-107; rerun:40,136; conventions.md:16,41 | FACT (live schema anti-signal → reframe) | service | shared (ADR-011 M3) | cross-cutting: measurement engine (Part B) |
| LEA-49 | Progress/GPA ROLLS UP the whole chain (Topic → Module → Subject → Term → Degree → Curriculum → Program), derived-cache, degree/grading-weighted (A2/M4) | structure-data.md:44-45; intake:74-75(A2),101(H12); rerun:48 | FACT (rollup derivation; weight model = grading design-pass) | service | shared (rollup up hierarchy; Education-forged) | cross-cutting: measurement/rollup engine (Part B) |
| LEA-50 | Enforce ED-10 SEPARATE STORAGE — Education measurement data is NEVER mixed with Projects' storage (one design pattern, two forges) | business-rules.md ED-10:45-51; conventions.md:16-19,44; rerun:74(C-M1),90; intake:179-184 | FACT (invariant; boundary guard) | service | shared (education ↔ projects boundary) | education-service (invariant) |
| LEA-51 | Grades/GPA/progress are DERIVED authority — never hand-maintained truth; no setter exposed for grade/GPA/progress (ED-7/ED-10) | structure-data.md:43-45,67-68; conventions.md:40-41; business-rules.md ED-7/ED-10 | FACT (invariant) | service | module-local | education-service |
| LEA-52 | Document/syllabus EXTRACTION — a scoped extract (opt-in): ADR-014 moves the document (X11), ADR-015 governs the model call (split, not folded); ⚠ deferred extension | identity.md:46-48; business-rules.md ED-5:24-27; contract.md:44-46; conventions.md:47-48; rerun:59; intake:38,94 | FACT (intent; ⚠ deferred extension; X11 split) | service | shared (ingestion X11 → AI ADR-015: education + skills/languages doc-extraction) | cross-cutting: AI extraction pipeline (Part B) |
| LEA-53 | Extraction runs `on_device`/`cloud` (AI1); neither routes through our server (server-blind) | identity.md:46-48; business-rules.md ED-5:24-27; rerun:65; contract.md:45 | FACT (intent; AI1) | service | shared (AI extension-model ADR-015 AI1) | cross-cutting: AI extraction pipeline (Part B) |
| LEA-54 | Cloud extraction = egress + scope-min (AI3) — sends only the document slice needed (not the whole vault), optional redaction | business-rules.md ED-5:24-27; rerun:66 | FACT (intent; AI3) | service | shared (AI extension-model ADR-015 AI3) | cross-cutting: AI extraction pipeline (Part B) |
| LEA-55 | Prompt-injection bounding (AI5, load-bearing) — a syllabus/document is UNTRUSTED-origin; its provenance travels into the prompt; auto-recorded rows can't auto-widen scope; injected instructions hit the consent gate | identity.md:46-48; business-rules.md ED-5:24-27,ED-8:39-42; conventions.md:47-48; rerun:67 | FACT (intent; AI5) | service | shared (AI extension-model ADR-015 AI5: education syllabus + skills/knowledge doc-extraction) | cross-cutting: AI extraction pipeline (Part B) |
| LEA-56 | Extraction is NOT an AI4 agent (C-AI4) — a one-shot scoped extract-and-autorecord, not a tool-envelope agent; do NOT add AI4 tokens | identity.md:46-48; rerun:27,75(C-AI4); business-rules.md ED-5:24-27 | INTERPRETATION (rerun scope guard, critique-verified) | service | shared (AI extension-model boundary) | education-service (guard) |
| LEA-57 | Any ingestion path requiring server plaintext is REFUSED absent explicit opt-in (extension model, ZK-1); never fetch ICS/documents server-side, never downgrade | business-rules.md:94; conventions.md:47-48; identity.md:44-48 | FACT (invariant, ZK-1) | service | shared (ZK ingestion constraint, all ingestion modules) | cross-cutting: device-mediated ingestion / AI extraction (Part B) |
| LEA-58 | `tagMembership` via `entity_tags` (SP1, ADR-006) — Education-scoped shared tags on Program/Curriculum/Subject; retire inline `courses.tags` | business-rules.md ED-16:64-66; contract.md:41-42; structure-data.md:9,35-36; conventions.md:49-50; rerun:39,104; identity.md:34 | FACT (intent; SP1) | service | shared (entity_tags primitive: education + all tagging modules) | cross-cutting: entity_tags/tag primitive (Part B) |
| LEA-59 | R6 reframe (live FACT) — retire inline `courses.tags` `[E]` (`schema.ts:636`) → `entity_tags` (Education-scoped); As-is inline kept as floor | structure-data.md:9,35-36; business-rules.md ED-1:9-13,ED-16:64-66; rerun:39,135 | FACT (live schema anti-signal → reframe) | service | shared (entity_tags primitive, ADR-006 SP1) | cross-cutting: entity_tags/tag primitive (Part B) |
| LEA-60 | Notes on Program/Curriculum/Subject(in-vault)/session via `pages` — `course` is a valid `entity_type` today; new entity_types added with the amendment (ED-13/H11) | contract.md:39-40; business-rules.md; structure-data.md; intake:41,176-178; identity.md | FACT (`course` entity_type live) | both | shared (pages/entity_type system: education + notes-and-pages + every noted module) | cross-cutting: pages/entity_type facade (Part B) — service half |
| LEA-61 | `entity_links` gains the new Education entity_types at build; cross-module relate via entity_links (course is a valid link target today) | structure-data.md:35; intake:14; contract.md:39-40 | FACT (`course` link target live; new types INTENDED) | service | shared (entity_links resolve: education + all linked modules) | cross-cutting: entity-link resolve (Part B) |
| LEA-62 | ENUM validation (current FACT) — `course_type`{online,in_person,hybrid,self_paced}, `status`{not_started,in_progress,completed,dropped}, `rating` 1-5; Zod + CHECK, declared once | business-rules.md:69; conventions.md:33-35; structure-data.md:70; intake:9 | FACT (live enums) | service | module-local | education-service |
| LEA-63 | ENUM validation (INTENDED) — degree tier{high_school,bachelor,master,doctorate}, term level{year,semester,term}, assessment type{exam,quiz,test,presentation,work}, modality{online,in_person} | conventions.md:30-32; structure-data.md:24-30; identity.md:29-30 | FACT (intent enums, ⚠ INTENDED) | service | module-local | education-service |
| LEA-64 | `course_type` reconciliation — the FACT `course_type` enum is SUPERSEDED by the mode living at Institution/Self-taught level; reconcile at build (candidate: keep as subject-level modality) | business-rules.md:70-71; structure-data.md:35; conventions.md:33-34; identity.md:22 | UNKNOWN (build-phase design-pass; disposition not fixed) | service | module-local | education-service (deferred build-phase; UNKNOWN) |
| LEA-65 | Render SPARSE data gracefully (ED-14) — from Subject → Topic data is progressively fillable; empty ≠ error; UIs invite increments, never demand completeness | business-rules.md ED-14:60-61; conventions.md:24; identity.md:49-50; structure-data.md:59; intake:157-159 | FACT (rule) | both | module-local (service: partial-read tolerance; UI: sparse render) | education-service (service half) |
| LEA-66 | Ship DEFAULTS with every personalizable view (ED-15) — a sensible default schema always exists (anti-lost) | business-rules.md ED-15:62-63; conventions.md:22-23,51; identity.md:35; intake:160-161 | FACT (rule) | both | module-local (service: seed default view schemas; UI: default render) | education-service (service half) |
| LEA-67 | Local-first — every write succeeds locally first (LWW); structured columns sync LWW, vault blobs follow the attachment path (ED-16) | business-rules.md ED-16:64-66; structure-data.md:15; contract.md | FACT (inherits LF-2/ADR-003) | service | shared (sync engine, all modules) | cross-cutting: sync (Part B) |
| LEA-68 | `[E]` field-level encryption — subject title/description/provider/instructor/url/tags/metadata + ICS feed_url/feed_name/summary/description/location/raw_event/last_error are `[E]` (ZK-1); enums/dates/progress/counters plaintext (ED-1) | business-rules.md ED-1:9-13; structure-data.md:9-11; identity.md; intake:9-11 | FACT (live `[E]` markers) | service | shared (encryption seam, all modules) | cross-cutting: encryption seam (Part B) |
| LEA-69 | `courses.metadata` `[E]` JSON (v1 CollegeClassData: schedule + grade) is SUPERSEDED by the structured entities; do not read v1 metadata as authority | structure-data.md:13; intake:26; business-rules.md | FACT (live column, superseded) | service | module-local | education-service |
| LEA-70 | FTS5 search over courses — `course` participates in full-text search (rebuilt on vault unlock, ADR-002 convention) | intake:15; structure-data.md; CLAUDE.md ADR-002 | INTERPRETATION (FTS5 convention applies to courses; not explicitly enumerated in aspect docs) | service | shared (FTS5 search: education + pages/tasks/contacts) | cross-cutting: search/FTS5 (Part B) |
| LEA-71 | Provide Education deadlines/topics as a `dueIn()` provider + a pace-signal source to Sessions & Scheduling (G10) | contract.md:49-52 | FACT | service | shared (education PROVIDES → sessions-and-scheduling `dueIn`) | cross-cutting: dueIn provider (Part B) |
| LEA-72 | Provide Education's `class_session` sub-type to Sessions & Scheduling; Sessions targets subjects via `study_session` | contract.md:49-51; sessions structure | FACT | service | shared (sessions-and-scheduling ADR-004: education + sessions) | cross-cutting: session sub-type registry (Part B) |
| LEA-73 | Serve Books via the `book_subjects` partition + Books→Education API (books-per-subject, pace vs schedule/assessments) | contract.md:51-53 | FACT | service | shared (books ↔ education partition/API) | cross-cutting: Books↔Education facade (Part B) |
| LEA-74 | CONSUME Knowledge's mastery source `{objectMastery, assessmentResults, paceVsSyllabus}` (KN-2/KN-10); Education owns the Program-level rollup + the syllabus-as-calendar entity | contract.md:53-56 | FACT | service | shared (knowledge PROVIDES → education CONSUMES + owns rollup) | cross-cutting: measurement source provider (Part B) |
| LEA-75 | Serve Flashcards (decks per subject) — Flashcards read Education's contract | contract.md:52-53 | FACT | service | shared (flashcards ↔ education) | education-service (contract exposure) |
| LEA-76 | Feed Journal `/summary` + global Calendar → today's class sessions + due assessments | contract.md:57 | FACT | service | shared (education → journals `/summary` + calendar) | cross-cutting: summary aggregation (Part B) |
| LEA-77 | Feed Purpose/Gamification → study progress SIGNALS (measurement/session signal, ⚠ INTENDED) — NOT a `grant_currency` grant (C-E2, Education is not an economy feeder) | contract.md:58; rerun:76(C-E2),123; business-rules.md | FACT (signal; C-E2 guard: no economy grant) | service | shared (education → purpose measurement; NOT gamification economy) | cross-cutting: measurement source / contribution seam (Part B) |
| LEA-78 | No M5 measure-source seam (C-M5) — Education feeds Purpose via the measurement entity (M1/M3 progress) + the contribution seam; Education is outside M5's applies-to set | rerun:78(C-M5); contract.md:47-51 | INTERPRETATION (rerun scope guard) | service | shared (education → purpose contribution seam) | education-service (guard) |
| LEA-79 | Typed errors only; optimistic writes revert on failure (LF-2, never silent loss) — inherits the core service constitution | contract.md:60-65; business-rules.md:7 | FACT (inherits core) | service | module-local | education-service |
| LEA-80 | "Subjects" vs "Courses" display name = a user Preference (visual only, no DB change); read from Preferences | conventions.md:29; structure-data.md:26; contract.md:43; identity.md; intake:146 | FACT (Preferences read) | both | shared (education reads Preferences) | education-service (service half reads prefs) |
| LEA-81 | View defaults + sync intervals read from Preferences (per-view defaults, ICS sync intervals) | contract.md:43; structure-data.md:10 | FACT | service | shared (education reads Preferences) | education-service |

## Local flag index (§4a deferred + §4b live-intent) — every flag/verb → the item id that homes it

**§4a — deferred / INTENDED / →service / design-pass flags:**
- `⚠ INTENDED hierarchy (largest expansion)` → identity.md:23 → LEA-01…LEA-09, LEA-13
- `⚠ INTENDED` ED-2 (two modes, separate tables) → business-rules.md:16 → LEA-02
- `⚠ INTENDED` ED-3 (subjects always routed) → business-rules.md:18 → LEA-07
- `⚠ INTENDED` ED-4 (class = session of subject) → business-rules.md:20 → LEA-20
- `⚠ INTENDED` ED-5 (subject schedule single source) → business-rules.md:24 → LEA-17, LEA-18
- `⚠ deferred` document extraction (ED-5) → business-rules.md:25 → LEA-52
- `⚠ INTENDED` ED-7 (grading system) → business-rules.md:34 → LEA-31, LEA-33, LEA-34
- `⚠ INTENDED` ED-8 (assessments) → business-rules.md:39 → LEA-37
- `⚠ INTENDED` ED-9 (homework = Tasks entity) → business-rules.md:43 → LEA-41
- `⚠ INTENDED` ED-10 (progress measured, Education-forged) → business-rules.md:45 → LEA-46, LEA-50
- `⚠ INTENDED` ED-11 (curricula forkable) → business-rules.md:52 → LEA-04, LEA-14, LEA-15
- `⚠ INTENDED` ED-12 (hierarchical terms) → business-rules.md:56 → LEA-05, LEA-13
- `⚠ INTENDED` ED-13 (vault per subject) → business-rules.md:58 → LEA-43, LEA-44
- `⚠ deferred to AI/extension` document extraction → identity.md:46-48; conventions.md:47 → LEA-52, LEA-53, LEA-54, LEA-55
- `[DEFERRED — Part 2 / build phase]` code homes / DDL / amendment → rerun:9,146 → (structural; not a service item — noted, out of P1 scope per PLAN §9)
- `⚠ INTENDED-immature` My-Week / cross-subject assessments / GPA report → structure-data.md:57; business-rules.md:102; intake:168 → LEA-22, LEA-34, LEA-39
- `design pass` grading-system component model → business-rules.md:101; structure-data.md:78-79 → LEA-31 (weight model deferred)
- `design pass` measurement pattern (shared w/ Projects, forged separately) → business-rules.md:101; structure-data.md:80 → LEA-46, LEA-49
- `→ M1.2 Learning` (module deferral) → m1.1-delivery-plan.md:251 → (whole module; all LEA rows)
- `→ build` `course_type` reconciliation → business-rules.md:70-71; structure-data.md:35 → LEA-64 (UNKNOWN)

**§4b — derivation/aggregation/rollup/provider/snapshot verbs + rule ids:**
- `derive` sessions from schedule → business-rules.md:24-27; structure-data.md:66 → LEA-18, LEA-19
- `derive` weekly view from schedule → conventions.md:8-11 → LEA-18, LEA-22
- `comput`/`computeGrade` grade from assessments → contract.md:25; business-rules.md ED-7 → LEA-33
- `comput`/`computeGPA` → contract.md:25 → LEA-34
- `derive` grades/GPA/progress (never stored authority) → structure-data.md:43-45,67-68; conventions.md:40 → LEA-33, LEA-34, LEA-47, LEA-51
- `rollup`/`rolls up` progress/GPA up the chain → structure-data.md:44-45; intake:74(A2); rerun:48 → LEA-34, LEA-49
- `aggregat` weekly schedule across subjects → contract.md:19; structure-data.md:57 → LEA-22
- `snapshot`/`derived-cache` progress rollup → intake:74(A2) → LEA-49
- `provider` `dueIn()` Education deadlines/topics → contract.md:49-52 → LEA-71
- `provides mastery measurement source` (Knowledge → Education) → contract.md:53-56 → LEA-74
- `recompute` grade on assessment result → contract.md:27; structure-data.md:87 → LEA-38
- `getProgress` derives-on-read (M3) → contract.md:34-35; business-rules.md ED-10 → LEA-47
- ED-1 (encrypted content) → business-rules.md:9 → LEA-68
- ED-2 (two modes) → business-rules.md:16 → LEA-02, LEA-03
- ED-3 (routed subjects) → business-rules.md:18 → LEA-07
- ED-4 (class = session) → business-rules.md:20 → LEA-20
- ED-5 (schedule single source) → business-rules.md:24 → LEA-17, LEA-18
- ED-6 (ICS device-side/idempotent) → business-rules.md:29 → LEA-24, LEA-25, LEA-26, LEA-27, LEA-28, LEA-29
- ED-7 (grades via grading system) → business-rules.md:34 → LEA-31, LEA-32, LEA-33, LEA-34
- ED-8 (assessments) → business-rules.md:39 → LEA-37, LEA-38, LEA-40
- ED-9 (homework Tasks-owned) → business-rules.md:43 → LEA-41, LEA-42
- ED-10 (progress measured, Education-forged) → business-rules.md:45 → LEA-46, LEA-47, LEA-49, LEA-50
- ED-11 (curricula forkable) → business-rules.md:52 → LEA-04, LEA-14, LEA-15
- ED-12 (hierarchical terms) → business-rules.md:56 → LEA-05
- ED-13 (vault per subject) → business-rules.md:58 → LEA-43, LEA-44
- ED-14 (sparse data) → business-rules.md:60 → LEA-65
- ED-15 (defaults before personalization) → business-rules.md:62 → LEA-66
- ED-16 (local-first; scoped tags) → business-rules.md:64 → LEA-58, LEA-67
- M1 `measurement_kind` decomposition → rerun:46; business-rules.md ED-10 → LEA-46
- M2 `binding_mode` decomposition → rerun:47; business-rules.md ED-10 → LEA-46
- M3 nullable-derived progress → rerun:40; conventions.md:16 → LEA-47, LEA-48
- M4 grading-weighted rollup → rerun:48 → LEA-34, LEA-49
- X1 device-mediated ingest → rerun:54; business-rules.md ED-6/ED-11 → LEA-15, LEA-24
- X2 user-managed layer → rerun:55; business-rules.md ED-6 → LEA-23
- X5 external_in_ok grant → rerun:56 → LEA-23
- X8 add-only feed dedup → rerun:57; structure-data.md:11 → LEA-25
- X9/X10 revoke + normalization → rerun:58 → LEA-28
- X11 LLM split → rerun:59; business-rules.md ED-5 → LEA-52
- AI1 on_device/cloud modes → rerun:65 → LEA-53
- AI3 egress+scope-min → rerun:66 → LEA-54
- AI5 syllabus-untrusted provenance → rerun:67 → LEA-55
- AI6 source=ai provenance → rerun:68; business-rules.md ED-8 → LEA-40, LEA-42
- SP1 entity_tags → rerun:39; business-rules.md ED-16 → LEA-58, LEA-59
- C-AI4 guard (no agent envelope) → rerun:75 → LEA-56
- C-E2 guard (no economy grant) → rerun:76 → LEA-77
- C-HW guard (homework Tasks-owned) → rerun:77 → LEA-41, LEA-42
- C-M5 guard (no measure-source seam) → rerun:78 → LEA-78
- C-M1 disclosure (measurement membership via ED-10 Projects-pattern reuse) → rerun:74 → LEA-46, LEA-50
- C-HIER guard (hierarchy done, no re-design) → rerun:79 → (all LEA hierarchy rows homed; guard, no new item)

## UNKNOWNs
- `course_type` reconciliation vs the Institution/Self-taught mode level — keep as subject-level modality, or drop? → business-rules.md:70-71; structure-data.md:35 → BLOCKER: build-phase design-pass (ADR-016); disposition not fixed in docs (candidate named, not decided). Homed at LEA-64. Resolve-by: P2 schema reconcile / build phase.
- Grading-system COMPONENT MODEL (the exact weighted-component shape + scale representation) → business-rules.md:101; structure-data.md:78-79 → BLOCKER: explicit design-pass required (rerun §5, out of scope). Service surface named (LEA-31/32/33) but the storage/weight model is deferred. Resolve-by: build-phase grading design-pass.
- Measurement `measurement_kind`/`binding_mode` CHECK defaults + the grade-vs-deliverable-vs-count mapping FORMULA + the GPA rollup WEIGHT model → structure-data.md:80; rerun:157 → BLOCKER: the measurement design-pass (shared axes with Projects, Education-forged); axes named (LEA-46/49), formula deferred. Resolve-by: build-phase measurement design-pass.
- ICS event→subject MATCHING mechanism (by title/keyword?) — matching is per-subject but the match heuristic is unspecified; unmatched stays manual (LEA-26 homes the "stays unmatched, never guessed" invariant) → intake:39; business-rules.md:72 → BLOCKER: matching heuristic not fixed in docs. Resolve-by: build-phase (Education service).
- Knowledge `paceVsSyllabus` / `assessmentResults` signals CONSUMED by Education (LEA-74) depend on Education's syllabus-as-calendar + assessments entities that are themselves ⚠ INTENDED → contract.md:53-56; knowledge KNO-26/27 → BLOCKER: forward dep on Education's INTENDED assessment/syllabus entities. Resolve-by: build phase (cross-module contract firmed when both entities land).
