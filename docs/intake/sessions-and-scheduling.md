# Intake — sessions-and-scheduling (⭐ RENAMED + REFRAMED 2026-07-11, was "study-sessions-planner")

> ⭐ **REROUTE (Victor 07-11): EXTRACTION + PROMOTION.** No longer a Learning sub-context. Becomes its own
> **foundational (Level-1) cross-cutting module `Sessions & Scheduling`** — 4th+ extraction from Learning
> and a sibling to Routines. Two pillars: (1) the **Sessions framework** (polymorphic session supertype +
> extensible sub-type registry — many domains own a sub-type) and (2) the **Scheduling engine** (availability
>
> - `planned_blocks` + placement, per G2-shape). The OS already has 9+ scattered session entities with no
>   shared spine — this module is that spine. Intake file renamed → `docs/intake/sessions-and-scheduling.md`.
>   Fill order note: promotes ABOVE its former siblings; documented modules (Books/Education/Knowledge/Language)
>   gain a `*_session` sub-type conforming to the shared contract (BK-10 reading_session PRESERVED as a sub-type).

# (original scope: study-sessions-planner — level 2)

> Fill order: documented AFTER its foundations — Education ✅, Books ✅ (own module), Knowledge ✅
> (own module), Tasks ✅, Habits ✅. Consumed downstream by Journals (aggregates study) and the
> parked Global Calendar. Flashcards (sibling) is documented next.

## Current (enforced reality — authoritative source)

Two distinct entities live here today, plus a 5-table planner domain — **all schema-only, zero logic**:

**The LOG (actual completed work):**

- `study_sessions` `[FACT: ADR-002 L2524-2551]` — a completed focused-study record. `resource_type ∈
{course,book,topic,homework,article,video,podcast}` + `resource_id` (polymorphic). Fields:
  `duration_minutes`, `focus_rating` 1–5, `energy_level` 1–5, `distraction_count`, `pages_read`,
  `lessons_completed`, `key_learnings` `-- [E]`, `started_at`/`ended_at`. `StudySession` type exists
  `[FACT: packages/types/src/learning.ts L194-211]`. **No `batch_id` / `scheduled_session_id` link** — a
  completed log is NOT tied back to the plan that scheduled it.

**The PLANNER domain (§5.11 — 5 tables):**

- `study_availability` `[FACT: ADR-002 L2748-2770]` — recurring weekly windows: `day_of_week` 0–6,
  `start_time`/`end_time` (HH:MM), `is_available`, `preference_score` 1–5, `preset_block ∈
{early_morning…night}` (7 blocks), `max_session_minutes`.
- `availability_exceptions` `[FACT: L2776-2792]` — per-date overrides (`exception_date`, `is_available`,
  `reason -- [E]`, partial start/end).
- `study_plan_batches` `[FACT: L2798-2817]` — a generated plan: `course_id` FK (SET NULL),
  `name -- [E]`, `status ∈ {draft,pending_approval,approved,active,completed}`, `total_sessions`,
  `generated_at`/`approved_at`. **Scoped to ONE course** (course_id, nullable).
- `scheduled_study_sessions` `[FACT: L2823-2856]` — the PLAN rows: `batch_id` FK (SET NULL),
  `resource_type ∈ {topic,flashcard_deck,book,course,homework}`, `resource_id`, `session_type ∈
{study,review,practice,exam_prep,homework}`, `status ∈ {scheduled,in_progress,completed,skipped,
rescheduled}`, `scheduled_date`, `start_time`/`end_time`, `duration_minutes`, `urgency_score REAL`,
  `start_page`/`end_page`, `chapter_id` FK→book_chapters (SET NULL).
- `session_templates` `[FACT: L2861-2881]` — Pomodoro presets: `work_minutes`(25), `short_break_minutes`(5),
  `long_break_minutes`(15), `intervals_before_long_break`(4), `auto_start_breaks`, `auto_start_work`,
  `is_default`.

**Boundaries already fixed by the dependency graph & documented foundations:**

- Dep graph `[FACT: ADR-002 L3751-3757]`: `courses/study_topics → scheduled_study_sessions → pomodoro_sessions`;
  `study_plan_batches` feeds scheduled sessions. **`scheduled_study_sessions → pomodoro_sessions`** — the
  Pomodoro RUNTIME is a **Notes & Pages** entity (`pomodoro_sessions`, `entity_type` includes `study_session`
  `[FACT: ADR-002 L1435, L3815]`), NOT owned here.
- **Books BK-10/BK-12** `[FACT: docs/features/books/business-rules.md]`: reading has its OWN
  `reading_sessions` entity (never a `study_session`); Books owns `reading_plans` — **the Study Planner
  CONSUMES plans/deadlines/sessions, never writes them.**
- **Education** `[FACT: docs/features/learning/education/contract.md L42]`: "Study Sessions target subjects";
  Education is the Learning hub.
- **Knowledge KN-10** `[FACT: docs/features/knowledge/*]`: object mastery is a measurement source; per-kind
  `learning_realm` drives the default study method — Knowledge owns methods/curves, not the Planner.
- `study-planner.ts`, `pomodoro-service.ts`, `models/learning.ts` are **all 0-line placeholders** — no v2
  logic exists. The schema is the only current artifact.

## Existing docs incorporated (D5b)

No `.md` documents THIS context yet (manifest row ⬜). Incorporation is a no-op. Cross-references FROM the
documented foundations (Books, Education, Knowledge) are captured under "Boundaries" above — they constrain
this context's contract and are treated as authoritative.

## Legacy (life-os v1 — context only, never a decision)

v1 had a **real, if flawed, planner engine** (v2's §5.11 schema is derived from it, minus the logic):

- `types/studyPlanner.ts` (409 lines) `[FACT: ../life-os/src/types/studyPlanner.ts]`:
  - **Availability presets** (early_morning…night, per-day, max_session_minutes) — v2 kept as `preset_block`.
  - **Session templates** richer than v2: `default_focus_technique`, `description`, `show_notifications`,
    `play_sounds`, `usage_count`/`last_used_at`, `icon`/`color`. v2 dropped these.
  - **Pomodoro sessions** with interval tracking: work/short_break/long_break, `total_pause_seconds`,
    `was_interrupted`/`interruption_reason`, `session_number`, links `scheduled_session_id`+`template_id`.
    (v2 relocated Pomodoro to the Notes domain `pomodoro_sessions`.)
  - **Agenda view**: overdue/today/tomorrow/later grouping, `urgency_score`, `agenda_priority`,
    `days_overdue`, computed fields (`groupAgendaSessions()`).
  - **Plan wizard** (`SimplifiedPlanOptions`): date-range presets (1wk/2wk/1mo/custom), `includeReviews`,
    `includeNewLearning`, `sessionDuration` (15/25/45/60), `dailyGoalMinutes`.
  - **Smart complete**: quick (<15min, no rating) vs full complete; SM-2 update for topic sessions
    (`quality` score) — planner reached INTO the review algorithm on completion.
  - **Statistics**: SessionStats/DailyStats/WeeklyStats (completion rate, avg focus, planned vs actual).
- Components confirm the surface `[FACT: ../life-os/src/features/learning/components/scheduling/ +
study-planner/]`: PlanGeneratorModal, useStudyPlanGeneration, sessionPriorityUtils (urgency),
  RescheduleModal, SkipConfirmDialog, StudyQueueWidget, WeeklyAvailabilityGrid, SessionTimer,
  CompletionRatingModal, PlanReviewList.
- v1 scoped the planner to Learning (topic/skill/book) only, per-course batches. It did NOT orchestrate
  across the whole platform, and it owned its own reschedule/skip loop.

## GAP MAP (what the code cannot answer — for Victor, one batch)

See the questions posed in-session. Provisional gaps:

- [x] **G1 — Module boundary & altitude. RESOLVED (Victor 07-10): EXTRACTION.** Focus & Scheduling becomes its
      OWN cross-module orchestration module (4th extraction from Learning, after Skills/Books/Knowledge; a
      sibling to Routines as an orchestration layer). Consumes Education, Books, Knowledge, Flashcards, homework,
      and plausibly Language/Skills/Health. Learning drops to 2 sub-contexts (Education, Flashcards) — or
      Flashcards may also extract; TBD. NOT a Learning-scoped tool.
- [~] **G2 — Owner vs consumer. DIRECTION CONFIRMED (Victor 07-10): aggregator, NOT duplicator.** The Planner
  owns its own generated sessions (Education topics/homework/exam-prep) but does NOT own module schedules
  (Books reading_plans, Flashcards SM-2 queue, Knowledge review curves). ⚠ Victor: "this changes the entire
  shape of the entity — we need to think on how it works." → ACTIVE DESIGN FORK (see G2-shape below).
- [x] **G2-shape — RESOLVED (Victor 07-10): time-block + provider.** `scheduled_study_sessions` reshapes into
      **`planned_blocks`** the Planner OWNS (when/duration/availability-window) that POINT at either (a) a
      Planner-generated study unit (topic/homework/exam-prep) or (b) a module-owned due-bucket resolved LIVE by
      its owner. Every schedulable module implements a provider contract **`dueIn(range) → DueItem[]`**
      ({ref_id, label, est_minutes, urgency, hard_deadline?}). Agenda = own blocks ∪ live provider reads —
      **zero mirroring, zero staleness** (kills the v1 flaw + honors BK-12). Providers today: Education
      (also the generation source), Books (reading_plans), Flashcards (SM-2), Knowledge (review curves),
      Language (daily goal); future Skills/Health plug in via the same seam (fulfills G1 orchestration).
- [x] **G7 — RESOLVED (Victor 07-10): availability is Planner-owned.** `study_availability` = a scheduling
      INPUT the Planner owns; **Routines** may preset recurring windows into it; the **Global Calendar** only
      renders the placed result. Three roles, no overlap.
- [x] **Global Calendar relationship — RESOLVED (Victor 07-10).** Planner = WRITER (turns due-work into
      time-placed blocks — decides _when_); Global Calendar = READER (renders blocks as a "study" layer beside
      class ICS, tasks, reminders, habits). They SHARE the `dueIn()` provider primitive. Without the Planner the
      Calendar shows only deadlines; with it, it shows the _plan to meet them_. ⭐ This resolves the Calendar's
      core logic. → `dueIn()` promoted to a **platform-level primitive** (Planner + Calendar + Journals agenda).
- [ ] **DESIGN-PASS flags (build phase, not now):** ① placement algorithm (urgency scoring, deadline-backfill,
      recalc-on-miss) = G5; ② `dueIn()` provider contract as a shared platform primitive.
- [x] **G3 — RESOLVED (Victor 07-11): polymorphic Session supertype + sub-types (NOT one flat table).** Each
      session is a first-class OS entity with its OWN tooling/rules. Shared spine (id · session_type ·
      scheduling_mode · planned_block_id? · timing · status · focus metrics · key_learnings[E] · sync) +
      per-type extension. **BK-10 preserved** — reading_session is a sub-type, keeps its tooling, not folded.
      ROSTER (from OS-wide sweep): `study_session`·`class_session`(attended, Education)·`focus_session`
      (non-study deep work)·`reading_session`(Books)·`practice_session`+`daily_session`(Language)·
      `review_session`(Flashcards/Knowledge)·`workout_session`(Health/Wave-R)·`pomodoro_session`(Notes = shared
      RUNTIME, not a peer). ⭐ New axis **`scheduling_mode`**: attended (real-world fixed, consumes availability)
      | planned (Planner places) | ad-hoc. → drove the module REROUTE (see header) + Sessions ARCHITECTURE below.
- [x] **S1 — RESOLVED (Victor 07-11): B, user-extensible — but "rich."** Extensibility ≠ shallow custom types;
      it means a user-created type can ATTACH to a specific OS entity (habit/project/purpose/…) and DECLARE how
      it penetrates OS layers. Default + custom types share the same wiring. Key dev-time principle: rich types + deep OS integrations. (Victor's driving use case: "a session type attached to a specific habit.")
- [x] **S2 — RESOLVED (Victor 07-11): absorb ALL look-alikes as sub-types.** Overrode my "keep some OUT." Every
      session-shaped entity becomes a sub-type with its OWN individuality (tooling/fields) + integrations —
      unifies the scattered entities (ends fragmentation). Reconciliations to spec: `work_session` ⟷ Tasks
      `task_time_logs`; `interaction` (Relationships, dual-nature — also a Calendar event); `daily_check_in`
      (Check-ins); `meal_log`/`workout_session` (Health). Each sub-type's individuality + integration must be
      established for seamless personalization/UX.
- [x] **S3 — RESOLVED (Victor 07-11): TWO axes + defined flow + defined OS effects.** `sub_type` (tool-family +
      owner) × `purpose` facet (new_learning/review/exam_prep/pre_class/post_class/maintenance…). PLUS each type
      declares its lifecycle FLOW and how it AFFECTS data/information across the OS (→ Integration Contract, S5).
- [x] **S5 — RESOLVED (Victor 07-12): FOUR-dimensional Integration Contract + shipped-fully-configured principle.**
      Every session type declares: (1) **Attachment** — polymorphic links to OS entities, type-level ("always
      attached to a habit") + instance-level ("this session is about Topic X"); (2) **Effects (penetration)** —
      what completing/running it does across the OS (complete linked habit occurrence · log time to task/project
      · emit mastery/pace signal to Knowledge/Education · contribute to a purpose metric · award XP · surface in
      Journal+Calendar · attach Pomodoro on start); (3) **Lifecycle flow** — shared state machine
      (scheduled→in_progress→completed|skipped|rescheduled) with per-type transitions+hooks (attended class =
      "missed" not "skipped"; review = fires SM-2; workout = writes volume to Health); (4) **Permissions /
      constraints** — what a type is ALLOWED to touch (guardrail for user-created types; instance of the guarded
      opt-in extension-model principle): effects scoped to attachments, no double-count (XP/habit occurrence),
      user-created-type capability limits, per-effect consent for sensitive modules (Finance/Health).
      ⭐ **SHIPPED-DEFAULTS PRINCIPLE (Victor):** every IDENTIFIED sub-type ships FULLY CONFIGURED by us
      (attachment/effects/lifecycle/permissions pre-defined — the user does NOT set up the main ones; not viable).
      User MAY edit a shipped type but it is **possible-but-not-recommended**. S1 user-extensibility is for the
      long-tail NEW types the user invents, NOT for configuring defaults. → feeds the **Session Framework ADR**.
- [x] **S4 — RESOLVED (Victor 07-12): table-per-type (my rec).** Base `sessions` spine (Sessions&Scheduling owns:
      id · sub_type · purpose · scheduling_mode · timing · status · focus metrics · sync) + per-sub-type
      extension tables owned by their domain module, 1:1 on `session_id`. Cross-type reads (Calendar/Journal/
      analytics) hit the base; tooling joins the extension. Gives the single stable `session_id` S5's
      effects/attachments/pomodoro/planned_block need. **ADR must state the base+extension SYNC rule** (separate
      encrypted blobs → travel together, or reader tolerates a partial). → **Session Framework ADR** (Phase 4).
- [x] **G4 — RESOLVED by architecture (Victor 07-12 confirm).** Completing a `planned_block` instantiates the
      right Session sub-type via `createSession()` (S5 effect); the session spine carries `planned_block_id` — the
      block = intent, the session = reality, linked (restores the FK v2 dropped). The session log is the source of
      truth for analytics (G8) + the measurement signal (G10).
- [ ] **G5 — DEFERRED to design-pass (build phase).** The placement algorithm: inputs (availability, homework/
      exam deadlines, Knowledge urgency/mastery, Books quotas, Flashcard due dates) + policy (urgency scoring,
      spaced-rep integration, respecting module-owned plans) + batch lifecycle + **recalc on miss/skip** (like
      Books Quota Planner) + batch scope (widen per-course → whole-life). Own mini-intake before speccing.
- [x] **G6 — CONFIRMED (Victor 07-12).** Pomodoro runtime stays a **Notes** entity (`pomodoro_sessions`), a
      shared timer any session attaches to (S5 "start → attach Pomodoro"); `session_templates` owned by
      Sessions&Scheduling. **Restore v1's richer template fields** (focus_technique, description, notifications,
      sounds, usage tracking) **+ interruption/pause tracking** (was_interrupted, interruption_reason,
      total_pause_seconds) — cheap, real intent, feeds focus-pattern analytics.
- [x] **G7 — RESOLVED (Victor 07-10, above): availability is Planner-owned; Routines presets; Calendar renders.**
- [x] **G8 — CONFIRMED (Victor 07-12): DERIVED, not stored.** Completion rate · avg focus · planned-vs-actual ·
      per-module time · streaks computed on-read from the session log (matches Habits/Finance convention; uniform
      base table makes cross-type analytics one query). Slow view → device-local cache, never a synced aggregate.
- [~] **G9 — DEFERRED (Victor 07-12): views done SEPARATELY after everything is finished.** The module view
  family (Scheduling Hub · Plan wizard · Sessions Management · Availability editor · Start-session wizard ·
  Session detail · per-type registry tools) gets its OWN dedicated pass post-completion. Aligns with the
  07-05 per-module VIEWS review flag. Aspect docs note views as deferred, not fabricated.
- [x] **G10 — CONFIRMED (Victor 07-12): signal SOURCE only.** On completion Sessions emits an event (duration,
      resource, outcome — an S5 effect); Knowledge owns mastery (KN-10), Education owns pace-vs-syllabus — they
      read their own events and compute their own measures. Sessions owns SESSION analytics, never domain mastery.

## Status

- [x] intake "whole" (2026-07-12) — every gap resolved or explicitly deferred with an owner:
      G1·G2·G2-shape·G3·G4·G6·G7·G8·G10 + S1·S2·S3·S4·S5 RESOLVED · G5 deferred→design-pass ·
      G9 deferred→dedicated views pass. Surfaced + WRITTEN: **ADR-004 Session Framework** (S4 storage + S5 4-dim contract; Accepted 07-12).
- [x] context was NOT `ambiguous` in Phase 0 (structural manifest row, not prose) — no role to resolve

## Deferred / surfaced (for Phase 4 + build)

- **ADR-004 Session Framework** (WRITTEN 07-12, Accepted) — table-per-type storage (S4) + the 4-dimension
  Integration Contract (S5) + base/extension sync rule. The module's foundational decision; aspect docs +
  ADR-002 reference it. `docs/core/decisions/ADR-004-session-framework.md`.
- **G5 placement-algorithm design-pass** — own mini-intake before speccing the scheduler internals.
- **G9 views pass** — dedicated, post-completion (per 07-05 per-module VIEWS flag).
- **ADR-002 amendment (Sessions&Scheduling slice)** — base `sessions` spine + per-sub-type extension tables
  (reading/workout/class/practice/review/work/focus…) + `planned_blocks` (reshapes `scheduled_study_sessions`)
  - availability/exceptions + session_templates (restored fields) + attachment/effects/permission tables;
    reconcile `task_time_logs` ⟷ `work_session`; supersede v2 §5.11 flat planner + Learning-only `study_sessions`.
- **Cross-module:** documented modules (Books/Education/Knowledge/Language/Health-when-built) each gain a
  `*_session` sub-type conforming to the contract — note in their docs at their next touch.
