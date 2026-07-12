# ADR-004: Model sessions as a table-per-type supertype governed by a 4-dimension Integration Contract

**Status:** Accepted
**Date:** 2026-07-12
**Decision Makers:** Victor J.
**Context:** Vida Platform — Sessions & Scheduling (foundation module, extracted + promoted from Learning "Study Sessions & Planner")
**Tags:** architecture · data model · API
**Amends:** ADR-002 (Data Model) — adds the `sessions` spine + per-sub-type extension tables + `planned_blocks` + Integration-Contract tables; supersedes the flat Learning-only `study_sessions` and the §5.11 mirror planner.
**Inherits:** ADR-001 (SQLite/libsodium) · ADR-003 (LWW sync) · the surfaced extension-model principle (guarded opt-in integrations).

---

## 1. Summary

Sessions are the OS primitive for **timed, focused activity** of any kind. This ADR locks how they are
modelled: a single **Session supertype** (a thin base row) with **per-sub-type extension tables** owned by
the domain module (**table-per-type inheritance**), and a **4-dimension Integration Contract** —
*Attachment · Effects · Lifecycle · Permissions* — that every session type declares and the framework
enforces. This is the structural foundation the Sessions & Scheduling module documents (`SS-1…SS-6`,
`SS-8`) are built on.

## 2. Context — what triggered this

The OS already had **9+ session-shaped entities scattered across modules with no shared spine**:
`study_sessions`, `language_practice_sessions`, `language_daily_sessions`, `pomodoro_sessions` (v2), a v1
`WorkoutSession` (Wave-R Health), Books' `reading_session`, and an implied `class_session`/`review_session`.
`[FACT: ADR-002 study_sessions L2524-2551, language_practice_sessions L2933, language_daily_sessions L2999, pomodoro_sessions L1432; v1 studyPlanner.ts]`

Three problems forced a decision now:
1. **Fragmentation** — every "session" was re-invented per module, so cross-cutting surfaces (the daily
   Journal, analytics, the parked Global Calendar) had no single thing to read.
2. **User-extensible types with OS reach** — the intent is that a user can create a session type *attached
   to a habit/project/purpose* and have it *affect* those modules (complete a habit, log time, award XP). That
   power needs a **stable identity to hang effects off** and a **guardrail** so a custom type can't corrupt data.
3. **No plan↔actual link** — v2 split `scheduled_study_sessions` from `study_sessions` with **no FK**; v1 had
   merged them into one row. Both are wrong. `[FACT: v2 study_sessions has no plan FK L2524-2551; v1 merged — entities.ts L1677-1711]`

The v2 code base is **schema-only, 0 logic** (`models/learning.ts`, `study-planner.ts`, `pomodoro-service.ts`
all `wc -l = 0`), so this is a greenfield structural decision, not a migration of working code.

## 3. Decision

**3.1 Storage — table-per-type inheritance.**
- A thin base **`sessions`** table (owned by Sessions & Scheduling) holds the shared spine:
  `id · sub_type · purpose · scheduling_mode · planned_block_id? · started_at · ended_at · status ·
  focus_rating? · energy_level? · distraction_count? · key_learnings [E] · _sync_*`.
- Each sub-type has a **1:1 extension table** keyed by `session_id`, **owned by its domain module**
  (`reading_sessions`→Books, `class_sessions`→Education, `workout_sessions`→Health, `work_sessions`→Tasks,
  `study_sessions`/`focus_sessions`→Sessions & Scheduling, etc.).
- Cross-type reads (Journal, Calendar, analytics) hit the **base**; type-specific tooling joins the
  **extension**. The base provides the single stable `session_id` that effects, attachments, `pomodoro_sessions`,
  and `planned_blocks` all reference.

**3.2 The Integration Contract — 4 dimensions every type declares.**
1. **Attachment** — polymorphic links to OS entities (`session_attachments`, `entity_links`-style), at
   *type-level* ("this type is always attached to a habit") and *instance-level* ("this session is about Topic X").
2. **Effects (penetration)** — a declared, catalogued set of writes the framework fires on lifecycle events:
   `complete_habit_occurrence · log_time(task|project) · emit_measurement_signal · contribute_purpose_metric ·
   award_xp · surface_journal · surface_calendar · attach_pomodoro`. Effects go through each target module's
   documented write API — **never a direct table write**.
3. **Lifecycle** — the shared state machine `scheduled|planned → in_progress → completed | skipped | missed
   (attended only) | rescheduled`, with per-type legal transitions + hooks (review → fires SM-2; class →
   records attendance; workout → writes training volume).
4. **Permissions / constraints** — the guardrail: effects are scoped to attachments; no double-count (one XP
   / one habit-occurrence per event); user-created types get a **strict subset** of shipped-type capabilities;
   effects on sensitive modules (Finance/Health) require explicit opt-in consent. This is the guarded opt-in
   extension-model principle applied inside the module.

**3.3 Shipped types are fully configured.** Every *identified* sub-type ships with all 4 dimensions authored
by us; the user never sets up the main ones. Editing a shipped type is allowed but warned as
*not recommended*. User-extensibility exists for **new long-tail types**, not for wiring defaults.

**3.4 The base+extension sync rule.** Because the base row and its extension row are **separate encrypted
sync blobs** (ADR-003), they **travel together**: a device applies an extension only once its base is present;
a base without its extension renders as a valid but tool-less session (degraded, never an error). The writer
enqueues both atomically in the local `sync_queue`.

**What this decision does NOT do:** it does not specify the scheduling/placement algorithm (urgency scoring,
recalc-on-miss — a deferred design-pass, G5) and does not design the view layer (deferred, G9).

## 4. Options Considered

### Option A — Table-per-type (CHOSEN)
- **Rationale:** gives a uniform cross-type spine *and* per-module ownership of tooling; the single stable
  `session_id` the Integration Contract requires; no nullable sprawl; stays within the coupling budget.
- **Tradeoffs accepted:** a join for detailed reads; a two-row (base + extension) write; a sync-consistency
  rule the framework must uphold (§3.4).

### Option B — Single table + JSON `type_data` (REJECTED)
- **Why rejected:** either dozens of mostly-null columns or an opaque, un-indexable JSON bag; the table is
  centrally owned, so Health/Books can't own their session fields; it grows into a **god-table**, violating the
  no-god-table coupling budget (STANDARDS / core §6).

### Option C — Per-module tables + a union view, no physical base (REJECTED)
- **Why rejected:** the `session_id` space fragments — there is **no single FK target** for `pomodoro_sessions`,
  `planned_blocks`, or the Integration Contract's effects/attachments to point at. This is a hard blocker, not
  a preference. Given the Contract (§3.2), a physical base table is mandatory.

## 5. Consequences

**Easier:**
- One query powers the daily Journal, the Global Calendar's "study" layer, and all session analytics.
- New modules (Health, Skills) add a session type by registering a `SessionTypeDef` — no core change.
- User-created types are safe by construction (permission envelope).
- The plan↔actual link is restored cleanly: `planned_block` = intent, session = reality, joined by
  `planned_block_id` (`SS-8`).

**Harder:**
- Every detailed session read is a join; every write is two rows across two owners.
- The framework must enforce the sync-consistency rule (§3.4) and the permission checks on every effect.

**Explicitly accepted tradeoffs:**
- Join + dual-write cost, in exchange for uniform spine + module ownership + a stable session identity.
- A richer framework (registry + contract + lifecycle engine) instead of a simple table, because sessions are
  a foundation many modules depend on, not a single feature.

## 6. Review Date / trigger
Reconsider if: (a) the base+extension sync rule proves unworkable in practice (→ revisit Option B for
low-tooling types); (b) the effect catalogue outgrows a fixed enum (→ a plugin effect registry); or at the
**G5 placement-algorithm design-pass**, whichever comes first.
