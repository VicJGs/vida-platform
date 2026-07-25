<!-- Conventions — features/learning/education · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · intake -->

# Conventions — Learning: Education  (level: Feature / Learning sub-context)

## How to build here
- **Route every Subject up the chain.** Never create an orphaned subject; its curriculum (→ term? → degree tier)
  must resolve (ED-3). Skipped levels (A1) are *collapsed*, not broken. `[INTENT H2]`
- **Attach to the Subject, schedule the session.** Assessments, grades, documents, homework, notes → the Subject;
  meetings → `class_sessions` derived from the one `subject_schedule` (ED-4/ED-5). `[INTENT H5/H7]`
- **Three schedule methods, one source.** ICS (device-side) · document extraction (deferred) · manual — all write
  the same `subject_schedule`; views never read feeds directly. `[INTENT H7]`
- **Grades go through the grading system.** Never hand-set a subject grade; record assessment results and let the
  system's weighted components compute (ED-7). Weights ≠ 100% → flag, don't normalize. `[INTENT H3]`
- **Homework is a Tasks entity.** Use the Tasks→Education API; never a local homework table, never direct task
  reads (ED-9, TK-9). `[INTENT H4]`
- **Progress is measured, Education-forged.** Use the Education measurement entity — `measurement_kind` × `binding_mode`
  (M1/M2, the Projects axes; the old flat `grade/deliverable/goal/manual/count` decomposes onto them), **never
  Projects' storage** (ED-10). Progress is a nullable override that derives (M3), never a stored counter. `[INTENT H12;
  ADR-011 M1/M2/M3]`
- **Fork, don't mutate.** Curriculum templates are immutable bases; forking deep-copies with a lineage pointer
  (ED-11). `[INTENT A3/H10]`
- **Ship defaults with every personalizable view.** Personalization is unlimited, but a default schema always
  exists so the user isn't lost (ED-15). `[INTENT H9]`
- **Render sparse data gracefully.** Subject→Topic info is progressively fillable; empty ≠ error (ED-14). `[INTENT H9.8]`
- **Vault = docs + notes together, encrypted.** Inline small / R2 large; the subject's notes surface inside its
  vault (ED-13). `[INTENT H6]`

## Naming & layout
- Display naming: **"Subjects" vs "Courses" is a user Preference (visual only — no DB change)**. `[INTENT H9]`
- Degree tiers (⚠ INTENDED enum): `high_school` / `bachelor` / `master` / `doctorate`. Term levels: `year` /
  `semester` / `term` (hierarchical). Assessment types: `exam` / `quiz` / `test` / `presentation` / `work`.
  Modality: `online` / `in_person`. `[INTENT H2/H5/H9]`
- Current FACT enums: `course_type`(4), `status`(4), rating 1-5 — `course_type` to be reconciled with the mode
  level at build. `[FACT: §5.10]`
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans 0/1, JSON as TEXT, dates `YYYY-MM-DD`, minutes
  for durations, soft delete, `_sync_*`; enums = unions + CHECK + Zod. `[FACT: CLAUDE.md Conventions]`

## Local landmines / "never do"
- **Never** orphan a subject in a flat list — the v2 `courses` mistake this reframe fixes (ED-3). `[INTENT]`
- **Never** hand-set grades, GPA, or progress — all derived (ED-7/ED-10); progress is a nullable override that
  derives (M3), never a `NOT NULL DEFAULT 0` counter. `[INTENT; ADR-011 M3]`
- **Never** attach assessments/documents to a session — subject-level only (ED-4). `[INTENT H5]`
- **Never** duplicate homework locally — Tasks owns it (ED-9). `[INTENT H4]`
- **Never** mix Education measurement data with Projects' (ED-10 — separate forges). `[INTENT H12]`
- **Never** mutate a curriculum template on fork (ED-11). `[INTENT]`
- **Never** fetch ICS/documents server-side — device-mediated (ADR-014 X1); AI extraction is a scoped extract in
  `on_device`/`cloud` modes (ADR-015 AI1, X11 split), never a server-plaintext fetch (refused, not downgraded), never
  an AI4 agent, never auto-widening the extraction's scope (AI5). `[FACT: ZK-1; ADR-014 X1/X11; ADR-015 AI1/AI5]`
- **Never** store tags inline on `courses` — use `entity_tags` (SP1), Education-scoped (retire the As-is inline
  `courses.tags`). `[INTENT; ADR-006 SP1]`
- **Never** ship a personalizable view without a default (ED-15). `[INTENT]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
