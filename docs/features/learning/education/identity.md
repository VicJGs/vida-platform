<!-- Identity — features/learning/education · /documentation Phase 2 · sources: ADR-002 §5.10 (courses) + §5.18 (ICS) · @vida/types/learning.ts · CLAUDE.md §7 · docs/intake/learning-education.md -->

# Identity — Learning: Education  (level: Feature / Learning sub-context 1 of 5)

**What it is.** The platform's **academic structure**: an 8-level hierarchy — **Institution/Self-taught →
Program → Curriculum → Degree → Term → Subject → Module → Topic** — through which the user organizes everything
he studies, whether **formally** (institution-granted degrees) or **self-taught** (forking real programs'
curricula to direct his own learning). It carries schedules (ICS-synced, document-derived, or hand-shaped),
a fully flexible **grading-system builder**, assessments, homework, per-subject vaults, and fluid,
measurement-based progress. `[FACT: CLAUDE.md §7; ADR-002 §5.10/§5.18; INTENT: intake reframe 2026-07-01/02]`

**The desire behind it.** The user wants his education to be **structured the way education actually is** — not
a flat course list. He studies in two modes (formal + self-taught) and wants both to share one spine: pick a
Program, shape its Curriculum (bounded by an institution, or freely — even "messy but purposeful"), and see
real progress — grades against the *actual* grading system his professor uses, deliverables, goals — while the
OS keeps his week organized. `[INTENT: Victor 2026-07-01→03]`

**Scope — a deliberate v2 reframe (the flat model was wrong).** `[INTENT: reframe + H1–H12 + A1–A4]`
- **FACT base (3 tables today):** `courses` (reinterpreted as **subjects**), `ics_feed_configs`,
  `ics_synced_events`. `[FACT: ADR-002 §5.10 L2372-2403, §5.18 L3581-3630]`
- **⚠ INTENDED hierarchy (largest expansion yet):** `institutions` + `self_taught` (separate tables) →
  `programs` → `curricula` (forkable, lineage) → degree tier (field) → `terms` (hierarchical: year ⊃ semester ⊃
  term) → subjects (properly routed, never orphaned) → modules → topics.
- **Optional depth (A1):** every intermediate level is skippable — the hierarchy is the maximum shape.
- **Class sessions (H5):** a *class* is a **session of a Subject** (one meeting); the weekly schedule is made of
  sessions; ICS events map to them, per subject.
- **Grading systems (H3):** a builder — weighted components (homework/tasks/exams/quizzes/tests/presentations/
  works, each with own weight + points, per professor), any scale (A–F, 0–10, pass/fail, custom), assessment
  modality (online / physical presence).
- **Progress (H12):** the Projects multi-type measurement PATTERN (grade-derived · deliverable · goal · manual ·
  count), **forged as an Education-only entity** — never mixed with Projects' data.
- **Views (H9):** Programs Dashboard (acing vs lacking) · 10-tab Education Hub (all view-modes + Education-scoped
  tags) · dedicated pages per Institution / Program / Curriculum (builder + template gallery) / Degree / Term /
  Subject · per-assessment-type pages. Defaults always shipped ("don't get lost personalizing").

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules]`
- **Not the whole Learning domain.** Books, Knowledge (topics' content), Study Sessions & Planner, and Flashcards
  are sibling sub-contexts that attach to this hub; **Skills** and **Language** are separate modules.
- **Not the owner of homework.** Homework is a **dedicated education-task entity inside the Tasks Universe**,
  served by a Tasks→Education API (the Project-Tasks pattern). `[INTENT H4]`
- **Not a certification authority.** Self-taught mode mirrors real programs for structure; the OS records, it
  doesn't credential.
- **Not a server-side scraper.** ICS fetch is device-side (ZK); syllabus/document extraction is a **deferred
  extension** (AI-agentic, opt-in — the extension-model principle). `[INTENT H7/H8; FACT: ZK-1]`
- **Not rigid.** From Subject down to Topic, data is **sparse and progressively fillable** — pages render
  gracefully with partial data and invite increments. `[INTENT H9.8]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
