<!-- Forward spec — Tasks ① S7 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- REWRITTEN after grounding: the first draft defined a bespoke `AggregationProviderPort` — a FORK of the shipped
     shared R7/V4 seam (`foundation/views` ViewProviderRegistry + ReadProvider). S7 now CONSUMES that seam. -->

# PLAN S7 — Aggregation (R7 fan-out over the shared ViewProviderRegistry)

> Slice-map S7. TAS-05 (`getAggregatedTasks` cross-module aggregated view), TAS-32 (per-group degradation).
> Gate decision **D3** (providers deny-safe per source) — approved at Step 2. Doc-resolved from TAS-05/32 +
> business-rules TK-2/TK-9 + **ADR-007 §3.3/§3.4 (V3/V4/R7)** + **xcut-views XCU-07/08/10/12** + the built
> `foundation/views` seam. Closes with the live-store Verification Gate.

## Grounding correction (what this rewrite fixed — No-Guessing)

The first draft invented `AggregationProviderPort { resolveLabel(type,id) }` — a tasks-local registry of per-type
read providers. That duplicates the **one shared cross-module read seam** the OS already ships:

- `[FACT: foundation/views/provider-registry.ts:12-16]` `ViewProviderRegistry { register, get(entityType), list }` —
  "the V4/R7 read-provider seam; modules register their documented list/query API; ships EMPTY".
- `[FACT: foundation/views/types.ts:24-27]` `ReadProvider { entityType; list(filter: ViewFilter): Promise<unknown[]> }`.
- `[FACT: ADR-007:78-80,96,122]` the engine "reads through documented per-module read APIs — the **same provider
  pattern** Journals' registry (J2) and Sessions `dueIn()` use"; it "does **not** build the provider registry (it
  _reuses_ the pattern — wiring is build-time)"; "new modules get saved views for free by exposing a documented
  list/query API".
- `[FACT: corpus.md:159; xcut-views XCU-07]` the registry row cross-references **tasks TAS-05 (R7)**; TK-9 / contract.md:29
  "the same seam the aggregated `views` ride via V4".
  So the slice-map's `providers?: AggregationProviderPort` was a decomposition **placeholder name** for this seam; the
  type is the shared `ViewProviderRegistry`. Building a second registry = a fork ([[dont-manufacture-an-architecture-
fork-the-pattern-already-answers]]). **S7 consumes the shared seam; it defines no provider port of its own.**

**Why `ViewEngine.resolve` is NOT called (grounded non-reuse, not a fork):** `resolve(view: ViewRow)` is driven by a
_saved `views` row_ and groups merged multi-type rows by a _single_ `grouping.field` `[FACT: engine.ts:37-74]`.
`getAggregatedTasks` is an ad-hoc derivation over ONE type (`tasks`) partitioned by _whichever of 4 parent FKs is set_,
plus a parent **lookup** (not a type-list). The registry IS the seam for that lookup; the engine's grouping shape
doesn't express a 4-FK partition. Tasks partitions locally and borrows the engine's discipline: the standalone/Inbox
group is BR-10's **"ungrouped bucket — never dropped"** `[FACT: spaces/current-business-rules.md BR-10; XCU-10]`.

## What is already built (the grounding floor)

- The **aggregator mechanism**: 4 mutually-exclusive parent FKs (plain TEXT, no FK) + the ≤1-parent guard (S1,
  BR-TK-S1-1); a task with none is standalone (TK-2). `listTasks` reads the own table soft-delete-filtered.
- The **shared R7/V4 seam** (above) — built by AR-6, EMPTY: `[FACT: grep — zero services register a ReadProvider]`.
- The **deny-safe optional-port pattern** — `effects?` (S3), `sessions?` (S4), Projects `tasks?` (`projects/types.ts:35`).

## Scope (what's in ① vs deferred)

- **In (net-new):** `getAggregatedTasks(grouping)` over own tasks; parent resolution through the shared
  `ViewProviderRegistry` (deny-safe `providers?` dep); standalone **Inbox** group always included (G2); per-group
  degradation (TAS-32); net-new result types `AggGrouping` / `AggregatedGroup` / `AggregatedTasks`. Reads **only**
  the own `tasks` table + the seam — never a cross-module table (TK-9/C5).
- **Deferred — each traced to its homing doc, NOT manufactured:**
  - **Provider registration/wiring** (projects/relationships/learning registering their `ReadProvider`) — "real
    providers register **per-module at their build**" `[FACT: XCU-07; views/CLAUDE.md]`; "**M1 has no composition
    root** — wired at M2/P6" `[FACT: projects/types.ts:31; learning-education/types.ts:128,131]`; S4's
    `registerTasksTimer` likewise has no caller yet. M1 ⇒ registry EMPTY ⇒ every cross-module group `degraded`.
    Projects/relationships DO expose the backing APIs (`getProject(id)`, `getContact(id)` `[FACT: projects/types.ts:198;
relationships/types.ts:166]`), so the port is realistic — the _registration_ is the deferred act.
  - **Tasks-as-a-`ReadProvider`** (tasks registering `entityType:'task'` so saved `views` can fan out _over tasks_) —
    XCU-07 lists tasks as a registrant and TAS-05 names "views = **rider**"; that is the views-primitive side → **S8**
    (`saveView`/`listViews` + the ADR-007 pass), not the consumer derivation here. `[FACT: XCU-07; parts/tasks.md:15]`
  - **`getTaskRollup`/`getFocusMinutes`** — Projects' own optional `tasks?: TasksProjectsPort` `[FACT: projects/types.ts:55-61]`;
    **no tasks TAS row** names tasks-as-provider-to-projects → a separate cross-module wiring unit.
  - **The ② grouped-view render** (headers/collapse/drag + mapping a parent row → display label per type) — the SPLIT
    leg's UI half `[FACT: parts/tasks.md:15 "service + UI → SPLIT"]`.
  - **Saved-view grouping / `views` config** ("filter × layout × grouping" is the `views` row `[FACT: identity.md:18;
structure-data.md:21; ADR-007 V1]`) + the full V1 anatomy (**deferred dedicated 007 pass**, C8). S7 supplies the
    derivation a view _consumes_; it persists nothing.
  - **The predicate-DSL grammar** (the canonical by-id predicate key) — "predicate-DSL grammar deferred (build-time)"
    `[FACT: views/CLAUDE.md]`. S7 uses `predicates:{id}` + a **defensive `row.id` match** so it is correct whether or
    not a provider honours the key (ADR-007:67-68 — unrecognized predicates are ignored per type).
  - **C5 guard** — the 4 parent FKs + TK-2 model untouched; no schema.

## Operations (one added read method)

```ts
getAggregatedTasks(grouping: AggGrouping): Promise<AggregatedTasks>
```

`providers?: ViewProviderRegistry` (import type from `foundation/views`) added to `TasksServiceDeps` — deny-safe
optional, mirroring `effects?`/`sessions?`. **No bespoke provider port type.**

## Types (net-new result shapes only)

```ts
/** TAS-05 "by module/project/status/…": `parent` = by parent ENTITY (the R7 lookup — the only provider-consuming
 *  grouping); `parent_type` = by parent MODULE (coarser, own-table data, provider-free); `status` = flat, provider-free.
 *  Additive-extensible. */
export type AggGrouping = { by: 'parent' } | { by: 'parent_type' } | { by: 'status' }

export type ParentType = 'project' | 'milestone' | 'course' | 'contact'

/** One group. Degradation is explicit per-group (TAS-32). For `by:'parent'` the parent is resolved through the
 *  shared seam and attached OPAQUE (`parentRow: unknown`, exactly as the engine returns `unknown[]` rows) — the ②
 *  render maps it to a display label per type (SPLIT). `label` is a deterministic fallback (`'<type>:<id>'` /
 *  `'standalone'` / the status / the type), NEVER a name fabricated from an unknown row shape (No-Guessing). */
export interface AggregatedGroup {
  key: string // 'project:<id>' | 'parent_type:project' | 'status:completed' | 'standalone'
  label: string // deterministic fallback; ② upgrades from parentRow when it knows the type
  parent: { type: ParentType; id: string } | null // null ⇒ the standalone/Inbox group (or a non-parent grouping)
  parentRow: unknown | null // the provider's row for by:'parent' when resolved; null otherwise
  state: 'ok' | 'degraded' // 'degraded' ⇒ no provider / no match / provider threw (TAS-32)
  tasks: TaskRow[]
}
export interface AggregatedTasks {
  groups: AggregatedGroup[]
}
```

## Operation flow + invariants

- **Own table only.** List own tasks (reuse the soft-delete-filtered `listTasks` path), partition in JS. No
  cross-module table (TK-9/C5); parents come solely through `providers`.
- **`by:'parent'` (R7):** partition by the single set FK → key `'<type>:<id>'`; no FK → the **standalone** group
  (BR-10 ungrouped-bucket discipline — never dropped; included whenever any exist, G2; always `state:'ok'`). For each
  **distinct** parent (one lookup per parent, not per task):
  1. `providers` absent, or `providers.get(type)` undefined ⇒ `degraded` (BR-11 "no provider → declared, never dropped").
  2. else `await provider.list({ predicates: { id } })`, **then match** `rows.find(r => (r as {id?:unknown}).id === id)`
     — robust whether or not the provider applied the predicate (ADR-007:67-68). `id` is the one universal field
     (ADR-002 UUIDv7 PK); no other field is read in ①. No match ⇒ `degraded`.
  3. the call **throws** ⇒ caught per-group ⇒ `degraded` (BR-12 fail-loud per source; the method itself never rejects
     for a source outage — TAS-32 "never the whole view").
  4. matched ⇒ `state:'ok'`, `parentRow` = the row.
- **`by:'parent_type'`:** partition by which FK is set → key `'parent_type:<type>'`; standalone bucket; **no provider
  call** (own-table data); all `state:'ok'`.
- **`by:'status'`:** partition by `status` → `'status:<status>'`; no provider call; all `state:'ok'`.
- **Determinism:** stable group order (standalone last; others by key); tasks within a group keep the `listTasks`
  order. Repeated calls ⇒ identical structure.
- **No new error type.** A malformed `grouping` ⇒ Zod parse error (caller bug — S1 boundary discipline); a source
  outage ⇒ a per-group `state`, never a throw.

## Deps / validators

- `providers?: ViewProviderRegistry` — type-only import from `../../foundation/views` (same tier as the existing
  `foundation/{measurement,effects,sessions}` imports). No runtime coupling when absent.
- `AggGroupingSchema = z.discriminatedUnion('by', …)` in `validators/task.ts` (boundary validation, S1 pattern).
- **No `@vida/types` change, no migration, no schema, no new dep, no new typed error.**

## Verification Gate (blocking — live store, Node 24, real better-sqlite3 + the REAL `createViewProviderRegistry`)

1. `by:'parent'`, tasks across 2 projects + 1 contact + 2 standalone, **no `providers`** ⇒ one group per parent, each
   `state:'degraded'`, `parentRow:null`, fallback label; the standalone group `state:'ok'`; every task present — the
   view does not blank with the seam fully absent (TAS-32).
2. `by:'parent'` with a REAL registry where a `'project'` `ReadProvider` is registered (returns rows with `id`+`name`)
   and no `'contact'` provider ⇒ project groups `state:'ok'` with `parentRow` = the matching row; contact group
   `degraded` — **per-source degradation** (BR-11).
3. a registered provider that **ignores the `id` predicate** (returns its full list) ⇒ the group still resolves via
   the defensive `row.id` match (`parentRow` is the correct row, not `rows[0]`); a provider returning rows with
   **no** matching id ⇒ `degraded`.
4. a provider whose `list` **throws** for one call ⇒ that group `degraded`, others `ok`; the method resolves (never
   rejects) — failure isolated per source.
5. one `list` call per **distinct** parent (spy counts): 3 tasks under the same project ⇒ 1 call.
6. standalone group always present when standalone tasks exist, absent when none, always `state:'ok'`, keyed
   `'standalone'`, `parent:null`.
7. `by:'parent_type'` groups by FK type with **zero** provider calls (spy registry whose `get` throws ⇒ never invoked);
   `by:'status'` likewise; all `state:'ok'`.
8. soft-deleted tasks excluded from every grouping; determinism (two calls ⇒ equal structure, standalone last);
   malformed `grouping.by` ⇒ Zod parse error.
9. **(C5 / TK-9) structural** — import-scoped source check (the S6 C2 pattern): `service.ts` import lines reference no
   `projects`/`relationships`/`learning`/`courses` schema; the only cross-module touch is the type-only
   `foundation/views` import; all parent data flows through `providers`.

## Addendum — g2 code-review (post-implementation; §XXVIII: the spec never lags the code)

10 findings, all folded. One **clarified a silence** in this spec (not a reversal): **F1 — grain = top-level tasks.**
The spec never said whether sub-tasks appear; as built, a child with no module FK of its own was misrouted to the Inbox
as "standalone". Resolved from TK-3 / S2 ownership (sub-tasks are reachable via `getSubtasks`/`getRollup`; S5 recurrence
is likewise top-level only): `getAggregatedTasks` filters `parent_task_id == null` under every grouping (BR-TK-S7-8),
rather than inventing an FK-inheritance rule the contract never stated. Also folded: F6 registry `get` inside the
per-group try (a throwing registry degrades, never rejects); F2 within-group `sort_order`/`created_at` order (`findAll`
has no ORDER BY); F5 codepoint (not ICU) group order; F3 one `PARENT_MODULES` table for both the ≤1-parent guard and
`parentOf`; F7 `parentRow: object | null`; F8 parallel distinct-parent lookups; F4 milestone/course seeded in tests;
F9 `ZodError` asserted; F10 the structural gate now forbids the `db/schema` barrel + any other module's schema.
Gate additions: (4) a throwing-`get` registry, (6b) the sub-task grain, (8) explicit `sort_order` precedence.

## Out of scope

Provider registration + composition root (M2/P6, first-consumer-pull) · tasks-as-`ReadProvider` (S8/views rider) ·
`getTaskRollup`/`getFocusMinutes` (Projects' port, no TAS row) · the ② grouped-view render + row→label mapping (P6) ·
saved-view grouping / `views` config + the V1 anatomy (S8 / 007 pass) · the predicate-DSL grammar (build-time) ·
tags/notes (S8) · Journal/DueProvider (S9).
