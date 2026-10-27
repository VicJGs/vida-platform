# ADR-007: Model saved views as one first-class primitive (filter × layout × grouping), Space-owned or global, over documented read APIs

**Status:** Accepted _(foundation gate PASS + Victor sign-off, 2026-07-15)_
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (Personalization & Composability foundation). ADR 2 of 5 in the Spaces set.
**Tags:** architecture · data model · extensibility · personalization
**Builds on:** [ADR-006](ADR-006-spaces-foundation-universal-tags.md) (a view filters on `entity_tags`; a Space-owned view points at `spaces`) · Journals J2 provider registry + Sessions `dueIn()` (the per-module read-API pattern a cross-module view reuses) · INT-1 (no direct cross-module table reads)
**Amends:** ADR-002 — adds the `views` table; retires the INTENDED `task_views` (Tasks) and the per-module "custom views" store (Preferences), generalized into this one primitive.

---

## 1. Summary

A **saved view** becomes **one first-class primitive** — `views` — instead of five hard-coded view _components_ plus
per-module one-off view records. A view is **filter × layout × grouping/sort** over OS entities: _which_ entities
(tags + entity-types + predicates), rendered _how_ (list · table · board · gallery · calendar · graph · timeline),
grouped and sorted a chosen way. A view is **Space-owned or global** (`space_id` NULL = global/reusable), the OS
**ships a default set** and the user **creates, edits, and clones** his own. The view engine reads through each
module's **documented read API** (the same provider pattern Journals and `dueIn()` already use), never by touching
another module's tables — so INT-1 holds. This is the primitive the **Global Calendar, the Languages dictionary,
Duties/Obligations preset tabs, and the Bucket-List vision board** all reduce to: saved views, not bespoke surfaces.

## 2. Context — what triggered this

Views today are **components, not data**, and the "saved view" idea was flagged per-module and never generalized:

- `@vida/ui` ships `calendar-view · list-view · gallery-view · neural-graph · timeline` plus page filters
  (`listPages({favorite,archived,tag})`, `getPagesByType`). There is **no saved, cross-module, tag-scoped view
  record.** `[FACT: packages/ui/src/components/; docs/intake/spaces.md L27-31]`
- **INTENDED `task_views`** (Tasks) and **per-module custom views** (Preferences) were each flagged but never
  unified — the seed of five parallel half-solutions. `[FACT: tasks + preferences structure-data.md]`

Meanwhile the modules already documented keep asking for the **same** thing under different names: the **Global
Calendar** is "a saved view over cross-module events/tasks/reminders" (Relationships G1 / SP9); the **Languages
dictionary** is "a grouped/filtered saved view" and a "hub" view (SP7 accumulator); a **Duties/Obligations preset
tab** is "a saved View over a `tasks` filter + per-type UI" (Duties worked-example); the **Bucket List** is "a
vision-board **Gallery** view over Dreams with derived progress" (Bucket-List worked-example). Five requests, one
primitive. `[FACT: docs/intake/spaces.md L152-198, accumulator]`

Building each as its own surface is exactly the per-feature "Hub" sprawl v1 died of (`LanguageHubPage`, one bespoke
page per module). `[FACT: intake L55-58, legacy]`

## 3. Decision

**3.1 `views` is a first-class entity.** A saved view is a row, not a component. `@vida/ui`'s view components become
the **renderers** a view _selects_; they stop being the unit of "a view." `[FACT: intake SP3-RESOLVED]`

**3.2 Ownership — Space-owned or global, user-driven (both).** `views.space_id` is nullable: **NULL = a global,
reusable view**; **set = a view owned by one Space** (created for it, e.g. its default). The OS **ships a default
set** (per entity type and per shipped Space); the user **creates new views, edits them, and clones** a global into
a Space or vice-versa (clone = independent copy, consistent with ADR-009's fork stance). `[FACT: intake SP3 — "both
… ship default views + the user creates new ones and edits them"]`
A Space may own **many** views (`views.space_id = spaces.id`); the `spaces.default_view_id` from ADR-006 §3.4 simply
names which one opens first — it is one of the Space's views, not a separate slot.

**3.3 Anatomy — filter × layout × grouping/sort.**

1. **Filter** — `{ tags (→ entity_tags, ADR-006, incl. nested), entity_types (which taggable/registered types),
predicates (status, date range, module-specific fields) }`, stored as JSON TEXT (DATA-2). A view whose filter is
   a single root tag renders **the emergent contents of a Space** — this is why a Space _has_ views.
2. **Layout** — one of `list · table · board · gallery · calendar · graph · timeline`. Layout is where the
   **imagery-first Gallery / vision board** lives (Bucket-List worked-example) — not merely a list. Each layout
   **declares the entity fields it needs** (calendar → a date field; gallery → an image/cover field; board → a
   group-by field); an entity that lacks them makes that layout unavailable or degraded (a declared, non-error
   state), never a crash.
3. **Grouping / sort** — group-by + sort keys (JSON TEXT), applied after filter, independent of layout.
4. **Cross-type resolution (heterogeneous views).** When a view selects **multiple** entity types, predicates and
   group-by are **provider-delegated, not global**: each type's read API (§3.4) applies the predicates it
   understands; a predicate a provider does not recognize is **ignored for that type** (default) — the type is
   _not_ silently dropped unless the view opts into "exclude types that can't satisfy this filter". Group-by a
   field a type lacks routes that type's rows to an **"ungrouped" bucket**. So `status=done` narrows tasks while
   leaving events unfiltered; a date-range predicate (common) narrows all three. This makes a mixed-type view
   (Global Calendar) well-defined without forcing every type to share a schema.

`views` is syncable → carries `_sync_*` + `deleted_at` (DATA-4). Its `name` is `[E]`, and any user-literal values in
the filter JSON encrypt per EN-2 (tag/entity IDs are references, not secrets; free-text predicate values are user
content) — personalization never leaks plaintext (SP8).

**3.4 The view engine reads through documented per-module read APIs — never direct cross-module table reads.** A
cross-module view (e.g. the Global Calendar over events + tasks + reminders) fans its filter out to **each entity
type's documented list/query API** and merges the results — the **same provider pattern** Journals' registry (J2)
and Sessions' `dueIn()` already establish. This honors **INT-1** (modules don't read each other's tables) and reuses
a seam that already exists rather than inventing a query layer. `[FACT: business-rules INT-1; Journals J2; ADR-004]`

**3.5 This retires the parallel half-solutions and underpins the documented seams.** `task_views` and Preferences'
per-module custom views collapse into `views` (a Task board is a `views` row with `entity_types=[task]`). The
**Global Calendar**, the **dictionary**, **preset tabs**, and **vision boards** are **saved views**, not new
surfaces (SP9) — Spaces is the substrate beneath them, not a competitor. Nav placement / default-view preference
lives in **Preferences** (generalizing per-module visibility to per-Space), as established in ADR-006. `[FACT:
intake SP9-CONFIRMED; SP3]`

**Terminal states.** Every view defines **loading / empty (filter matches nothing) / error (a provider failed) /
success**; empty and provider-error are first-class rendered states, specified at the contract level, not here.

**What this decision does NOT do:** it does not design each layout's visual/interaction spec (build-time views
pass, per the standing "per-module VIEWS review" flag); it does not define the predicate DSL's full grammar (a
build-time detail); it does not build the provider registry (it _reuses_ Journals'/Sessions' pattern — wiring is
per-module at build).

## 4. Options Considered

### Option A — One `views` primitive (filter × layout × grouping), Space-owned or global, over read APIs (CHOSEN)

- **Rationale:** one row type serves every "saved surface" the modules ask for; nullable `space_id` gives both
  ownership models without two tables; reusing the provider read-API pattern keeps INT-1 intact and adds no new
  cross-module mechanism. The Global Calendar / dictionary / presets / vision boards stop being bespoke code.
- **Tradeoffs accepted:** a view is only as fast as the slowest provider it fans out to; layout↔entity-field
  compatibility must be declared and degrade gracefully; the predicate config is JSON (no per-field FK/type check).

### Option B — Keep view _components_ + per-module saved-view tables (`task_views`, etc.) (REJECTED)

- **Why rejected:** N parallel half-primitives, each re-solving filter/layout/grouping; no cross-module view is
  possible (a Global Calendar can't be a Task-only `task_views` row); reproduces the v1 per-feature Hub sprawl.

### Option C — A materialized cross-module index the view engine queries directly (REJECTED)

- **Why rejected:** a central table every module writes into is a read-through god-store that **breaks INT-1** and
  duplicates data that already lives in each module (staleness, the exact failure the `dueIn()` "point, don't copy"
  rule rejected in ADR-004). Fan-out over read APIs is the established, staleness-free pattern.

## 5. Consequences

**Easier:**

- One primitive powers every saved surface; a new "hub"/"dashboard"/"board" is a `views` row, not a feature.
- A Space is "a root tag + its views"; the Global Calendar, dictionary, presets, and vision boards are all views.
- New modules get saved views for free by exposing a documented list/query API (which they already must for INT-1).

**Harder:**

- Cross-module views inherit fan-out latency (bounded by the slowest provider) — needs the same care as the Journal
  dashboard and Global Calendar aggregation.
- Layout/field compatibility and the empty/provider-error states are real surface to design and support.

**Explicitly accepted tradeoffs:**

- JSON filter/grouping config (no per-field schema guarantees) and fan-out cost, in exchange for one cross-module
  view primitive and no new cross-module read mechanism.

## 6. Review Date / trigger

Reconsider when the **Global Calendar** or the **first vision-board Gallery** is built — the first real cross-module
view and the first imagery-first layout. If fan-out-over-providers cannot meet the interaction budget for a
many-type view, revisit whether a bounded read-model (still provider-fed, INT-1-safe) is needed for that case.
