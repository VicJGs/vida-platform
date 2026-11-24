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
pin / order of views = Preferences (ADR-007 §3.5), never a `views` column. **The filter grammar is built (LIF-703, ADR-007 §3.6):**
`ViewFilter` = the grammar (`TagClause`, `Clause`, `Comparison`, `Op` from `@vida/types` `VIEW_FILTER_OP`, `Value`);
`StoredViewFilter` = what a row or `ReadProvider.list` may carry. `filter.ts` is the one home every provider uses:
`normalizeViewFilter` (§3.6.4 compatibility read + provider aliases), `resolveTagClause`/`matchesTagClause` (nested
any/all/none), `compileWhere` (unapplicable conjuncts ignored). The engine passes the filter as stored. Decided, not
built: provider capabilities + naming ignored conjuncts in `degraded` + `exclude_unsupported` (§3.7, LIF-704), layout
roles, grouping/sort shapes (§3.8–§3.9, LIF-399). Per-layout visual specs stay build-time.
