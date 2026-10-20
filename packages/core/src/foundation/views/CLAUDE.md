# foundation/views — substrate (ADR-007)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
One views primitive (filter x layout x grouping), Space-owned or global, over documented read APIs

## Owning ADR
ADR-007

## Capabilities (framework §3)
V1 V2 V3 V4 V5

## Status
Built by AR-6 (2026-07-29). `views` table (schema/foundation/spaces.ts + migration 003) + `ViewsService`
(CRUD + `cloneView` + **`listViews()`** [first-consumer-pull, mod-tasks S8 2026-10-18 — live rows, `created_at`/`id`
order; `CreateViewInput.grouping` accepts `null`], M1.0 empty-[E] pass-through) + `ViewProviderRegistry` (V4/R7 seam,
ships EMPTY) + `ViewEngine.resolve` (V3 cross-type resolution: ungrouped bucket, never-drop; V5 terminal states).
Real read-providers register per-module at their build — **first registrant: tasks** (`services/tasks`
`registerTasksReadProvider`, S8; its tests drive `resolve` end-to-end incl. nested-tag membership). Nav placement /
pin / order of views = Preferences (ADR-007 §3.5), never a `views` column. Deferred: predicate-DSL grammar
(incl. a multi-tag intersection combinator) + per-layout visual specs (build-time).
