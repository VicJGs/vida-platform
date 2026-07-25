<!-- Business Rules — features/learning/education · /documentation Phase 2 · sources: ADR-002 §5.10/§5.18 · learning.ts · CLAUDE.md §7 · intake -->

# Business Rules — Learning: Education  (level: Feature / Learning sub-context)

> Inherits the CORE constitution `[[../../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, + the extension-model
> principle. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **ED-1 — Encrypted content.** Subject (`courses`) `title`/`description`/`provider`/`instructor`/`url`/`tags`/
  `metadata`, ICS `feed_url`/`feed_name`/`summary`/`description`/`location`/`raw_event`/`last_error` are `[E]`
  (ZK-1); enums, dates, progress, counters are plaintext. All INTENDED entities follow the same split (names/
  free text `[E]`; structure plaintext). `[FACT: ADR-002 §5.10/§5.18 [E]; learning.ts @encrypted]`
- **ED-2 — One hierarchy, two modes (⚠ INTENDED).** Every Program parents to an **institution** OR a
  **self_taught** row (separate tables). Below that, formal and self-taught are structurally identical.
  `[INTENT H2, reframe]`
- **ED-3 — Subjects are always routed (⚠ INTENDED).** A Subject belongs up the chain (curriculum → term →
  degree tier) — never an orphaned flat list. Intermediate levels may be *skipped* (A1) but a subject's parent
  chain is always resolvable. `[INTENT H2 addendum, A1]`
- **ED-4 — A class is a session of a Subject (⚠ INTENDED).** `class_sessions` are the individual meetings; the
  weekly schedule renders from sessions; assessments/grades/documents/homework/notes attach to the **Subject**,
  never to a session. Retake = new subject row in a new term. `[INTENT H5]`
- **ED-5 — The subject schedule is the single source (⚠ INTENDED).** Each Subject has one `subject_schedule`,
  fed by exactly three methods: **ICS sync** (device-side, now — ADR-014 X1) · **document extraction** (⚠ deferred —
  a scoped extract whose model call splits to ADR-015 via X11: `on_device`/`cloud` modes AI1, cloud=egress+scope-min
  AI3, the untrusted syllabus's provenance bounded AI5; **not** an AI4 agent) · **manual shaping**. Sessions + the
  weekly view derive from it. `[INTENT H7; ADR-014 X1/X11; ADR-015 AI1/AI3/AI5]`
- **ED-6 — ICS is device-side and idempotent.** Feeds fetch on the device every `sync_interval_hours` — a
  device-mediated ingest (ADR-014 X1) of a user-added URL (the **X2 `user-managed`** layer) under `external_in_ok`
  (X5); the feed is an **add-only feed** — events dedup by natural key **UNIQUE(feed_id, uid)** + `is_ignored`, never
  delete (**X8**, already conforms); events match per **Subject**; revoking a feed stops future fetch but keeps
  synced events (X9); the feed→events shape is a declared normalization contract (X10). The server never sees feed
  plaintext. `[FACT: §5.18 L3629; INTENT H8; FACT: ZK-1; ADR-014 X1/X2/X5/X8/X9/X10]`
- **ED-7 — Grades compute against a user-shaped grading system (⚠ INTENDED).** A `grading_system` (per
  institution / self-taught program / overridden per subject) defines **weighted components** (homework · tasks ·
  exams · quizzes · tests · presentations · works — each with own weight/points, per professor) and the scale
  (A–F, 0–10, pass/fail, custom). A subject's grade & any GPA rollup (term/curriculum) are **derived** from
  assessments through the system — never hand-set as truth. `[INTENT H3]`
- **ED-8 — Assessments belong to Subjects (⚠ INTENDED).** Types: exam · quiz · test · **presentation** ·
  **work** (catch-all). Each carries date, weight/points (per the grading system), **modality**
  (online / physical presence), and grade. Auto-recordable from ICS now; from documents later (ED-5) — rows
  auto-recorded from extraction carry **`source=ai`** (ADR-015 AI6). `[INTENT H5 addendum; ADR-015 AI6]`
- **ED-9 — Homework is an education-task in the Tasks Universe (⚠ INTENDED).** A dedicated entity scoped ONLY to
  Education, owned by Tasks, consumed via the **Tasks→Education API** (the Project-Tasks pattern, TK-9-compliant).
  `[INTENT H4]`
- **ED-10 — Progress is measured, not counted, and Education-forged (⚠ INTENDED).** Subjects/Programs measure
  progress in an **Education-only measurement entity** — same axes as Projects (PJ-4), **separate storage/purpose**
  (never mixed): the multi-type pattern decomposes to **`measurement_kind`** (M1 — deliverable→`milestone`,
  count→`quantitative`, goal→the target's kind) × **`binding_mode`** (M2 — grade-derived→`derived-pull`,
  manual→`manual`), not a flat 5-way enum. Progress is a nullable override (`NULL ⇒ derive`, M3), derived/cached/
  recomputed — never a `NOT NULL DEFAULT 0` counter. `[INTENT H12; ADR-011 M1/M2/M3]`
- **ED-11 — Curricula are user-shaped and forkable (⚠ INTENDED).** The user inputs his institution's / a
  program's default curriculum as a BASE (local seed / imported — device-mediated, ADR-014 X1, ZK) and **forks** it (deep copy +
  lineage pointer) or builds from scratch. Formal curricula are institution-bounded; self-taught curricula are
  fully user-directed. Template edits never mutate the base. `[INTENT A3, H10]`
- **ED-12 — Terms are hierarchical time containers (⚠ INTENDED).** year ⊃ semester ⊃ term (type/level + optional
  parent); optional per A1. `[INTENT H9 refinement]`
- **ED-13 — Vault per subject (⚠ INTENDED).** Documents (syllabus, schedules, materials) + the subject's notes
  live in one client-encrypted vault (inline small / R2 large — the PJ-8 pattern). `[INTENT H6]`
- **ED-14 — Sparse data is normal.** From Subject → Topic, information is progressively fillable; UIs render
  partial data gracefully and invite increments — never demand completeness. `[INTENT H9.8]`
- **ED-15 — Defaults before personalization.** Every personalizable view ships a sensible default schema so the
  user "does not get lost and waste time personalizing instead of doing." `[INTENT H9 principle]`
- **ED-16 — Local-first; shared scoped tags.** Every write succeeds locally first (LWW); tags via the **`entity_tags`**
  primitive (`tag_id, entity_type, entity_id`, ADR-006 SP1) scoped to Education, on Program/Curriculum/Subject —
  retiring the inline `courses.tags` (As-is floor). `[FACT: LF-2/ADR-003; INTENT H11; ADR-006 SP1]`

## Validation & edge cases
- Enum CHECKs (current): `course_type`{online,in_person,hybrid,self_paced}, `status`{not_started,in_progress,
  completed,dropped}, `rating` 1-5. `[FACT: §5.10]` ⚠ `course_type` is superseded by the mode living at the
  Institution/Self-taught level — reconcile at build (candidate: keep as a subject-level modality).
- An ICS event matching no subject stays unmatched (surfaced for manual match), never guessed. `[INTERP ED-6]`
- A grading system with components summing ≠ 100% → flagged, not silently normalized. `[INTERP ED-7]`
- A subject with no grading system falls back to the program's/institution's; none anywhere → progress can still
  be measured by deliverable/goal/manual (ED-10). `[INTERP ED-7/ED-10]`
- Deleting a curriculum does not delete the base template it forked from (lineage is a pointer). `[INTERP ED-11]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Programs Dashboard | skeleton | "no programs — start one" + CTA | typed read error, retry | programs + measured progress (acing/lacking) |
| Education Hub (any tab) | skeleton | tab-specific empty + CTA | typed error, retry | entities in chosen view/grouping |
| Curriculum builder | loading base | blank canvas or template gallery | save/fork error → typed, draft kept | shaped curriculum (+lineage if forked) |
| Weekly schedule / My-Week (⚠ immature) | building from schedules | "no sessions this week" | partial subject read → flag | sessions across subjects |
| ICS sync | fetching (device) | "no events in feed" | fetch/parse error → `last_error`, retry | events deduped + matched per subject |
| Grading system builder | loading | "no system — create or inherit" | validation (weights) inline | system saved; grades recompute |
| Assessment entry / type pages | loading | "none scheduled" | validation error inline | assessment saved; grade feeds system |
| Subject page | skeleton | sparse-data placeholders (ED-14) | typed error, retry | schedule + vault + assessments + homework |
| Vault (docs+notes) | loading | "vault empty" | decrypt/R2 error → typed | encrypted docs + notes in one place |

## Failure behavior (fail loud — constitution §5)
- A failed grade/progress computation shows a flagged partial, never a wrong number as truth. `[INTENT ED-7/ED-10]`
- ICS failures land in `last_error` and surface on the feed config — never silent stale schedules. `[FACT: L3590]`
- Any ingestion path requiring server plaintext is refused absent explicit opt-in (extension model). `[FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**The FACT base is 3 tables + types; nearly the entire hierarchy is INTENDED** (the largest ADR-002 amendment
yet): `institutions` · `self_taught` · `programs` · `curricula`(+lineage) · `terms`(hierarchical) ·
`class_sessions` · `subject_schedules` · `grading_systems` · assessments · education-task entity (Tasks) ·
subject vault · Education measurement entity · subjects reinterpretation of `courses` (+ `course_type`
reconciliation). Design passes required: **measurement pattern** (shared with Projects, separate forges) and the
**grading-system component model**. INTENDED-immature views: My-Week · cross-subject assessments · GPA report.
Deferred (extension/AI): document extraction/auto-record. **Driver-token realignment (Part 1.2):** retire inline
`courses.tags`→`entity_tags` (SP1) + `courses.progress NOT NULL DEFAULT 0`→nullable-override (M3) [the two live-FACT
reframes]; decompose ED-10's measurement enum→`measurement_kind`×`binding_mode` (M1/M2); name the ICS X* layering
(X1/X2/X5/X8/X9/X10) + document-extraction AI* (X11→AI1/AI3/AI5/AI6, not AI4). Live invariants today: ED-1, ED-6
(schema), ED-16. `[FACT: ADR-002 §5.10/§5.18; INTENT: intake; ADR-006/011/014/015]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
