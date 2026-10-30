<!-- Conventions — features/purposes-and-goals · /documentation Phase 2 · sources: ADR-002 §5.7 · project.ts · CLAUDE.md Conventions -->

# Conventions — Purposes & Goals (level: Feature — CAPSTONE)

## How to build here

- **Derive, don't store.** Progress/rollups recompute on read; `purposes.progress` / `targets.current_value` are
  **override slots** (NULL = derive), never the source of truth. No denormalized progress/streak counters. `[INTENT
PG4/PG17; FACT: sessions SS-12]`
- **Compose, never duplicate.** A goal _links_ Tasks/Projects for action and _reads_ each contributor's own
  `progress()`; `contributions` stores only the **weight**, never a copied value. Purpose builds no task/session/
  scheduler machinery. `[INTENT PG5/PG10]`
- **Measurability is a CORE contract, not a Purpose feature.** `measurement_kind` + `binding_mode` + `progress()`
  belong to the capstone ADR and land on every pursuable module — implement the interface, don't Purpose-localize the
  fields. `[INTENT PG2/PG3]`
- **Bindings ride the `INT-2` rail.** An `event-trigger` writes through the _owning_ module's single service method,
  idempotent per `effect_event_id`; a `derived-pull` READS a measurement-source seam. Never a bespoke event bus.
  `[FACT: core INT-2; ADR-004 §3.2.5]`
- **Aggregate through the provider seam.** Surface goals/reviews to Journal/Calendar via `summary(date)` + `dueIn`
  — read live, mirror nothing. `[INTENT PG14]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · booleans 0/1 · money
  INTEGER cents (`estimated_cost`) · JSON as TEXT · `[E]` field-level encryption on all user free-text (titles,
  vision, why, reflections, notes, `estimated_cost`) · `_sync_*` on every syncable table · soft delete via
  `deleted_at`. `[FACT: CLAUDE.md Conventions; ADR-002 §5.7]`

## Naming & layout

- Invariants are `PG-N`; aspect docs = the canonical 5 (`identity · business-rules · contract · structure-data ·
conventions`) — this replaces the off-standard stub set (`module-spec`/`page-map`/…). `[FACT: docs/features/*]`
- **`binding_mode`** {manual,derived-pull,event-trigger} = _how a measurable is fed_; distinct from a value's
  provenance **`source`** {manual,auto} (matches Health's axis). Never conflate the two. `[INTENT PG6/PG15]`
- **`contributions`** = the Purpose-domain weighted edge (goal ← contributor + weight). NOT `entity_links` /
  `entity_tags` (the two universal Spaces primitives, INT-1a). `[FACT: core INT-1a]`
- Notes target `entity_type` in `pages` (reserved TODAY: `purpose`/`target`/`purpose_metric_value`; **`value`/`dream`
  ⚠ INTENDED**, PG-18); tags come from the Spaces universal vocabulary. `[FACT: ADR-002 L1363-1372; ADR-006]`

## Pitfalls / local "never do"

- **Never trust a stored progress column as truth** — it's an override slot; the derived value wins unless explicitly
  overridden. `[INTENT PG4]`
- **Never copy a contributor's value into `contributions`** — hold the weight only; read the live `progress()`.
  `[INTENT PG10]`
- **Never model `contributions` as a universal/Spaces primitive** — it's domain-local; elevating it reopens ADR-006.
  `[FACT: INT-1a]`
- **Never coerce an unmeasured `qualitative` goal to `0%`** — show "unmeasured", so it doesn't silently drag a
  purpose down. `[INTENT PG3]`
- **Never require a purpose** — SR-003 is relaxed; every ladder joint is optional. `[INTENT PG9]`
- **Never restore `plan_steps` as tracked entities** — they are a documentation layer; a step needing tracking
  graduates to a sub-task. `[INTENT PG5]`
- **Never build a Purpose-local reminder/scheduler** — reviews are `review` sessions on the Scheduler. `[INTENT PG9]`
- **Never rebuild the Bucket List as a module** — it is a Space over `dreams`. `[FACT: PG8]`
- **Never reach into another module's tables** — read via the measurement-source seam / documented contracts.
  `[FACT: constitution §6; INT-1]`

## Completion checklist

- [x] patterns in use (enforced, not aspiration) · [x] naming/layout · [x] pitfalls · [x] [FACT/INTENT] on each claim
