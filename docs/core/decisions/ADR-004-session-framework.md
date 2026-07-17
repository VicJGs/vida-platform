# ADR-004: Model sessions as a table-per-type supertype governed by a 4-dimension Integration Contract

**Status:** Accepted
**Date:** 2026-07-12
**Decision Makers:** Victor J.
**Context:** Vida Platform — Sessions & Scheduling (foundation module, extracted + promoted from Learning "Study Sessions & Planner")
**Tags:** architecture · data model · API
**Amends:** ADR-002 (Data Model) — adds the `sessions` spine + per-sub-type extension tables + `planned_blocks` + Integration-Contract tables; supersedes the flat Learning-only `study_sessions` and the §5.11 mirror planner. **+ (F1/D1, 2026-07-16)** adds the local-only `applied_effects` dedup ledger + `effect_event_id` columns (owed-tables ledger).
**Inherits:** ADR-001 (SQLite/libsodium) · ADR-003 (LWW sync) · the surfaced extension-model principle (guarded opt-in integrations).
**Amended:** 2026-07-16 (F1/D1) — added **§3.2.5** (the write-API contract + idempotency mechanism), making this ADR the **owner** of the guarded-write + no-double-count discipline that ADR-008/010 previously delegated in a loop. Constitution anchor: **INT-2**. Mechanism per the critique gate `docs/reviews/2026-07-15-adr-critique-gate.md` F1/D1.

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

**§3.2.1 Attachment** — polymorphic links to OS entities (`session_attachments`, `entity_links`-style), at
*type-level* ("this type is always attached to a habit") and *instance-level* ("this session is about Topic X").

**§3.2.2 Effects (penetration)** — a declared, catalogued set of writes the framework fires on lifecycle events:
`complete_habit_occurrence · log_time(task|project) · emit_measurement_signal · contribute_purpose_metric ·
award_xp · surface_journal · surface_calendar · attach_pomodoro`. Effects go through each target module's
documented write API — **never a direct table write** (that API is specified in **§3.2.5**).

**§3.2.3 Lifecycle** — the shared state machine `scheduled|planned → in_progress → completed | skipped | missed
(attended only) | rescheduled`, with per-type legal transitions + hooks (review → fires SM-2; class →
records attendance; workout → writes training volume).

**§3.2.4 Permissions / constraints** — the guardrail: effects are scoped to attachments; **no double-count**
(one XP / one habit-occurrence per event — the *mechanism* is **§3.2.5**); user-created types get a **strict
subset** of shipped-type capabilities; effects on sensitive modules (Finance/Health) require explicit opt-in
consent. This is the guarded opt-in extension-model principle applied inside the module.

**§3.2.5 The write-API contract + idempotency — how §3.2.2 (Effects) and §3.2.4 (no-double-count) are actually
enforced.** *This subsection is the single **owner** of the guarded-write + idempotency mechanism; ADR-008 and
ADR-010 inherit it **by reference** rather than re-asserting it. Constitution: **INT-2**.*

*Effect taxonomy — not every effect writes; the machinery applies per class:*

| Class | Effect types | Idempotency |
|---|---|---|
| **Keyed write** | `complete_habit_occurrence · contribute_purpose_metric · emit_measurement_signal` | deterministic `effect_event_id` + ledger (replay) + a UNIQUE **domain** key **and** a UNIQUE `effect_event_id` on the output row (cross-device) |
| **Additive write** | `award_xp · log_time` | deterministic `effect_event_id` + ledger (replay) + UNIQUE `effect_event_id` on the output row — its **only** convergence key (no domain natural key exists) |
| **Projection** | `surface_journal · surface_calendar` | **writes no row** — Journal/Calendar are *pull-aggregated at render*; idempotent **by construction**; no id, no ledger |
| **Intra-realm** | `attach_pomodoro` | same handler path — **no direct-write exemption for same-owner**; deterministic id from the timer/session |

**A — The write-API contract ("documented write API" made concrete).**
1. Each effect-receiving module exposes named **effect handlers** — service methods in `packages/core/services/<module>`
   (e.g. `gamification.awardXp`, `habits.completeOccurrence`, `finance.emitMeasurement`). **This set *is* the module's
   documented write API for effects.**
2. A **routing registry** maps each declared effect-type (§3.2.2) → exactly one handler. "Documented" = present in the
   registry; an effect with no handler **fails closed** (never a silent drop).
3. Each handler **validates** caller scope/binding, the permission envelope (§3.2.4 consent), and payload before any
   write; failure ⇒ a hard rejection with **no partial write**.
4. **Single write path:** these handlers are the **only** cross-boundary writers of the module's tables — no session,
   capability, or other module issues a direct cross-module table write.

**B — Idempotency ("no double-count" made mechanical) — two layers on one deterministic key.**
1. **`effect_event_id` is DETERMINISTIC** — derived from the semantic event's stable identity,
   `derive(subject_natural_key ‖ transition ‖ effect_type)` (e.g. `derive(habit_id ‖ date ‖ "award_xp")`). Two devices
   originating the *same* outcome compute the *same* id; a retry recomputes the same id. It is **persisted as a UNIQUE
   column on each output row**. *(A random id would make every re-origination look distinct — the multi-device
   double-count hole. Determinism is load-bearing.)*
2. **Replay (same device)** — a device-local **`applied_effects`** ledger keyed `(effect_event_id, effect_type,
   target_ref)`; the handler **checks-and-inserts in the same transaction as the write**; a conflict ⇒ **no-op**.
   Defends offline-flush retry, crash-then-rerun, double-dispatch. Content-keyed ⇒ **robust under clock skew**
   (independent of the LWW clock). **This subsection closes same-device double-count unconditionally.**
3. **Cross-device** — because the id is deterministic and rides the output row as a UNIQUE column, two devices'
   independent applications **collide on sync and converge to one**. The collision-**merge** is owned by the **sync
   layer** (ADR-003 conflict handling); §3.2.5 supplies the deterministic key + UNIQUE requirement that make
   convergence *possible*. **Honest bound: same-device double-count is closed here; cross-device convergence is
   enforced by sync — not claimed as a free guarantee.**
4. The `applied_effects` ledger is **device-local** (not synced, like `sync_queue`): it defends *replay*; *cross-device*
   convergence rides the synced output rows' UNIQUE `effect_event_id`, not a synced ledger.

**C — No trust exemption.** The contract (A+B) binds **all** effect producers — session Effects, shipped capabilities
(ADR-008), user-authored capabilities (ADR-010) — **identically**. Only *enforcement* differs by trust tier: user code
**physically cannot** bypass (the ADR-010 sandbox gives no ambient DB access — its only channel is the mediated API →
these handlers); shipped code is bound by the same single-write-path invariant, enforced **structurally** (the handlers
are the only exported cross-module write surface) + code review + a build-time **CI guard** that fails if a module
writes another module's tables directly. There is **no honor-system tier** for the contract.

**Owed schema** (build-phase — tracked in ADR-002's durable owed-tables ledger **§5.20**, no DDL into its stale body per D5):
`applied_effects` (local-only); a deterministic `effect_event_id` on effect-triggering rows; a UNIQUE `effect_event_id`
on each effect **output** row; domain natural keys where they exist.

**What §3.2.5 does NOT do:** it does not pick the `derive()` hash, the CI-guard implementation, or the sync
collision-merge algorithm (build-phase / F10) — it locks the **contract + invariants**, not the runtime.

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
