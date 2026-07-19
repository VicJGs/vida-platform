<!-- Structure & Data — features/purposes-and-goals · /documentation Phase 2 · sources: ADR-002 §5.7 L1789-1953 (purposes L1792 · targets L1826 · metrics L1865 · metric_values L1891 · target_reviews L1911 · dreams L1931 · junctions L1959) · bucket_list_items L3319 · §5.20 L3716 · project.ts L109-256 · note.ts L44-46 · docs/intake/purposes-and-goals.md RESOLUTION -->

# Structure & Data — Purposes & Goals  (level: Feature — CAPSTONE)

## Data model

### As-is (v2 — FACT, the floor) `[FACT: ADR-002 §5.7 L1789-1953; project.ts L109-256]`
- **`purposes`** — `title[E]`, `description[E]`, `vision[E]`, `why[E]`, `domain`(LifeDomain 8), `status`(5),
  `progress` 0-100, `start_date`, `target_date`, `is_primary`, `sort_order`, soft-delete + `_sync_*`.
- **`targets`** (= Goals) — `purpose_id` **(FK, CASCADE)**, `title[E]`, `description[E]`, `target_type`
  {quantitative,qualitative,milestone,habit_based}, `target_value`, `current_value`, `unit[E]`, `status`(5),
  `priority`(5), `start_date`, `target_date`, `review_frequency`(6), `next_review_date`, `sort_order`.
- **`purpose_metrics`** — `purpose_id`(FK), `name[E]`, `description[E]`, `unit[E]`, `target_value`, `current_value`,
  `calculation_method`{sum,average,latest,max,min,count}.
- **`purpose_metric_values`** — `metric_id`(FK), `value`, `recorded_at`. Time-series point.
- **`target_reviews`** — `target_id`(FK, CASCADE), `progress_rating` 1-10, `reflection[E]`, `next_actions[E]`,
  `reviewed_at`.
- **`dreams`** — `title[E]`, `description[E]`, `domain`, `target_age`, `estimated_cost[E, cents]`, `purpose_id`
  (FK, **nullable**, `ON DELETE SET NULL`). `[FACT: ADR-002 L1931-1953]`
- **Junctions (bare FK pairs, no payload):** `purpose_habits` · `purpose_routines` · `purpose_projects`. `[FACT:
  project.ts L238-251; ADR-002 L465]`
- **Cross-cutting (exists):** `pages`/`entity_links` reserve `entity_type IN ('purpose','target','
  purpose_metric_value')`. `[FACT: ADR-002 L1363-1372; note.ts L44-46]`

**The v2 model is schema-only, 0 service logic:** `purposes.progress` and `targets.current_value` are **plain
columns nothing computes**; junctions are bare pairs (no contribution data); no reviews above target level; no
measurement/binding/provider machinery. `[FACT: grep clean of packages/core/src/services]`

### Intended (the reframe — ⚠ INTENDED → ADR-002 §5.20 amendment + the capstone ADR) `[INTENT: RESOLUTION]`
- **`values`** (NEW) — first-class core-beliefs layer ABOVE purposes: `name[E]`, `description[E]`, `sort_order`,
  soft-delete. Purposes reference a value (nullable). `[INTENT PG4]`
- **`contributions`** (NEW) — the first-class **weighted-laddering edge** (**Purpose-DOMAIN machinery, NOT a
  universal Spaces primitive** — INT-1a owns the two universal ones, `entity_links` + `entity_tags`): `goal_type`
  {purpose,target}, `goal_id`, polymorphic `contributor_type`/`contributor_id` (habit·routine·project·task·dream·
  finance-target·check-in), `contribution_percentage`, `contribution_notes[E]`. Replaces the 3 bare junctions;
  renders in the neural graph but is not a Spaces primitive. `[INTENT PG7; FACT: core INT-1a]`
- **`purpose_reviews`** (NEW, restored from v1) — the alignment/fulfillment loop: `purpose_id`(FK, CASCADE),
  `still_aligned`, `alignment_notes[E]`, `overall_progress`, `key_achievements[E]`, `obstacles_faced[E]`,
  `adjustments_needed[E]`, `renewed_commitment`, `fulfillment_rating`, `clarity_rating`, `reviewed_at`. Distinct
  shape from `target_reviews`. `[INTENT PG3]`
- **`plan_steps`** (NEW, lightweight DOC layer) — ordered checklist on a Task/Target: polymorphic `owner_type`
  {task,target}, `owner_id`, `title[E]`, `note[E]` (optional "lesser deliverable"), `order`, `is_completed`,
  `completed_at`. NOT a tracked entity — a step that needs tracking graduates to a sub-task (PG-11). May feed the
  owner's `checklist` measurement_kind. `[INTENT PG5]`
- **AMENDMENTS to existing tables:**
  - `targets.purpose_id` → **nullable** (SR-003 relaxed; delete-parent = SET NULL, PG-19). `[INTENT PG9]`
  - `targets` → restore `success_criteria[E]` + `measurement_method`; `target_type` → **`measurement_kind`**
    {quantitative,milestone,rate,qualitative} (the solid/abstract discriminator). `is_achieved` = derived. `[INTENT
    PG5/PG3]`
  - measurables gain **`measurement_kind`** + a **`binding_mode`** {manual,derived-pull,event-trigger} (+ ref). ⚠
    **CROSS-CUTTING** — this pair lands on Tasks·Habits·Routines·Projects·Dreams·Health·Finance measurables, NOT just
    here; owned by the capstone ADR (CORE-level), each such module owes its own [INTENT] amendment (→ §5.20 stream ii).
    Health already carries a provenance `source` — `binding_mode` is a distinct axis, no collision. `[INTENT PG2/PG6]`
  - `purpose_metrics` → restore `is_higher_better` + `baseline_value` (progress direction). `[INTENT PG6/PG15]`
  - `purpose_metric_values` → restore provenance `source`{manual,auto} (distinct from `binding_mode`) + optional
    `context_notes[E]`. `[INTENT PG6]`
  - `dreams` → widen (absorb `bucket_list_items`): `status`, `progress_percentage`, `completed_date`, `priority`,
    `steps`|`project_id`, imagery (`image_url`/`cover_image_url`/`inspiration_url`), `location`. `[FACT PG8; ADR-002
    bucket_list_items→dreams]`
  - `pages`/`entity_links` `entity_type` registry → ⚠ add `value`, `dream` (keep current `purpose`/`target`/
    `purpose_metric_value`). `[INTENT PG18]`
- **RETIRE:** `purpose_habits` · `purpose_routines` · `purpose_projects` → `contributions`; `bucket_list_items` →
  `dreams`. `[INTENT PG7/PG8]`

## Dependencies / graph (within the coupling budget — constitution §6)
- **Depends on (consumes, via contracts — no direct table access):** Sessions & Scheduling (ADR-004: `review`
  sub-type + `dueIn` + scheduler) · Journals (provider registry + snapshot deltas) · Tasks (decomposition +
  bindings) · Projects/Milestones/Deliverables (decomposition) · Habits · Routines · Finance (Commitments +
  measurement-source) · Health (measurement-source) · Check-ins (review surface) · Spaces (universal tags · views ·
  the "Bucket List" Space over dreams) · Notes & Pages (`pages`/`entity_links`) · Notifications (review due).
- **Depended on by:** Journals (Review lens "improvement vs goals/dreams/purposes", JR-9) · Check-ins (weekly/
  monthly/yearly reviews read purpose progress, CK-6) · Global Calendar (`dueIn`) · Gamification (achievement on
  goal/purpose completion). `[FACT: journals JR-9; check-ins CK-6]`
- **No cycle:** Purposes sits ABOVE the foundations it measures (Tasks/Habits/Routines/Projects/Finance/Health) and
  is READ by the higher-order read-everything contexts (Journals/Check-ins/Gamification) — the meaning-plane apex of
  the fill order. Cross-module writes are the INT-2 single-path effect (bindings), not reads. `[FACT: fill order;
  core INT-2]`

## ADRs / structural decisions
- **ADR-011 — "Universal Measurability & Progress Propagation"** (Accepted 2026-07-17; **CORE-level,
  cross-cutting — not Purpose-local**): `measurement_kind` + normalized `progress ∈ [0,1]` + the `binding_mode`
  primitive (`manual`/`derived-pull`/`event-trigger`) + the measurement-source READ seam + INT-2-rail write
  propagation + the acyclic (DAG) guard. Lands on every pursuable module; Purpose is its rollup apex + primary
  consumer, not its owner. The OS as a digital measurement layer over real life. `[INTENT PG2/PG6]`
- **ADR-004 (Session Framework)** — the `review` sub-type + `dueIn` seam purpose/target reviews fire on. `[FACT:
  ADR-004]`
- **ADR-006/007 (Spaces)** — `entity_tags` (values-as-tag was rejected → first-class `values`; tags still scope
  purposes) + `views` (the "Bucket List" Gallery/vision-board Space over `dreams`). `[FACT: ADR-006/007]`
- **ADR-002 §5.20 amendment (consolidated, build-phase)** — the NEW/RETIRE/AMEND set above joins the owed-tables
  ledger. `[INTENT §5.20]`
- **Generic review substrate** (Knowledge/Purpose/Check-ins) — ADR **candidate, deferred** (PG-12; shapes differ).

## Single source of truth (constitution §3)
- **Progress is DERIVED**, never a trusted stored column — `purposes.progress`/`targets.current_value` are override
  slots (NULL = derive), not truth (PG-4/PG-17).
- **A contributor's progress lives on the CONTRIBUTOR**, read through its `progress()` contract; `contributions`
  holds only the **weight**, never a copied value (PG-10).
- **Cross-module auto-updates go through the owning module's single write path** (INT-2), idempotent per
  `effect_event_id` — Purpose never writes another module's table (PG-7).
- **Tags** = the **Spaces** universal vocabulary (PG-18); **notes** = `pages` (DATA-3); **scheduling** = the
  Scheduler / `review` sessions (PG-13), not a Purpose-local reminder.
- **One aspiration entity** = `dreams` (PG-16); "Bucket List" is a Space over it, not a table.

## Completion checklist
- [x] data model (as-is FACT floor vs INTENDED reframe) · [x] dep graph within budget (no cycle) · [x] ADRs (capstone + reused) · [x] single source per cross-cutting concern · [x] [FACT/INTENT] on every claim · [x] RETIRE/NEW/AMEND enumerated for §5.20
