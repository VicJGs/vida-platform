<!-- Business Rules — features/sessions-and-scheduling · /documentation Phase 2 · sources: ADR-002 study_sessions L2524-2551 · §5.11 planner L2743-2882 · pomodoro_sessions L1432-1440,L1435 · dep graph L3751-3757 · Books BK-10/BK-12 · Education contract L42 · Knowledge KN-10 · docs/intake/sessions-and-scheduling.md -->

# Business Rules — Sessions & Scheduling  (level: Foundation / OWN MODULE)

> These invariants inherit the CORE constitution (ZK-1 zero-knowledge, LF-2 local-first) and the surfaced
> **extension-model principle** (guarded opt-in integrations). **[ADR-004](../../core/decisions/ADR-004-session-framework.md)**
> (table-per-type storage + the 4-dimension Integration Contract) is the structural decision behind SS-1…SS-6;
> this doc describes its rules, the ADR records the decision. `[FACT: ADR-004, Accepted 2026-07-12]`

## Invariants (what is ALWAYS / NEVER true)

**The Session framework**
- **SS-1 — One Session supertype, many sub-types.** A session is exactly one sub-type (`sub_type`
  discriminator) over a shared spine (`id · sub_type · purpose · scheduling_mode · planned_block_id? ·
  started_at · ended_at · status · focus metrics · key_learnings[E] · sync`). Sub-types today: `study` ·
  `class` · `focus` · `reading` · `practice` · `daily` · `review` · `workout` · `work` (+ user long-tail).
  `pomodoro` is **not** a sub-type — it is the runtime (SS-11). `[INTENT G3; FACT roster from OS-wide sweep — study_sessions L2524, language_practice_sessions L2933, language_daily_sessions L2999, pomodoro_sessions L1432, v1 WorkoutSession, Books reading_session]`
- **SS-2 — Two orthogonal axes.** `sub_type` (the tool-family + owner module) is independent of `purpose`
  (why: `new_learning · review · exam_prep · pre_class · post_class · maintenance · …`). Never conflate them
  into one enum (v1's flaw — the combinatorial explosion). Some sub-types pin their purpose (a `review`
  session's purpose is always review). `[INTENT S3; FACT v1 ScheduledSessionType conflated both — entities.ts L1551]`
- **SS-3 — Every session obeys the 4-dimension Integration Contract** (see `contract.md`): **(1) Attachment**
  (what it's about), **(2) Effects** (what it changes in the OS), **(3) Lifecycle** (the states it may
  travel), **(4) Permissions** (what it is allowed to touch). No session type — shipped or user-made — exists
  without all four declared. `[INTENT S5]`
- **SS-4 — Shipped types are fully configured; the user never sets up the main ones.** Every identified
  sub-type ships with its 4 dimensions pre-defined. A user MAY edit a shipped type (discouraged, warned);
  user-extensibility (SS-5) is for NEW long-tail types only. `[INTENT Victor S5-clarify 2026-07-12]`
- **SS-5 — User-created types are rich but guarded.** A user type may attach to any OS entity and declare
  effects — but only within its **permission envelope** (SS-6): effects are scoped to its attachments, it may
  not double-count, and sensitive-module effects (Finance/Health) require explicit opt-in consent. `[INTENT S1+S5-dim4]`
- **SS-6 — Effects are permission-bounded (the guardrail).** A session NEVER affects an entity it is not
  attached to; two types NEVER both complete the same habit occurrence / award XP for the same event
  (no double-count); user-type capabilities are a subset of shipped-type capabilities. This is the guarded
  opt-in extension-model applied inside the module. **The "no double-count" guarantee is grounded in the
  write-API contract + idempotency mechanism owned by ADR-004 §3.2.5 (constitution INT-2)** — deterministic
  `effect_event_id` + a dedup ledger; SS-6 is the Sessions-tier specialization of that mechanism.
  `[INTENT S5-dim4; FACT: ADR-004 §3.2.5, INT-2; inherits extension-model principle]`

**The Scheduling engine**
- **SS-7 — Aggregator, never duplicator.** The engine owns `planned_blocks` and its own generated sessions,
  but **never stores a copy** of another module's scheduled work. Module-owned due-work is read **live** via
  `dueIn(range)`; the agenda = own blocks ∪ live provider reads. A `planned_block` for module work **points**
  at the owner's item, it does not mirror it. `[INTENT G2/G2-shape; honors Books BK-12 — docs/features/books/business-rules.md]`
- **SS-8 — `planned_block` ↔ session is intent ↔ reality.** A block records the *plan* (when/duration/window);
  completing it calls the owner's `createSession()`, which instantiates the sub-type carrying
  `planned_block_id`. The block is never itself the log. This restores the FK v2 dropped (v2 split
  `scheduled_study_sessions` + `study_sessions` with no link). `[INTENT G4; FACT v2 study_sessions has no batch/scheduled FK — L2524-2551; v1 MERGED them into one row — entities.ts L1677-1711]`
- **SS-9 — Availability is Planner-owned.** `study_availability` + `availability_exceptions` are scheduling
  INPUT this module owns; **Routines** may preset recurring windows into it; the **Global Calendar** only
  renders the placed result. `scheduling_mode=attended` sessions consume availability; `planned` fill it.
  `[INTENT G7; FACT study_availability L2748-2770, availability_exceptions L2776-2792]`
- **SS-10 — Signal source, never a mastery owner.** On completion the engine emits an event (duration,
  resource, outcome). Knowledge owns mastery (KN-10) and Education owns pace-vs-syllabus; they read their own
  events and compute their own numbers. The engine owns **session** analytics (time/focus/completion) only —
  never a domain measure (single-ownership; prevents drift). `[INTENT G10; FACT Knowledge KN-10]`

**Runtime & analytics**
- **SS-11 — Pomodoro is the runtime of the `focus` sub-type, owned in THIS realm (⚠ REFRAMED 2026-07-15).**
  The timer runs a `focus` Session and attaches to a **`session_id`** — not a Notes entity. This module owns
  its templates (richer fields + interruption/pause tracking) as `focus` presets; the Notes `/pomodoro` block
  is a **widget/lens** showcasing pomodoro-enabled sessions (a view, never the owner). **This reverses the
  prior "Pomodoro is a Notes runtime" statement:** `pomodoro_sessions` is re-homed here + re-pointed at
  `session_id` (build-phase ADR-004 amendment + ADR-002 re-home). Full runtime rules:
  `[[../pomodoro/business-rules]]` (PD-1…PD-12). `[INTENT: Victor reframe 2026-07-15; FACT superseded: entity_type L1435 + Notes ownership; session_templates L2861-2881]`
- **SS-12 — Analytics are derived, never stored.** Completion rate · avg focus · planned-vs-actual ·
  per-module time · streaks are computed on-read from the session log (matches Habits/Finance). No synced
  aggregate tables; a slow view caches device-locally only. `[INTENT G8]`

## Validation & edge cases
- A `planned_block` whose target due-work vanished before it ran (deck emptied, reading plan recalced away) →
  the block resolves to **empty** and is auto-dropped/flagged, never a dangling row (SS-7 live-read makes this
  natural). `[INTENT]`
- A session completed with `ended_at < started_at`, or `duration` exceeding the block window → typed
  validation error; never silently stored. `[INTENT; FACT focus_rating/energy CHECK 1–5 exist L2531-2532]`
- Editing a shipped type (SS-4) → allowed but surfaces a "not recommended — may break integrations" warning;
  the change is scoped to the user's device, never pushed as a default. `[INTENT]`
- An effect firing on a linked entity that was deleted (attached habit removed) → the effect no-ops loudly
  (logged), never resurrects or errors the whole completion (SS-6 scoping). `[INTENT]`

## Terminal states (before any build — constitution §2)
Enumerated per capability, since "the missing tail is where bugs live":
- **A session (any sub-type):** scheduled/planned → in_progress → **completed** | **skipped** | **missed**
  (attended only) | **rescheduled**; plus **empty** (started, no data yet), **error** (failed effect, typed).
- **The agenda/queue:** loading (providers resolving) · empty (nothing due + no blocks → anti-lost prompt) ·
  error (a provider threw → that lane degrades, the rest render) · populated.
- **Plan generation (a batch):** draft → pending_approval → approved → active → completed; plus **failed**
  (no availability / nothing to schedule → explicit, never a silent empty plan). `[FACT study_plan_batches status L2802-2803]`
- **Provider read (`dueIn`):** ok · empty · timeout/error (that module's lane shows "couldn't load," others
  unaffected — SS-7). `[INTENT]`

## Failure behaviour (fail loud — constitution §5)
- A provider or effect NEVER fails silently: typed errors, explicit "not supported"/"couldn't load" states.
- The engine NEVER writes another module's schedule to "recover" from a failed live read (that reintroduces
  the v1 staleness the whole model exists to kill — SS-7).
- A permission violation (SS-6) is a hard, logged rejection, not a best-effort partial effect.

## Completion checklist
- [x] invariants with [FACT]/[INTENT] · [x] all terminal states enumerated · [x] failure is loud ·
  [x] inherits the core constitution + extension-model principle · [x] references ADR-004 (Session Framework)
