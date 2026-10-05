<!-- Decomposition Gate — features/learning/education ① backend · Entity Delivery Flow Step 2
     The slices + the backend/frontend split. Each slice tagged. Legs cite the aspect-doc ED-* +
     capability-framework S*/M*/X*/AI*/SP1 predicates. Session: 2026-10-02-mod-learning-education -->

# Slice map — Learning: Education  ① backend

**Scope:** `createLearningEducationService` over the 15 built tables of `024_learning_education`.
**All slices are `backend`** (service tier in `@vida/core`). The frontend (② `fe-learning-education`,
P6) is OUT. **10 slices**, dependency-ordered: hierarchy spine → subjects → fork → schedule/sessions →
ICS → grading → assessments+compute → measurement → vault+tags → cross-module fan-out.

Each slice runs the full per-slice track (Steps 3–11): `/api-contract` → implement → `tsc` → **live-store
Verification Gate** → `code-review` → `/critique` → §XXIX currency. No batching — a slice's gate PASSES
before the next begins.

| # | Slice | backend | Tables | Legs covered | Key rules / seams |
|---|-------|:---:|--------|--------------|-------------------|
| **S1** | **Hierarchy spine + routing** | ✅ | institutions · self_taught · programs · curricula · terms | ED-2 · ED-3 · ED-12 | `createLearningEducationService` factory born. CRUD for the 5 hierarchy tables. `programs(parent_type,parent_id)` no-FK; `terms(level,parent_term_id)` hierarchical. Routing primitive (`resolveParentChain`) that S2 enforces. (R5 no-FK; R4 soft-delete filter.) *Entity_types already registered at DB-4 #12 — composed, not re-registered (BLOCKER-2).* |
| **S2** | **Subjects + DB-11 reconcile** | ✅ | subjects | ED-1 · ED-3 · ED-14 · M3(progress) · R6 | Subjects CRUD, routing **enforced** (`UnroutedSubjectError`, A1 skippable levels). `@vida/types` **Course→Subject** reconcile in-slice (drop inline `tags`, `progress`→nullable, +routing/degree_tier; grep breaking-change first, R8/NIT5). `progress` never settable (R2/M3). `course_type` nullable modality (R6). |
| **S3** | **Curriculum fork + lineage** | ✅ | curricula (extend) | ED-11 · A3 · H10 | `forkCurriculum(id,{name?})` deep-copy of terms/subjects + `forked_from_id` lineage; `is_template` immutable on fork (`TemplateImmutableError`). Base never mutated on fork. |
| **S4** | **Schedule + class sessions** | ✅ | subject_schedules · class_sessions | ED-4 · ED-5 · S1–S7(sessions) · BR-ED-7 | **Register `class` session sub-type** (`registerLearningEducation`, try/catch `DuplicateSubType`, `allowed_effects:[]` — R1/C-E2). One `subject_schedule` per subject (UNIQUE). `createSession('class')` + own 1:1 extension (no `deleted_at`, R4). `getWeeklySchedule(range)` derives cross-subject. |
| **S5** | **ICS feeds + events** | ✅ | ics_feed_configs · ics_synced_events | ED-6 · X1 · X2 · X5 · X8 · X9 · X10 | `addFeed`/`matchEvent`/`ignoreEvent`; **`syncFeed` = deny-safe `ics?` port** ⇒ `ics-unavailable` (live fetch = M2, R9). Add-only dedup UNIQUE(feed_id,uid)+is_ignored; revoke via `is_active`, never delete (R4/X8/X9). Unmatched event stays unmatched (R7). `created_session_id`/`source_event_id` link to S4. |
| **S6** | **Grading systems + components** | ✅ | grading_systems · grading_components | ED-7 · H3 | `createGradingSystem(scope,{scale_type,scale_config,components})`; scope ∈ institution/program/subject; weighted components (`component_type`,`weight`bp,`max_points`). Weights ≠ 100% → `GradingWeightError` (flag, don't normalize). `scale_config` `[E]` JSON serialize (R10). |
| **S7** | **Assessments + grade/GPA compute** | ✅ | assessments | ED-8 · AI6 · ED-7(compute) | Assessments CRUD by subject/type; `recordResult(id,score)`; `source` provenance (`manual`/`ai`/`import`). **`computeGrade(subjectId)` / `computeGPA(termId\|curriculumId)`** derived via S6 weighted components; mixed/missing system → partial + flag, never fabricate (`computeGPA` partial). Composes `measurement/engine` rollup/normalize. |
| **S8** | **Education measurement** | ✅ | education_measurements | ED-10 · M1 · M2 · M3 | `setMeasurement(ref,{measurement_kind,binding_mode})` on the **Education-forged** entity (ref ∈ subject/program; **never Projects' storage**, C-M5). `measurement_kind` NOT-NULL caller-supplied (R3); `binding_mode` nullable ⇒ derive. `getProgress(ref)` **derives-on-read** (M3, nullable override) via `resolveProgress`/`rollup`; grade-derived binding_mode pulls S7's grade. |
| **S9** | **Subject vault + tags/links/notes** | ✅ | subject_documents | ED-13 · ED-16 · SP1 · PJ-8 | `addDocument(subjectId,…)` inline blob / R2 `storage_ref` (deny-safe `attachment?` ⇒ `attachment-unavailable`); `getVault(subjectId)` → docs + notes together. `doc_type` OPEN vocab (no CHECK). Compose spaces entity_tags/entity_links/pages WRITES on the already-registered `subject`/`subject_document` types (Education-scoped tags, retire inline `courses.tags`; guard `tag_id` resolves). |
| **S10** | **Cross-module fan-out + Journal** | ✅ | — (seams only) | ED-9 · KN-2/KN-10 · BK-12 · C-HW · Journal | `listEducationTasks` = **deny-safe Tasks→Education port** ⇒ `[]` (Tasks not built, C-HW, R9). `getPlansForConsumer` passthrough to Books (DONE). Consume Knowledge `getMasterySource(subjectId)` for object-mastery (Education owns rollup; reverse-wire stays Knowledge-owned per §6 UNKNOWN). `registerLearningEducationJournal` + `getDayEducationDigest` (`/summary` PULL — class sessions + due assessments). **`effects?` emit-only measurement signal** on assessment record — **dormant at M1** (injected `{rail,registry}`, no handler/named consumer; occurrence-grain = assessment id; post-commit, failure-isolated; C-E2 never an economy grant — the books/knowledge S-final precedent, BLOCKER-1). |

## Backend / frontend split
- **Backend (this build):** all 10 slices above — service tier, no DDL, no UI.
- **Frontend (OUT → `fe-learning-education`, P6):** Programs Dashboard · 11-tab Education Hub · dedicated
  pages · curriculum builder UI · My-Week / cross-subject / GPA-report views. `[FACT: learning.ts:47; structure-data.md:47-59]`

## Step 1.5 — Envision Gate
**N/A** — pure backend entity; renders no user-facing surface (`entity-delivery-flow.md §3.75`). Every
user-visible affordance (dashboards, builders, hub tabs) is the ② `fe-learning-education` track, which the
add-frontend-component profile wires with its own Envision Gate. Stated, not silently skipped.

## Deferred to M2 (ADR-owned service legs, not architecture — rerun-ratified)
- **ICS live fetch** (the device-side sync loop) — S5 ships the deny-safe port; real fetch = ADR-014 X1 @ M2.
- **Document extraction** (syllabus→schedule/assessments, AI) — ADR-015 AI1/AI3/AI5/AI6 @ M2; `source='ai'` column ready.
- **Tasks→Education API** real reads — S10 ships the deny-safe port; real homework reads land when `services/tasks` is built.

## Dependency order (why this sequence)
`[INTERP from §3]` Everything routes to a subject → hierarchy (S1) before subjects (S2). Fork (S3) extends
the hierarchy. The `class` sub-type must register before `createSession` → S4 before any session use. ICS (S5)
maps events to the S4 sessions. Grading (S6) defines weights that assessments (S7) consume to compute grade;
measurement (S8) binding_mode=`derived-pull` reads S7's grade. Vault/tags (S9) are leaf. Cross-module fan-out
(S10) composes everything + the Journal digest (the MOD-books/MOD-knowledge S-final precedent).
