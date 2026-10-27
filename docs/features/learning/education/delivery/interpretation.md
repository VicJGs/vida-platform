<!-- Interpretation layer — features/learning/education ① backend · Entity Delivery Flow Step 1
     Makes the implicit explicit before decomposition. Every claim [FACT: path:line] / [INTERP] / [UNKNOWN].
     Session: 2026-10-02-mod-learning-education · head #52 · LIF-130 -->

# Interpretation — Learning: Education ① backend service tier

`createLearningEducationService` over DB-4 `024_learning_education` (15 tables) — the heaviest DB-4 group.
This is a **pure service tier over a finished schema** (no DDL), the MOD-books / MOD-knowledge shape.

## 0. BASELINE reconciliation — the hinge (read first)

The five aspect docs (`docs/features/learning/education/*.md`) are **pre-DB-4** and repeatedly flag the
hierarchy as "⚠ INTENDED (no schema)" and the `@vida/core` model as a "0-line placeholder"
`[FACT: contract.md:5-9]`. That language is **STALE**. DB-4 group #12 **authored all 15 tables** and
resolved every design-pass the aspect docs deferred `[FACT: learning.ts:1-51; db-4-learning-education/_index.md]`.
The part-1.2 rerun is **🟢 CRITIQUE-CLEAN** and ratifies the grading model, the measurement axes, the
8-level hierarchy, and the ICS boundary `[FACT: realignment-master-plan/part-1.2-reruns/learning-education.md:1-4,42-48,54-59]`.
Victor's own DB-4 drift-catch settles it: intake §Resolution=WHOLE + a `(design pass)` label = **author-now**,
NOT defer `[FACT: .claude/docs/decisions.md:438]`. So: resolve everything NOW against the built schema;
the only genuine defers are ADR-owned M2 service legs (§5). `[[build-phase-flags-mean-resolve-now-not-defer]]`

## 1. DEPENDENCIES — what this build composes (all BUILT unless flagged)

- **DB-4 schema `learning.ts`** (15 tables) — the finished storage. No DDL authored here.
  `[FACT: learning.ts:74-339]` Row types exist (`SubjectRow`…`EducationMeasurementRow`). `[FACT: learning.ts:342-371]`
- **`foundation/sessions`** — `SessionRegistry.register(SessionTypeDef)` + `createSession(sub_type)`; a
  `class` sub-type whose 1:1 extension is `class_sessions` (keyed `session_id` UNIQUE, no `deleted_at`,
  base owns lifecycle). The `registerBooks` precedent is exact. `[FACT: services/books/service.ts:205-217,748-750; foundation/sessions/types.ts:34]`
  Envelope `permissions.allowed_effects: []` (⊆ shipped; C-E2 — Education grants no economy). `[FACT: books/service.ts:216; part-1.2-reruns:C-E2]`
- **`foundation/measurement`** — pure engine `normalize` / `rollup` / `resolveProgress` / `assertAcyclic`
  for deriving progress/GPA on read. `[FACT: foundation/measurement/engine.ts:14,38,56,65]`
  Source-registry `advertise(key, ()=>number|null)` is **sync + scalar** — Education does NOT advertise
  (per-subject/async grade & progress ≠ a global scalar; C-M5). `[FACT: measurement/source-registry.ts:11-17; part-1.2-reruns:C-M5]` `[[measurement-source-registry-is-sync-scalar-per-subject-uses-a-method]]`
- **`services/knowledge`** — `getMasterySource(subjectRef: string): Promise<MasterySource>` (param = a bare subject id, NIT3) = `{objectMastery,
assessmentResults, paceVsSyllabus}`; in M1.0 only `objectMastery` is live, the other two were deny-safe
  `null` _because Education's assessments + syllabus-as-calendar weren't built yet_. `[FACT: services/knowledge/types.ts:158-168,347]`
  Education **consumes** this leaf for object mastery and owns the **program/term rollup** (KN-2/KN-10). `[FACT: contract.md:53-56]`
- **`services/books`** (DONE, PR #70) — `getPlansForConsumer(): Promise<ReadingPlan[]>` (BK-12 read-provider);
  `book_subjects` is **Books-owned** (Books writes the junction, Education never does). `[FACT: services/books/service.ts:310,1230; learning.ts:43 "homework=Tasks-owned", books partition Books-side]`
- **`foundation/spaces` resolvers + SpacesService** — entity_links/entity_tags/pages WRITES; backlink/
  association resolvers READ. Education **composes** the 7 `entity_type`s ALREADY registered at DB-4 #12
  (`subject`/`institution`/`program`/`curriculum`/`term`/`assessment`/`subject_document`) — **no `register`
  action in ①** — and tags/links Program·Curriculum·Subject. `[FACT: db/schema/_registry.ts:100-106 (shipped DB-4 #12); business-rules.md:64-66]` `[[spaces-junctions-split-read-write-tagentity-blind-inserts]]`
- **`foundation/effects` (dormant seam)** — `effects?: { rail: EffectRail; registry: EffectRegistry }` (the
  inline shape; `EffectsPort` name collides at the core barrel → inline it, don't import the symbol). Used ONLY
  by S10's emit-only measurement signal; **dormant at M1** (no handler registered, no named consumer — C-E2). `[FACT: services/books/types.ts:99,32; services/knowledge/types.ts:85-87]` `[[event-fanout-pull-push-split-and-occurrence-grain]]`
- **`services/journals`** — `registerLearningEducationJournal(registry, svc)` + `getDay…Digest` for the
  `/summary` PULL (today's class sessions + due assessments). The `registerBooksJournal` precedent. `[FACT: services/books/journal.ts:56; contract.md:57]`
- **`Repository`** (generic encrypt-on-write/decrypt-on-read) — M1.0 `encryptedFields: []` dormant seam on
  every table (even `[E]`-marked). `[FACT: learning.ts:50; db/CLAUDE.md]` `[[m10-repos-use-empty-encryptedfields-seam]]`

### Deny-safe / forward ports (built empty, swap zero-signature at M2)

- **ICS live fetch** (`ics?`) — device-mediated fetch is **M2** (ADR-014 X1); M1 = a deny-safe port ⇒
  `ics-unavailable`; the schema (configs/events) + add-only dedup logic are M1. `[FACT: identity.md:44; learning.ts:46 "AI document-extraction pipeline = ADR-014/015 service"; part-1.2-reruns:54-59]`
- **Document extraction** (`ai?` / `ingestion?`) — syllabus→schedule/assessments is a **scoped extract**,
  ADR-015 (AI1/AI3/AI5/AI6), **M2**; auto-recorded rows carry `source='ai'` (the column exists). `[FACT: business-rules.md:42; learning.ts:46; part-1.2-reruns X11→AI*]` Never an AI4 agent (C-AI4).
- **Tasks→Education API** (homework) — `services/tasks` is **NOT built** (only a CLAUDE.md). `[FACT: services/tasks/ has no service.ts]`
  Homework is Tasks-owned, no local table (C-HW); M1 = a deny-safe read port ⇒ `[]`. `[FACT: business-rules.md:43-45; learning.ts:43]`

## 2. NEEDS — what the service must expose (seam-contract preview, for fe-learning-education P6)

1. **Hierarchy CRUD** — institutions / self_taught / programs(parentRef) / curricula(fork+lineage) /
   terms(hierarchical) / subjects(routed). Routing enforced: a subject's parent chain must resolve
   (`UnroutedSubjectError`), intermediate levels skippable (A1). `[FACT: contract.md:13-16; business-rules.md:17-19; learning.ts:100-102]`
2. **Curriculum fork** — deep copy + `forked_from_id` lineage; template immutable on fork
   (`TemplateImmutableError`). `[FACT: business-rules.md:52-55; contract.md:65; learning.ts:201-202]`
3. **Subjects CRUD** — the reshaped `courses`; `progress` never settable (derived, M3). `[FACT: learning.ts:92; business-rules.md:46-51]`
4. **Schedule + class_sessions** — one `subject_schedule` per subject (UNIQUE); sessions via `createSession('class')`
   - own extension; `getWeeklySchedule(range)` derives across subjects. `[FACT: learning.ts:225-247; contract.md:17-19]`
5. **ICS** — `addFeed` / `syncFeed` (deny-safe at M1) / `matchEvent` / `ignoreEvent`; add-only dedup
   UNIQUE(feed_id,uid) + is_ignored, revoke via `is_active` (never delete). `[FACT: learning.ts:109-153; business-rules.md:30-33]`
6. **Grading** — `createGradingSystem(scope,{scale,components})` + `computeGrade(subjectId)` /
   `computeGPA(termId|curriculumId)` derived through weighted components; weights ≠ 100% → flag
   (`GradingWeightError`), never normalize. `[FACT: contract.md:24-25,63; business-rules.md:34-38,73]`
7. **Assessments** — CRUD by subject/type; `recordResult` → grade recomputes; `source` provenance. `[FACT: contract.md:26-27; learning.ts:285-308]`
8. **Measurement** — `setMeasurement(ref,{kind,mode})` on the Education-forged entity (never Projects' storage);
   `getProgress(ref)` derives-on-read (M3 nullable override). `[FACT: contract.md:32-35; business-rules.md:46-51; learning.ts:324-339]`
9. **Vault** — `addDocument(subjectId,…)` inline/R2 + `getVault` (docs + notes). `[FACT: contract.md:30-31; learning.ts:310-322]`
10. **Cross-module reads** — `listEducationTasks` (deny-safe), `getPlansForConsumer` passthrough, journal digest,
    Knowledge mastery consume. `[FACT: contract.md:28-29,48-58]`

## 3. ORGANIZATION — slice shape (decided in slice-map.md)

The natural dependency order: **hierarchy spine first** (everything routes to a subject), then **subject +
schedule/sessions** (the session sub-type must register before `createSession('class')`), then **grading →
assessments → measurement** (grade feeds measurement), then **vault + tags/links + ICS**, then **cross-module
fan-out** (Knowledge/Books/Journals/Tasks seams). Full slicing in `slice-map.md`.

## 4. IMPLICIT RULES — the No-Guessing catches (surfaced before build)

- **R1 — `class` session sub-type must register before `createSession('class')`.** Mirror `registerBooks`:
  try/catch `DuplicateSubType`, `allowed_effects: []`. Without it, session creation throws `SessionTypeNotFound`.
  `[FACT: books/service.ts:748-750; "throws until this runs" 747]` `[[compose-substrates-against-branch-logic-not-summary]]`
- **R2 — grade/GPA/progress are DERIVED, never stored as truth.** No write path to `subjects.progress` or a
  computed grade column; compute on read through the grading system + measurement engine. `[FACT: conventions.md:40-41; learning.ts:92]`
- **R3 — `education_measurements.measurement_kind` is NOT-NULL no-default** (caller always supplies — a dedicated
  measure entity, deliberately unlike deliverables' `milestone` default); `binding_mode` nullable ⇒ derive. `[FACT: learning.ts:331-334; decisions.md:440]`
- **R4 — no soft-delete on `class_sessions` / `subject_documents` / `ics_*`.** The base/`PJ-8`/add-only patterns.
  `findWhere` skips the soft-delete filter — filter `deleted_at` explicitly on the 11 tables that have it. `[FACT: learning.ts:39-41,103,125,149,236,321,337]` `[[repository-findwhere-skips-softdelete-filter]]`
- **R5 — no FK anywhere; refs are plain TEXT.** Cross-table integrity is app-layer; a dangling ref is tolerated
  (no-FK eventually-consistent). `[FACT: learning.ts:37]`
- **R6 — `course_type` is a subject-level modality, nullable** (the mode lives at the Institution/Self-taught
  level, not on the subject). Don't re-derive the mode from it. `[FACT: learning.ts:90; conventions.md:33]`
- **R7 — ICS event matching no subject stays unmatched** (surfaced for manual match), never guessed. `[FACT: business-rules.md:72]`
- **R8 — `@vida/types` Course→Subject reconcile is in-slice DB-11** (rename `Course`→`Subject`, drop retired
  inline `tags`, `progress`→nullable). Grep breaking-change before renaming. `[FACT: learning.ts:48 "→ DB-11"]` `[[drizzle-row-not-assignable-to-vida-types-interface]]`
- **R9 — a consent/egress gate with no M1-reachable deny reason = exported-vocabulary forward-seam, not a wired
  throw** (the `PositionConflictPending` / `IntegrationConsentError` precedent). Applies to the ICS/AI ports. `[FACT: TASKS.md mod-books g1 B1]` `[[absent-deny-safe-port-write-is-noop-not-new-error]]`
- **R10 — `[E]` fields but `encryptedFields: []` at M1.0** — JSON-as-text (`metadata`, `scale_config`) needs
  service-side serialize/parse if typed; `scale_config` is `[E]` text. `[FACT: learning.ts:50,89,262]` `[[json-t-columns-need-service-serialize-in-m10]]`

## 5. Scope guards — the C-\* negatives (do NOT build; rerun-ratified)

- **C-HIER** — hierarchy shape is DONE (schema); no re-design, just CRUD. `[FACT: part-1.2-reruns C-HIER]`
- **C-HW** — homework is Tasks-owned; no local table, read-only via the (deny-safe) Tasks→Education API. `[FACT: learning.ts:43; part-1.2-reruns C-HW]`
- **C-E2** — Education is NOT an economy feeder; `allowed_effects: []`, no `grant_currency`. `[FACT: learning.ts:46; part-1.2-reruns C-E2]`
- **C-M5** — Education is outside the M5 advertise set; provides measurement via its OWN entity + consume seam,
  never `advertise()`. `[FACT: learning.ts:46; part-1.2-reruns C-M5]`
- **C-AI4** — document extraction is a scoped extract, NOT an AI4 agent/tool envelope. `[FACT: identity.md:48; part-1.2-reruns C-AI4]`
- **Views** (My-Week / cross-subject / GPA-report) are ② frontend (P6), not this build. `[FACT: learning.ts:47; structure-data.md:57]`

## 6. Open UNKNOWNs (resolve at the Decomposition Gate, never guess past)

- **[INTERP]** The reverse KN-10 wiring (Education feeding `assessmentResults`/`paceVsSyllabus` back into
  Knowledge's deny-safe nulls) — per C-M5 + INT-1 (no cross-module table reads), the likely resolution is a
  **forward seam Knowledge owns** (an injected provider at M2), NOT an Education advertise. Confirm the direction
  in slice-map; default = Education does not wire it this build (Knowledge's nulls stay deny-safe). `[FACT: knowledge/types.ts:158-159; contract.md:53-56]`
- **[INTERP]** `subjects.modules`/`topics` (counters `total_modules`/`completed_modules` exist; module/topic
  sub-entities are the Knowledge link, not Education tables) — confirm Education owns only the counters, Knowledge
  owns topic content. `[FACT: learning.ts:93-94; README.md:21-25]`

## Completion checklist

- [x] BASELINE reconciliation (stale-INTENDED vs built schema) · [x] dependencies (built + deny-safe)
- [x] needs (seam preview) · [x] organization (slice order) · [x] implicit rules R1–R10 · [x] C-\* scope guards
- [x] every claim [FACT/INTERP/UNKNOWN] · [x] open UNKNOWNs homed to the Decomposition Gate
