<!-- Business Rules — features/purposes-and-goals · /documentation Phase 2 · sources: ADR-002 §5.7 L1789-1953 · project.ts L109-256 · docs/intake/purposes-and-goals.md RESOLUTION · ADR-004 §3.2.5 · core/business-rules INT-1a/INT-2/PC-2 -->

# Business Rules — Purposes & Goals  (level: Feature — CAPSTONE / higher-order)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, SU-1/2, INT-1, **INT-2**,
> PC-2, DATA-3/4. Every rule below complies. **Altitude note:** the v2 surface is 6 tables + 3 bare junctions,
> schema-only, **0 service logic** — nothing computes progress today. The measurability / binding / contribution
> model below is the intended reframe; live-vs-INTENDED is flagged per rule and consolidated in the ⚠ Flagged delta.
> This context is the **meaning-spine** of the OS: optional-but-omnipresent, it reads UP from every module.

## Invariants (what is ALWAYS / NEVER true)

- **PG-1 — Encrypted content.** `[E]` (client-side, ZK-1): `values.*name/description`, `purposes.title/description/
  vision/why`, `targets.title/description/unit`, `purpose_metrics.name/description/unit`, `target_reviews.reflection/
  next_actions`, `purpose_reviews.*` free-text, `contributions.contribution_notes`, `dreams.title/description/
  estimated_cost`. Plaintext = config/enums/dates/numeric-measures/FKs. `[FACT: ADR-002 §5.7 [E]; project.ts]`
- **PG-2 — Optional-but-omnipresent (the meaning-spine).** NOTHING in the OS requires a purpose; EVERYTHING may
  ladder into one, and the OS surfaces that laddering everywhere. Purposes is the **directional/meaning plane**
  (where is my life going / does my work ladder up) — a distinct axis from Journals' **operational plane** (what
  happened / what's due). Same provider seam, orthogonal axis → never merged. `[INTENT PG1]`
- **PG-3 — Universal measurability (nothing is unmeasurable).** Every *pursuable* entity exposes a normalized
  **`progress ∈ [0,1]`** via a declared **`measurement_kind`**: SOLID = `quantitative` (current/target/`unit`,
  direction via `is_higher_better`+`baseline_value`) · `milestone`/`checklist` (n-of-m) · `rate`/`streak` (Habits/
  Routines); ABSTRACT = `qualitative` (a self-rating scale, or a status-ladder mapped to representative values). An
  abstract goal is **measured by judgment**, never left un-tracked. Reference data (contacts, notes) is NOT pursuable
  and contributes no progress. **Cross-cutting:** `measurement_kind` + `binding_mode` + the `progress()` contract are
  owned by the capstone ADR at **CORE level** and land on every pursuable module (Tasks · Habits · Routines · Projects ·
  Dreams · Health · Finance measurables), *consumed* here — Purpose is the rollup apex, not the owner. Each such module
  owes an `[INTENT]` amendment (→ ADR-002 §5.20 stream ii). `[INTENT PG2]`
- **PG-4 — Derive-by-default + manual override.** A measurable computes its value from its kind/sources by default;
  the stored column is an **override slot** (NULL = derive), à la Knowledge "tune the curve, not the number." The v2
  `purposes.progress` / `targets.current_value` plain columns become override slots — they are NOT the source of
  truth. `[INTENT PG2; FACT precedent: knowledge KN-9/10, sessions SS-12]`
- **PG-5 — Fractal rollup (same math at every scale).** Progress rolls DOWN (parent ← children: sub-tasks ·
  deliverables · milestones) and UP (contributor → target → purpose) by the **same weighted normalization**:
  `progress = Σ(child.progress × weight) / Σ weight`. Heterogeneous kinds compose into one goal (workout streak +
  body-weight metric + a milestone → one goal). `[INTENT PG2/PG7]`
- **PG-6 — Binding-mode primitive (auto-metric ≡ auto-completion).** A measurable value declares a **`binding_mode`**:
  `manual` · `derived-pull` (compute from a linked entity/provider on read) · `event-trigger` (set when a linked
  entity fires a state-change event). Auto-sourced metrics (net-worth ← Finance) and auto-completing tasks
  (expense `paid` → task `done`) are the **same** primitive. NB: `binding_mode` (how a measurable is fed) is distinct
  from a value's provenance **`source`** {manual,auto} (PG-15) — Health already uses a provenance `source`, so the two
  never collide. `[INTENT PG2/PG6]`
- **PG-7 — Bindings ride the existing effect rail; NO new automation engine.** Every `event-trigger` **write** goes
  through the owning module's single service method, idempotent per a deterministic `effect_event_id`
  (INT-2 / ADR-004 §3.2.5). ("No new engine" is the **write** side — `derived-pull` READS use the measurement-source
  query seam, PG-15, which INT-1 already permits; the two never form a bus.) Writes are **sparse**; progress rollups
  are **derived-on-read**; "what changed" deltas come from **Journals** snapshots — no stored propagation, no bespoke
  event bus. `[INTENT; FACT: core INT-2; ADR-004 §3.2.5; journals JR-7/8]`
- **PG-8 — Bindings are ACYCLIC (DAG).** A binding graph where A auto-advances B while B feeds A is rejected. The
  rail's idempotency stops infinite loops; a semantic-cycle guard rejects the binding at author time with a typed
  error. `[INTENT PG2]`
- **PG-9 — Spine = Values → Purposes → Targets, every joint OPTIONAL.** Values (core beliefs) sit above Purposes,
  Purposes above Targets; Dreams sit BESIDE (aspirational). Each reference UP is **nullable** — standalone Values,
  Purposes, Targets, and Dreams are all first-class. **SR-003 RELAXED:** a Target no longer requires a Purpose
  (`targets.purpose_id` becomes nullable). `[INTENT PG4/PG9; SUPERSEDES v1 SR-003]`
- **PG-10 — Contribution = FIRST-CLASS weighted edge (a Purpose-DOMAIN mechanism, NOT a universal primitive).**
  Laddering-with-weight lives in a first-class polymorphic **`contributions`** entity `{ goal(purpose|target),
  contributor(entity_type/entity_id), contribution_percentage, contribution_notes[E] }` — NOT on a junction (weight is
  payload, and the junction **bare-pairs pattern** carries none — ADR-002 §4.3 L485). **Ownership boundary (INT-1a):**
  the two *universal* association primitives — `entity_links` (reference) + `entity_tags` (grouping) — are owned by the
  **Spaces tier**; `contributions` is **Purpose-domain machinery** for weighted goal-laddering, *not* a third universal
  primitive. It renders in the neural graph but is not a Spaces primitive. Retires the bare `purpose_habits/routines/
  projects` junctions. Contributor set: habits · routines · projects · tasks · dreams · finance-targets · check-ins.
  `[INTENT PG7; FACT: ADR-002 §4.3 L485 junction pattern; core INT-1a; PC-2]`
- **PG-11 — Goal decomposes into ACTION via the generic universe; plan_steps DOCUMENT, sub-tasks TRACK.** A goal
  decomposes through first-class **Tasks** (nested via `parent_task_id`) + **Projects › Milestones › Deliverables** —
  all causally bindable (PG-6). **`plan_steps`** are a lightweight, ordered, checkable **documentation** layer on a
  Task/Target (the path to the deliverable; a step may note a "lesser deliverable" = a NOTE, not the first-class
  Deliverable entity). **Graduation rule:** a step needing real tracking/measurability/laddering becomes a sub-task.
  No parallel task registry. `[INTENT PG5; FACT: F2/D2 no-parallel-registry; ADR-002 §5.3 TK-2]`
- **PG-12 — Two review shapes, distinct.** `target_reviews` (per-target: progress_rating 1-10 · reflection ·
  next_actions) and the RESTORED `purpose_reviews` (alignment/fulfillment loop: still_aligned · overall_progress ·
  key_achievements · obstacles_faced · adjustments_needed · renewed_commitment · fulfillment_rating · clarity_rating)
  are genuinely different content — not merged. A generic review substrate (with Knowledge/Check-ins) is an ADR
  candidate, **not forced here**. `[INTENT PG3; FACT: v2 dropped purpose_reviews; project.ts]`
- **PG-13 — Reviews fire as `review` SESSIONS, not a bespoke reminder.** A due purpose/target review is a `review`
  session (ADR-004 sub-type) surfaced via **`dueIn()`** → Global Calendar + Journal agenda + Notifications. Distinct
  in CONTENT from Check-ins reviews (which READ purpose progress, CK-6) but on the **same scheduling seam**.
  `[INTENT PG9; FACT: ADR-004 SS-1; sessions/contract.md; check-ins CK-6]`
- **PG-14 — Provider registration (strategic plane → operational plane).** Purposes **registers as a provider**:
  `summary(date)` (goals/targets/reviews-due + progress deltas → Journal daily dashboard) and `dueIn(range)` (review
  due-dates → Calendar/agenda). Aggregator pattern — Journals/Calendar iterate the registry; no module names Purpose,
  Purpose names no consumer. `[INTENT PG10; FACT: journals JR-3; sessions dueIn]`
- **PG-15 — Metrics may AUTO-SOURCE via a measurement-source READ seam.** A `quantitative` metric with
  `binding_mode=derived-pull` reads its value from a module that **advertises a queryable measure** (net-worth ←
  Finance, streak ← Habits, body-weight ← Health) — a query contract, INT-1-respecting (no direct table reads), NOT a
  new write engine (cf. PG-7). A metric_value keeps a provenance **`source`** {manual,auto} (matches Health's
  provenance axis). Restores `is_higher_better` + `baseline_value` (progress direction). `[INTENT PG6; FACT: INT-1;
  v2 dropped both]`
- **PG-16 — Dreams = the single aspiration entity.** `bucket_list_items` COLLAPSES into `dreams` (dreams absorbs
  `status`/`progress`/`target_date`/`completed_date`/`priority`/`steps`|`project_id`/imagery/`location`). "Bucket
  List" is **a Space over dreams** (a `#before-i-die` tag + Gallery vision-board view), not a module. `[FACT: PG8
  RESOLVED 2026-07-15; ADR-002 bucket_list_items L3319 → dreams L1931]`
- **PG-17 — Analytics derived, no denormalized counters.** Progress, contribution rollups, alignment trends
  recompute deterministically from current state + the reviews/metric-values ledgers. No cached progress/streak
  columns are trusted as truth (PG-4 override slots excepted, and only when explicitly set). `[INTENT PG2; FACT:
  sessions SS-12]`
- **PG-18 — Notes via `pages`, tags via Spaces, graph via `entity_links`.** Value/Purpose/Target/Dream get
  standalone pages (`entity_type` reserved for `purpose`/`target`/`purpose_metric_value`; Value/Dream = ⚠ INTENDED
  additions), scoped tags via the Spaces universal vocabulary, and appear in the neural graph. No inline `notes`
  columns (DATA-3). `[FACT: ADR-002 L1363-1372; note.ts L44-46; PG_notes]`
- **PG-19 — Deletion respects optionality; soft delete preserves the ledger.** With SR-003 relaxed, deleting a
  Purpose **SET NULLs** its Targets' `purpose_id` (they survive standalone) rather than cascade-deleting them;
  `contributions`, `target_reviews`, `purpose_reviews`, `purpose_metric_values` cascade with their owner. Soft delete
  (`deleted_at`) hides while preserving history. `[INTERP PG-9; FACT: soft-delete convention]`
- **PG-20 — Local-first.** Every create/edit/measure/review/bind succeeds locally first; multi-device reconciles LWW
  (HLC, ADR-003) on structured columns; ledgers merge by natural key. `[FACT: LF-2; ADR-003]`

## Validation & edge cases
- Enum CHECKs (v2 floor): `purposes.domain`∈LifeDomain(8: health·career·finance·relationships·personal_growth·
  spiritual·recreation·environment); `*.status`(5); `targets.target_type`∈{quantitative,qualitative,milestone,
  habit_based} (⚠ becomes `measurement_kind`); `*.priority`(5); `review_frequency`(6); `calculation_method`∈{sum,
  average,latest,max,min,count}. `[FACT: ADR-002 §5.7]`
- A `qualitative` measurable is **never silently coerced to a number** — it carries its scale/ladder mapping
  explicitly; if unset, progress is "unmeasured" (empty state), not `0`. `[INTERP PG-3]`
- A `derived-pull` whose source is unavailable shows **last-known + a flag**, never a silent `0`/stale-as-fresh.
  `[INTERP PG-6]`
- `contribution_percentage` need not sum to 100 across a goal's contributors; the rollup **normalizes by Σweight**
  (PG-5). A goal with contributors but all weight 0 → treated as equal-weight. `[INTERP PG-5/PG-10]`
- A binding that would introduce a cycle (PG-8) is rejected at author time; an existing chain that becomes cyclic
  via edit is likewise rejected. `[INTENT PG-8]`
- Deleting a contributor entity removes its `contributions` rows (CASCADE) → the goal's rollup re-derives lower.
  `[INTERP PG-10/PG-17]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Purpose/Goal standalone page (rollup) | skeleton | "no goals yet — set one" | typed read error, retry | vision/why + derived progress + contributors + reviews |
| Compute progress (derived rollup) | computing | "unmeasured" (no kind/sources) | source read error → show partial + flag | normalized % across heterogeneous kinds |
| Create/edit a bound source (binding) | — | — | cycle (PG-8) or invalid ref → typed error, no save | binding saved; measurable now auto-updates |
| Auto-completion event (e.g. expense→task) | — | — | effect fails → measurable unchanged + flagged | idempotent write once; rollup re-derives up the ladder |
| Contribution (weighted edge) | — | "nothing ladders here yet" | invalid contributor → typed error | contributor added w/ weight; rollup reflects it |
| Review (purpose/target) due + conduct | skeleton | "none due" | save error → draft retained, retry | review saved; next_review scheduled as a `review` session |
| Provider (summary / dueIn) | — | no items in range | provider error → flagged, others unaffected | goals/reviews surfaced on Journal + Calendar |
| Values layer | skeleton | "no values defined" | typed error, retry | values shown with the purposes laddering to each |
| Dream / vision-board (Space) | skeleton | "no dreams yet" | typed error, retry | Gallery of dreams w/ imagery + derived progress |

## Failure behavior (fail loud — constitution §5)
- A binding write (PG-6/PG-7) that fails leaves the measurable **unchanged** and **flags** the failure — never a
  silent partial update. The idempotent `effect_event_id` guarantees no double-apply on retry/multi-device. `[FACT:
  INT-2]`
- A cyclic binding (PG-8) is **rejected with a typed error**, never silently broken to absorb the cycle.
- A failed contribution rollup or provider emit leaves the goal/review **succeeding locally** and flags the
  derivation — never drops it silently (aggregator resilience). `[INTENT PG-14]`
- A `derived-pull` source outage surfaces **last-known + flag** (PG-6 edge), never fabricates a value.
- A `qualitative` measure with no scale is shown **"unmeasured"**, never a fake `0%` (PG-3).

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
INTENDED, not in ADR-002 §5.7 / `project.ts` today (→ consolidate into the **ADR-002 amendment (§5.20 ledger)** +
the capstone ADR): **PG-2/PG-9** `values` table + the optional-joint nullability (SR-003 relax on `targets.
purpose_id`); **PG-3/PG-4/PG-15** `measurement_kind` (supersedes `target_type`) + normalized-progress derivation +
`is_higher_better`/`baseline_value` restore **(cross-cutting — lands on Tasks/Habits/Routines/Projects/Dreams/Health/
Finance too, → §5.20 stream ii)**; **PG-6/PG-7** `binding_mode` descriptor + measurement-source READ seam
(writes on the INT-2 rail); **PG-10** first-class `contributions` — Purpose-domain edge, not a Spaces primitive
(retires `purpose_habits/routines/projects`); **PG-11**
`plan_steps` doc layer + `success_criteria`/`measurement_method` restore on targets; **PG-12** `purpose_reviews`
restored; **PG-13** review-session wiring; **PG-14** provider registration; **PG-16** `dreams` widened +
`bucket_list_items` retired. **Live today (FACT floor):** the 6 tables + 3 bare junctions schema, `[E]` marks
(PG-1), the `pages` entity_type reservation (PG-18) — and **no progress logic of any kind**. `[FACT: ADR-002 §5.7;
grep clean of packages/core/src/services]`

## Completion checklist
- [x] invariants with [FACT/INTENT/INTERP] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution (incl. INT-2) · [x] spec/code drift flagged · [x] capstone measurability contract stated
