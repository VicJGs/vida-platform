# ADR-007: Model saved views as one first-class primitive (filter × layout × grouping), Space-owned or global, over documented read APIs

**Status:** Accepted _(foundation gate PASS + Victor sign-off, 2026-07-15)_
**Date:** 2026-07-15
**Decision Makers:** Victor J.
**Context:** Vida Platform — Spaces (Personalization & Composability foundation). ADR 2 of 5 in the Spaces set.
**Tags:** architecture · data model · extensibility · personalization
**Builds on:** [ADR-006](ADR-006-spaces-foundation-universal-tags.md) (a view filters on `entity_tags`; a Space-owned view points at `spaces`) · Journals J2 provider registry + Sessions `dueIn()` (the per-module read-API pattern a cross-module view reuses) · INT-1 (no direct cross-module table reads)
**Amends:** ADR-002 — adds the `views` table; retires the INTENDED `task_views` (Tasks) and the per-module "custom views" store (Preferences), generalized into this one primitive.
**Amended:** 2026-11-15 (LIF-358, LIF-399, LIF-400; Victor) — the views pass this ADR deferred. Added **§3.6** (the filter grammar, with tags as the shared vocabulary every provider honours), **§3.7** (provider capabilities: the fields, operators and roles each provider advertises), **§3.8** (per-layout field roles), **§3.9** (grouping and sort shapes, the tasks 12→7 mapping and the calendar ranges, Living as lanes) and **§3.10** (the Global Calendar is a page of saved views: §3.5 stands). §6 records the fired trigger and the open budget question. The stored filter, grouping and sort shapes are a one-way door: existing rows are read through the compatibility rules in §3.6 and §3.9.

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
  record.** `[FACT: packages/ui/src/components/]`
- **INTENDED `task_views`** (Tasks) and **per-module custom views** (Preferences) were each flagged but never
  unified — the seed of five parallel half-solutions. `[FACT: tasks + preferences structure-data.md]`

Meanwhile the modules already documented keep asking for the **same** thing under different names: the **Global
Calendar** is "a saved view over cross-module events/tasks/reminders" (Relationships G1 / SP9); the **Languages
dictionary** is "a grouped/filtered saved view" and a "hub" view (SP7 accumulator); a **Duties/Obligations preset
tab** is "a saved View over a `tasks` filter + per-type UI" (Duties worked-example); the **Bucket List** is "a
vision-board **Gallery** view over Dreams with derived progress" (Bucket-List worked-example). Five requests, one
primitive.

Building each as its own surface is exactly the per-feature "Hub" sprawl v1 died of (`LanguageHubPage`, one bespoke
page per module). `[FACT: intake L55-58, legacy]`

## 3. Decision

> **Temporary code labels (LIF-462).** `docs/features` cites this ADR's clauses by short codes (for example SP1, M2 or X5), defined in the archived capability framework. Each code is labelled at its clause. The labels are a bridge: they go once the docs reshape reorganizes this information.

> **Codes (temporary):** **V1** (§3.1) `views` is a first-class primitive

**3.1 `views` is a first-class entity.** A saved view is a row, not a component. `@vida/ui`'s view components become
the **renderers** a view _selects_; they stop being the unit of "a view." `[FACT: intake SP3-RESOLVED]`

> **Codes (temporary):** **V2** (§3.2) view ownership: `views.space_id`, NULL = global

**3.2 Ownership — Space-owned or global, user-driven (both).** `views.space_id` is nullable: **NULL = a global,
reusable view**; **set = a view owned by one Space** (created for it, e.g. its default). The OS **ships a default
set** (per entity type and per shipped Space); the user **creates new views, edits them, and clones** a global into
a Space or vice-versa (clone = independent copy, consistent with ADR-009's fork stance). `[FACT: intake SP3 — "both
… ship default views + the user creates new ones and edits them"]`
A Space may own **many** views (`views.space_id = spaces.id`); the `spaces.default_view_id` from ADR-006 §3.4 simply
names which one opens first — it is one of the Space's views, not a separate slot.

> **Codes (temporary):** **V3** (§3.3) view anatomy + cross-type resolution · **V5** (§3.3) view sync, encryption and states

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

> **Codes (temporary):** **V4** (§3.4) provider fan-out (INT-1) · **R7** (§3.4) read seam (INT-1): read another module only through its documented read API (shared rail; also ADR-011 §3.6)

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

> **Codes (temporary):** **R5** (Terminal states) every surface declares `loading · empty · error · success` (shared rail; also ADR-008, ADR-009)

**Terminal states.** Every view defines **loading / empty (filter matches nothing) / error (a provider failed) /
success**; empty and provider-error are first-class rendered states, specified at the contract level, not here.

**What this decision does NOT do:** it does not design each layout's visual/interaction spec (build-time views
pass, per the standing "per-module VIEWS review" flag); it does not build the provider registry (it _reuses_
Journals'/Sessions' pattern — wiring is per-module at build). _The predicate grammar, deferred here in July, is
decided in §3.6 (amended 2026-11-15)._

> **Amended 2026-11-15 (LIF-358, LIF-399, LIF-400).** §3.6–§3.10 below are the views pass that §3.3 and C8 left
> open. They decide shapes only; the build is LIF-358 (grammar + capabilities), LIF-399 (roles, grouping, mapping),
> LIF-567 (defaults + surface) and LIF-624 (the Calendar page on saved views).

**3.6 The filter grammar (VW-8).** A view's `filter` JSON has these keys (`lanes` is §3.9's Living):

```text
filter = { entity_types: string[], tags?: TagClause, where?: Clause[], exclude_unsupported?: boolean, lanes?: viewId[] }

TagClause  = { any?: tagId[], all?: tagId[], none?: tagId[] }
Clause     = Comparison | { any: Clause[] } | { not: Clause }
Comparison = { field: string, op: Op, value?: Value }
Op         = eq · ne · in · lt · lte · gt · gte · between · exists · contains
Value      = a literal · a list (in, between) · a relative date { rel: 'today', days?: number }
```

1. **Tags are the shared vocabulary (Victor, 2026-11-15).** Every module gets views and tags so nothing is left
   behind, and tags are what let one view understand every module's data. So every provider applies `tags` the same
   way, and it is not an optional capability: membership always includes nested tags (ADR-006); `any` is a union,
   `all` an intersection (the multi-tag combinator C8 deferred), `none` an exclusion; the three combine with AND.
2. **`where` is a list of conjuncts** (AND). A conjunct is one comparison or an `any`/`not` group. `field` is either
   a provider field (`status`, `priority`) or a shared role written with `@` (`@date`, `@title`, §3.8), so a date
   range written once narrows every dated type (the §3.3.4 example).
3. **Relative dates** make time-based views durable: "Today" stores `{ field: '@date', op: 'lte', value: { rel:
'today' } }`, resolved at read time in the user's timezone. Today a preset must store a per-day literal
   (`due_before`), which goes stale overnight.
4. **Compatibility.** A stored `tags: string[]` reads as `{ any: [...] }`. A stored `predicates: { k: v }` reads as
   one `eq` conjunct per key on the provider's field `k`, except the keys a provider declares as legacy aliases (Tasks:
   `due_before` → `{ field: 'due_date', op: 'lt' }`). LIF-358 rewrites the shipped presets and migrates stored rows to
   the new keys; the read path keeps the compatibility rules so no saved view stops filtering.
5. Field names, operators and roles are references, not secrets. Comparison values the user typed are user content
   and encrypt per EN-2, as §3.3 already says for predicate values (VW-5).

**3.7 Provider capabilities (VW-8).** A `ReadProvider` advertises what it understands next to `list()`:

```text
capabilities = { fields: { [name]: { type, ops: Op[] } }, roles: { [role]: fieldName }, aliases?: { [legacyKey]: Comparison } }
```

The engine reads the capabilities before it fans out. For each selected type:

1. A conjunct whose fields and operators the provider supports is applied by that provider.
2. A conjunct it can't apply is **ignored for that type** (the §3.3.4 default) and named in `ResolvedView.degraded`
   (for example `status ignored for event`), so the user sees why a type is unfiltered. Ignoring works per conjunct:
   an `any` or `not` group is applied whole or ignored whole, never half-evaluated.
3. With `exclude_unsupported: true` (the §3.3.4 opt-in), a type that would ignore any conjunct contributes no rows,
   and `degraded` says so.
4. `tags` is never ignored: a provider must implement it to register.

The engine fans out to providers concurrently, not one by one: a view is as slow as its slowest provider, not
their sum (§5).

**3.8 Layout field roles (VW-9).** A layout needs **roles**, not module fields; each provider maps its own fields
onto the roles in `capabilities.roles` (Tasks: `@date` → `due_date`, falling back to `scheduled_date`). The roles are
`@title`, `@date` (a calendar day), `@start` and `@end` (clock times), `@cover` (an image), `@parent` (hierarchy) and
`@links` (connections between entities).

| Layout   | Needs                       | Uses when present                         |
| -------- | --------------------------- | ----------------------------------------- |
| list     | `@title`                    | `@date`, `@parent` (indent)               |
| table    | `@title`                    | any advertised field as a column          |
| board    | `@title` + a grouping field | `@cover`                                  |
| gallery  | `@title`                    | `@cover` (a title card without one)       |
| calendar | `@date` or `@start`         | `@end`; `@start`/`@end` make timed blocks |
| graph    | `@title` + `@links`         | `@cover`                                  |
| timeline | `@date` or `@start`         | `@end` (a span, not a point)              |

A type that lacks a layout's needed roles is left out of that layout with a `degraded` note, never a crash; when no
selected type has them, the layout is unavailable in the switcher. The renderers already take these as accessors
(`getDate`, `getKey`, `getWeight`), so a role is the accessor's source.

**3.9 Grouping and sort, the tasks mapping and the calendar ranges (VW-9).** `grouping` and `sort` grow from one
field to the shapes the twelve task layouts and the six calendar ranges need:

```text
grouping = { field?: name|@role, cross_field?: name|@role, nest?: boolean, span?: 'day'|'week'|'month'|'year' }
sort     = { keys: [{ field: name|@role, dir: 'asc'|'desc' }], limit?: number }
```

`field` groups (board columns, list sections); `cross_field` adds the second axis (board rows); `nest` groups by
`@parent` (a tree); `span` is the period a dated layout shows around the focused day, and the focused day itself is
navigation, never stored. A stored `{ field }` keeps its meaning.

**The twelve task layouts on the seven (TK-20).** No task layout needs an eighth layout, so `views.layout` keeps its
seven values:

| Task layout         | View                                                             |
| ------------------- | ---------------------------------------------------------------- |
| List                | list                                                             |
| Grouped             | list + `grouping.field`                                          |
| Board / Kanban      | board + `field: status`                                          |
| Calendar            | calendar + `span: month`                                         |
| Today / Agenda      | list + `where @date lte today` + open                            |
| Table               | table                                                            |
| Timeline / Gantt    | timeline (`@start`/`@end`)                                       |
| Tree / Outline      | list + `nest: true`                                              |
| Matrix / Eisenhower | board + `field: priority` + `cross_field` on an urgency field    |
| Swimlanes           | board + `field: status` + `cross_field` (project, assignee …)    |
| Focus / Now         | list + open + `sort` by priority then due + `limit` (one or few) |
| Gallery / Cards     | gallery                                                          |

Matrix needs Tasks to advertise a derived urgency field (due within a window); that is LIF-399's build detail.

**The six calendar ranges.** Year, Month, Week and Day are the `calendar` layout with `span` set; Week and Day draw
`@start`/`@end` items as timed blocks and `@date`-only items in the all-day strip. Agenda is a list over `@date`
with `span: week`, grouped by day.

**Living is lanes, not an eighth layout.** Living (the week read as record, live and intention, with habit threads,
purpose hours, open time and slipping tasks) is a `calendar` view with `span: week` whose `filter.lanes` lists other
saved views, each resolved on its own and drawn as one lane of the week. Each lane (habit threads, the week's hours
by purpose, today's open time, slipping tasks, the past day's record, a future day's intention) is a saved view of
its own, so it can be cloned, edited, and used in a Space or another view: that's what makes calendar views volatile
(Victor, 2026-11-15). Past, today and future are the renderer's temporal state, as the timeline already draws them.
A lane is a reference: cloning a Living view copies the lane list, not the lane views.

**3.10 The Global Calendar is a page of saved views: §3.5 stands (LIF-400).** The Calendar keeps its own page in nav
(CL-1), and every range on it is a saved view: a `views` row resolved through the engine and the providers, tags
included, with its six ranges shipped as default views (VW-7). A run-30 ledger line (2026-11-11, CL-22) said the
Calendar is a lens of its own rather than a saved view; Victor withdrew it on 2026-11-15 as drift. The built page
still reads ten hard-coded lanes from five services and keeps its range as UI state; rebuilding it on saved views is
LIF-624, and one calendar renderer then serves the page, Spaces and other views.

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

**Fired 2026-11-15 (LIF-400).** The Global Calendar is built (LIF-203). The review kept §3.5 (§3.10) and decided the
views pass (§3.6–§3.9). One question stays open, and LIF-400 answers it with a measurement: does concurrent fan-out
hold an interaction budget for a many-type view? No budget is written down anywhere in Vida yet, so LIF-400 sets one
and measures the Living default view (every lane) on a seeded vault. If it fails, the answer is a bounded read model,
still provider-fed (INT-1), for that case only. The vision-board Gallery trigger still stands.
