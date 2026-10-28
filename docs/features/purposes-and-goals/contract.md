<!-- Contract — features/purposes-and-goals · /documentation Phase 2 · sources: ADR-002 §5.7 · project.ts · ADR-004 (review sub-type + §3.2.5) · journals/contract.md · docs/intake/purposes-and-goals.md RESOLUTION -->

# Contract — Purposes & Goals (level: Feature — CAPSTONE)

> ⚠ The surface below is **INTENDED** (the capstone reframe); the v2 code is schema-only (6 tables + 3 junctions, 0
> service logic). Purpose is an **aggregator/consumer** — it implements the core measurability contract for its own
> entities and **reads** others' via documented seams; it re-implements nothing. Terminal states per capability are
> enumerated in `[[business-rules]]`.

## Exposed surface — `PurposeService`

- **Value / Purpose / Target CRUD** — `createValue/Purpose/Target(def) · update · archive`. A target declares
  `measurement_kind` {quantitative,milestone,rate,qualitative} + (optional) `binding_mode`. All spine refs UP are
  nullable (PG-9). `[INTENT PG4/PG9]`
- **`computeProgress(purpose|target): 0..1`** — the derived rollup: `Σ(contributor.progress × weight) / Σ weight`,
  reading each contributor's own `progress()` (never a copied value). Manual override slot honored when set (PG-4).
  `[INTENT PG2/PG5/PG17]`
- **`progress(entity): 0..1`** — this context's implementation of the **core measurability contract** for
  Value/Purpose/Target/Dream. Other modules implement their own; Purpose only consumes. `[INTENT PG3]`
- **`bind(measurable, { binding_mode, ref })`** — declare a `derived-pull` (read a measurement-source) or
  `event-trigger` (fire on a linked entity's state change). Rejects a binding that would create a cycle (PG-8).
  `[INTENT PG6/PG8]`
- **Contribution edge** — `link(goal, contributor, { weight, notes }) · unlink · reweight` over the first-class
  `contributions` table (Purpose-domain edge, not a Spaces primitive). `[INTENT PG7/PG10]`
- **Reviews** — `openTargetReview / openPurposeReview(…)`; a due review is scheduled as a **`review` session**
  (`SessionRegistry.createSession`, ADR-004) and surfaced via `dueIn()`. `[INTENT PG3/PG9/PG12; FACT: ADR-004 SS-1]`
- **Provider registration** — `summary(date)` (goals/targets/reviews-due + progress deltas → Journal dashboard) +
  `dueIn(range)` (review due-dates → Global Calendar + agenda). Registry pattern — no module named. `[INTENT PG14;
FACT: journals JR-3]`

## What it consumes (documented integration points — no direct table access, constitution §6)

- **Sessions & Scheduling (ADR-004)** — the `review` sub-type + `SessionRegistry.createSession` + `dueIn`/Scheduler;
  the `INT-2` effect rail (`effect_event_id`, §3.2.5) that `event-trigger` bindings write through. **Purpose owns no
  scheduler, no session engine, no event bus.** `[FACT: ADR-004 §3.2.5; SS-1]`
- **Measurement-source seam (READ)** — Finance (net-worth, a Commitment's `paid`), Habits (streak), Health
  (body-weight), Projects (milestone %) advertise **queryable measures** for `derived-pull`; INT-1-respecting.
  `[INTENT PG6/PG15; FACT: INT-1]`
- **Tasks / Projects** — goal decomposition (link tasks/sub-tasks + projects/milestones/deliverables), all causally
  bindable. `[INTENT PG5; FACT: ADR-002 §5.3 TK-2]`
- **Journals** — registers `summary(date)`; progress deltas read from Journal snapshots (JR-7/8). `[FACT: journals docs]`
- **Spaces** — universal tags scoping purposes/goals; the **Bucket List Space** over `dreams` (Gallery/vision-board
  view). `[FACT: ADR-006/007; PG8]`
- **Notes & Pages** — standalone notes via `pages` + `entity_links`. Reserved TODAY: `entity_type` ∈
  purpose/target/purpose_metric_value; **`value`/`dream` are ⚠ INTENDED additions** (PG-18). `[FACT: ADR-002
L1363-1372; note.ts L44-46]`
- **Notifications** — a review-due `dueIn` item fires a notification. `[INTENT PG9]`
- **Depended-on-by:** Journals (Review lens vs goals/dreams/purposes, JR-9) · Check-ins (weekly/monthly/yearly reviews
  READ purpose progress, CK-6) · Gamification (completion → XP). `[FACT: journals JR-9; check-ins CK-6]`

## Contract error cases (typed)

- `CyclicBinding` — a `bind` that would make the binding graph cyclic → rejected, no save (PG-8).
- `InvalidContributor` — a contribution to a non-pursuable/unknown entity → rejected (PG-10).
- `UnmeasuredQualitative` — a `qualitative` measurable with no scale/ladder → shown "unmeasured", never `0%` (PG-3).
- `SourceUnavailable` — a `derived-pull` source outage → last-known value + flag, never a fabricated/stale-as-fresh
  number (PG-6).
- `EffectApplyFailed` — an `event-trigger` write fails → measurable unchanged + flagged; idempotent `effect_event_id`
  guarantees no double-apply on retry (PG-7).
- `ProviderEmitFailed` — `summary`/`dueIn` failure is isolated; other providers + the goal itself are unaffected (PG-14).

## Completion checklist

- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim · [x] core-contract consumed-not-owned
