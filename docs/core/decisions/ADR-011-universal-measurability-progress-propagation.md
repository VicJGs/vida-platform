# ADR-011: Model measurability as a universal contract — every pursuable entity exposes a normalized progress via a declared measurement kind, fed by bindings on the existing effect rail

**Status:** Accepted
**Date:** 2026-07-17
**Decision Makers:** Victor J.
**Context:** Vida Platform — surfaced by the **Purposes & Goals** capstone (exec #8, the meaning-spine that ladders up every module).
**Tags:** architecture · data model · cross-cutting · API
**Amends:** ADR-002 (Data Model) — adds a `measurement_kind` + `binding_mode` pair to **pursuable** entities across modules (Tasks · Habits · Routines · Projects/Deliverables · Dreams · Health · Finance measurables) and restores measurement fields (`is_higher_better` · `baseline_value` · `success_criteria` · `measurement_method`); adds the Purpose-domain tables (`values` · `contributions` · `purpose_reviews` · `plan_steps`). DDL tracked in ADR-002 **§5.20** (owed-tables ledger), no DDL into its body per D5.
**Inherits:** ADR-004 (Session Framework) — **§3.2.5** guarded-write + idempotency rail and the **§3.2.2** effects `emit_measurement_signal` / `contribute_purpose_metric` / `complete_habit_occurrence` (the *push* side of a binding rides these, not a new engine) · ADR-003 (LWW/HLC sync) · ADR-001 (SQLite/libsodium) · constitution **INT-1 / INT-1a / INT-2**, **SU-2**.

---

## 1. Summary

The OS is a **digital measurement layer over real life**: a paid expense, a logged workout, a defended thesis are the *real* achievements; the OS's job is to make them **tangible in the abstract realm** — measurable, trackable, roll-up-able. This ADR locks the contract that makes that uniform:

- Every **pursuable** entity exposes a normalized **`progress ∈ [0,1]`** via a declared **`measurement_kind`** — **SOLID** (`quantitative` · `milestone` · `rate`) or **ABSTRACT** (`qualitative`). Nothing pursuable is "unmeasurable": an abstract goal is **measured by judgment** (a rating scale / status ladder), not left untracked.
- Progress is **derived-by-default with a manual override** (the stored column is an override slot, `NULL = derive`), and rolls up **fractally** by one weighted rule — DOWN (parent ← children) and UP (contributor → target → purpose): `progress = Σ(child.progress × weight) / Σ weight`.
- A measurable declares a **`binding_mode`** — `manual` · `derived-pull` (read a *measurement-source* on demand) · `event-trigger` (set when a linked entity fires a state change). The **push** side reuses ADR-004 §3.2.5 effects; the **pull** side is a new **measurement-source READ seam**. Bindings form a **DAG** (acyclic, enforced at author time).
- The contract is **CORE, cross-cutting** — it is *not* a Purposes feature. **Purposes & Goals is its rollup apex and primary consumer**, not its owner; and the weighted **`contributions`** edge is **Purpose-domain machinery, not a third universal association primitive** (INT-1a owns the two: `entity_links` + `entity_tags`).

## 2. Context — what triggered this

Documenting the Purposes & Goals capstone forced the question the whole OS had dodged: **how does anything measure, and how does measured progress ladder up?**

- **v2 is schema-only, 0 logic:** `purposes.progress` and `targets.current_value` are **plain columns nothing computes**. `[FACT: ADR-002 §5.7 L1789-1857; grep clean of packages/core/src/services]`
- **No common scale:** a habit streak, a project %, a net-worth number, and a qualitative "feel more grounded" goal had **no shared representation** — so nothing heterogeneous could roll into a single goal.
- **No home for causal chains:** Victor's worked example — *Dream "England" → Task "Buy tickets" → bound to a programmed expense → paid → task auto-done → dream advances* — had no documented mechanism, even though ADR-004 already catalogues the effects it needs (`emit_measurement_signal`, `complete_habit_occurrence`). `[FACT: ADR-004 §3.2.2]`
- **v1 evidence of intent:** v1 targets carried `target_type {quantitative,qualitative,milestone,habit_based}`, metrics carried `is_higher_better`/`baseline_value`, and OR-001 was *"purpose progress = weighted average of linked target progress, live"* — all **nerfed to plain columns in v2**. `[FACT: intake/purposes-and-goals.md L44-71]`

Because the code is greenfield (schema-only), this is a **structural decision, not a migration**. And because the same `measurement_kind`/`binding_mode` pair must land on entities owned by **seven+ modules**, it must be decided **once, at core**, or each module will re-invent it incompatibly.

## 3. Decision

**3.1 `measurement_kind` — the solid/abstract discriminator (supersedes v1 `target_type`).**

| Kind | Class | Normalization to `[0,1]` |
|---|---|---|
| `quantitative` | SOLID | direction-aware `clamp((current − baseline) / (target − baseline))`, using restored `is_higher_better` + `baseline_value` |
| `milestone` | SOLID | `done ? 1 : 0`, or `n_done / n` for an n-of-m checklist |
| `rate` | SOLID | completion-rate / streak-vs-goal, read from Habits/Routines |
| `qualitative` | ABSTRACT | a self-rating on a fixed scale (`rating / scale_max`) **or** a status-ladder mapped to representative values |

A `qualitative` measurable with **no scale set** is **"unmeasured"** (an empty state), **never coerced to `0`** — so an un-rated goal cannot silently drag a purpose down.

`measurement_kind` (**how** a thing is measured) is **orthogonal to what feeds it** (a binding/contribution to a habit, project, etc.). v1's `habit_based` conflated the two; here it splits cleanly — a habit-driven goal is `measurement_kind = rate` **plus** a contribution/binding to that habit. `rate` therefore applies to **any** ratio/completion measure (Habits/Routines are the primary sources, but Finance savings-rate or Health recovery-rate may register `rate` sources too), not only habits.

**3.2 Derive-by-default + manual override.** A measurable computes its value from its kind and sources on read; the stored column (`purposes.progress`, `targets.current_value`, …) is an **override slot** — `NULL ⇒ derive`, a set value ⇒ the user's explicit override. This **requires amending** those columns, which today are `NOT NULL DEFAULT 0`, to **nullable** (owed schema below). `[FACT: ADR-002 §5.7 `purposes.progress INTEGER NOT NULL DEFAULT 0` L1804]` Analytics are **derived, never trusted as a stored counter** (the house rule). `[FACT: sessions SS-12 "analytics derived, never stored"; knowledge KN-9/10 "tune the curve, not the number"]`

**3.3 Fractal rollup — one weighted rule at every scale.** The same normalization runs DOWN a nesting (sub-tasks · deliverables · milestones → parent) and UP a ladder (contributor → target → purpose): `progress = Σ(child.progress × weight) / Σ weight`. Weights need not sum to 100 (normalized by `Σ weight`); a `NULL`/`0` weight ⇒ **equal-weight** (`1/n` across the set).

**Where the weight lives (the substrate this formula rests on):**
- **Laddering** (contributor → goal): the weight **is `contributions.contribution_percentage`** — the first-class weighted edge (Purpose-domain). Already decided; see the Purposes & Goals structure-data doc.
- **Nesting** (child → parent inside one module, e.g. sub-task → task): an **owed per-child weight column** on the child (default `NULL` ⇒ equal-weight), added per module → §5.20 stream ii. A module with no explicit weights rolls up **equal-weight**, which is the correct default for v1.
The formula is thus fully grounded for laddering *today* and defaults safely for nesting; the only owed piece is the optional per-child nesting weight.

**3.4 The `progress()` contract — cross-cutting, consumed-not-owned.** Every **pursuable** entity implements `progress(): [0,1]` + declares its `measurement_kind`. **Predicate (the decision rule, not just a list):** an entity is *pursuable* **iff its owning module intends it as a goal or cascadable work-unit** — i.e. it can meaningfully declare a `measurement_kind` and compute `progress()`. Illustrative set: targets · tasks (incl. sub-tasks) · habits · routines · projects · deliverables · dreams · knowledge objectives · health/finance measurables. The predicate governs edge cases the list can't: a **sub-task** is pursuable (a real work-unit); a **`plan_step`** is **not** (it's documentation — it never declares a kind); **reference data** (contacts, notes, plain links) is **not**. Purposes & Goals **consumes** the contract to roll up; it does **not** own it — the owner is this ADR, at core level.

**3.5 `binding_mode` — how a measurable is fed (auto-metric ≡ auto-completion).** A measurable declares one of:
- `manual` — the user sets it.
- `derived-pull` — computed from a **measurement-source** (§3.6) on read.
- `event-trigger` — set when a linked entity fires a state change; the write is an **ADR-004 §3.2.2 effect** (`emit_measurement_signal` / `contribute_purpose_metric` / `complete_habit_occurrence`) on the **§3.2.5 rail** — idempotent per a deterministic `effect_event_id`, single write path, **no new engine**.

`binding_mode` (how a measurable is fed) is **distinct from** a value's provenance **`source`** `{manual, auto}` (where a recorded value came from) — the two never collide, and `source` stays compatible with Health's existing provenance axis. `[FACT: ADR-004 §3.2.2/§3.2.5; health metric-value `source`]`

**3.6 The measurement-source READ seam (the one genuinely new mechanism).** A module may **advertise a queryable measure** (`net_worth` ← Finance, `streak(habit)` ← Habits, `body_weight` ← Health, `progress(project)` ← Projects); a `derived-pull` measurable reads it through this seam. It is a **read contract** — advertise + query, **no direct table access** — so it honors **INT-1** exactly as `summary(date)`/`dueIn(range)` do on the write/agenda side. A source outage yields **last-known + a flag**, never a fabricated or stale-as-fresh value.

**3.7 Bindings are acyclic (DAG).** A binding where A auto-advances B while B feeds A is **rejected at author time** with a typed error; an edit that would introduce a cycle is likewise rejected. **Both** binding edge-types count in the graph — a `derived-pull` A→B and an `event-trigger` B→A together form a cycle. The §3.2.5 rail's idempotency stops runaway *replay*; this guard stops a *semantic* cycle the idempotency key would not catch. **Enforcement:** cycle detection is owned by the **core measurement service** (the same layer that owns the `progress()` contract and the measurement-source registry); the traversal algorithm + performance envelope (cached adjacency vs. on-write DFS) are a **build-phase** decision — named here, not designed here.

**3.8 Ownership boundaries (what this ADR does and does NOT claim).**
- **Owns:** the measurement contract (`measurement_kind` · normalization · fractal rollup · `progress()` · `binding_mode` · the measurement-source read seam · the DAG guard).
- **Does NOT own the write rail** — that is ADR-004 §3.2.5, inherited by reference (no re-assertion).
- **`contributions` is Purpose-domain**, not a universal primitive: the two universal association primitives (`entity_links` reference, `entity_tags` grouping) are owned by the **Spaces tier** (**INT-1a**); a weighted goal-edge is domain machinery that renders in the neural graph but is not a Spaces primitive.
- **Progress is not stored-and-propagated** — it is derived-on-read; "what changed" deltas come from **Journals** snapshots (JR-7/8), not a propagation table.

**What this decision does NOT do:** it does not pick the per-kind normalization internals (e.g. non-linear quantitative curves), the qualitative status-ladder→value mapping UI, the `derive()` hash, or the measurement-source registry runtime — those are **build-phase**. It locks the **contract + invariants**, not the runtime. Multi-condition / user-authored automation ("done when paid **AND** date > X") is **⚠ INTENDED-later** (a Spaces/capability-Blocks expansion), out of scope here.

## 4. Options Considered

### Option A — A universal normalized `progress()` contract + `binding_mode` on the existing rail (CHOSEN)
- **Rationale:** one representation (`[0,1]` + `measurement_kind`) lets *any* heterogeneous thing roll into *any* goal by one weighted rule; the push side reuses ADR-004 effects (no new engine); the only new mechanism is a read seam that **follows the registry pattern of** the proven `dueIn`/`summary` seams (a distinct discovery+query contract, not the same one).
- **Tradeoffs accepted:** a cross-module amendment (the `measurement_kind`/`binding_mode` pair lands on 7+ modules); every module must implement `progress()`; a new read-seam registry to build.

### Option B — Per-module bespoke progress; Purpose reads each module differently (REJECTED)
- **Why rejected:** no common scale ⇒ Purpose needs **N adapters**, the fractal rollup is impossible, and a qualitative goal has nowhere to live. It reproduces exactly the v2 fragmentation that made progress uncomputable.

### Option C — Store progress denormalized and propagate on every write (REJECTED)
- **Why rejected:** stored propagation is the **double-count + staleness** trap; it violates the derive-not-store house rule (SS-12) and requires a bespoke propagation engine and cache-invalidation graph. Derived-on-read + Journals-snapshot deltas gets the same result with none of the machinery.

### Option D — Elevate measurability + `contributions` to a Spaces-tier universal primitive (REJECTED)
- **Why rejected:** measurability is a **value contract**, not an *association* primitive; `contributions` is a *weighted goal-edge*, semantically Purpose-domain. Forcing them into the Spaces tier **reopens the settled ADR-006** (which fixed the universal primitives at exactly two) for no gain. Domain-ownership is the right altitude.

## 5. Consequences

**Easier:**
- Any entity ladders into any goal by one rule; a new pursuable module implements `progress()` and it "just works."
- Victor's causal chain (expense → task → dream → purpose) needs **no new code path** — it's an ADR-004 effect + a derived read.
- Qualitative goals are first-class and measurable; nothing is silently un-tracked.
- Progress is always live and cheap (derived reads); deltas reuse Journals.

**Harder:**
- A genuinely cross-cutting amendment: seven+ module structure-data docs owe a `measurement_kind`/`binding_mode` `[INTENT]` note (→ §5.20 stream ii); each must implement `progress()`.
- A new measurement-source registry to design and a DAG guard to enforce at author time.

**Explicitly accepted tradeoffs:**
- One core contract that touches many schemas, in exchange for a single coherent progress model instead of N incompatible ones.
- A richer read seam (advertise + query) rather than direct reads, to keep INT-1 intact.

**Owed schema** (build-phase — tracked in ADR-002 **§5.20**, no DDL into its body per D5):
- **Nullable override slots:** `purposes.progress` + `targets.current_value` (and any pursuable's stored progress) → **nullable** (`NULL = derive`); today `NOT NULL DEFAULT 0`. `[FACT: ADR-002 L1804]`
- **Cross-module (stream ii):** a `measurement_kind` + `binding_mode` pair on pursuable entities in Tasks · Habits · Routines · Projects/Deliverables · Dreams · Health · Finance; restore `is_higher_better` + `baseline_value` (metrics) and `success_criteria` + `measurement_method` (targets); an **optional per-child nesting-weight** column where a module wants non-equal child weighting (default equal-weight, §3.3).
- **Purpose-domain:** `values` · `contributions` (polymorphic, weighted) · `purpose_reviews` (restored) · `plan_steps` (doc layer); relax `targets.purpose_id` → nullable (SR-003); provenance `source` `{manual,auto}` on metric-values; retire `purpose_habits/routines/projects` → `contributions`.

## 6. Review Date / trigger
Reconsider if: (a) a real pursuable entity cannot be expressed by the four `measurement_kind` values (→ extend the enum, or a plugin kind); (b) the measurement-source read seam proves too chatty at render (→ a cached measurement snapshot, paralleling Journals); or (c) multi-condition user-authored bindings graduate from ⚠ INTENDED to shipped (→ a dedicated automation-rule ADR, on the ADR-010 capability-authoring rail). Otherwise revisit at the build-phase measurability design-pass.
