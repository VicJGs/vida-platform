<!-- Forward spec — Tasks ① S8 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Grounded FIRST (the S6/S7 lesson): every operation below rides a shipped substrate call or a shipped precedent;
     the rerun-C8 scoping call (pin/reorder) is RESOLVED BY THE DOCS (Preferences-owned, ADR-007 §3.5), not absorbed
     or skipped; the one interpretation left (multi-tag = union) is labelled. -->

# PLAN S8 — Tags + Notes + Views (+ tasks as a `ReadProvider`)

> Slice-map S8. TAS-27 (tags via `entity_tags`), TAS-31 (task notes via `pages`), TAS-28 (saved views = `views`
> rows, cite-level — C8), TAS-30 (presets bound to `kind` — tasks provides type + data), + the S7-homed
> **tasks-as-`ReadProvider`** (XCU-07/08 — the other direction of the seam S7 consumed). Doc-resolved from the TAS
> rows + ADR-006 SP1/SP2 + ADR-007 V1/V2/V4 + §3.5 + xcut-views XCU-07/08/13/20/21 + xcut-spaces XCU-SP-05/06 +
> the built `foundation/{spaces,views}` + `services/notes`. Closes with the live-store Verification Gate.

## Grounding (what the docs + code FIX — No-Guessing)

**Pattern in use (§XXIV, 3+ implementations read):** `projects/service.ts:393-401` (thin tag wrappers over
`spaces.tagEntity`/`untagEntity`; find-or-create page via `notes.getPagesForEntity` + `createPage`),
`flashcards/service.ts:187-193` (tag write with the live-tag orphan guard), `knowledge/service.ts:184,518`
(read-only `entityTags` repo + `notes.ensureEntityNote('note', …, {title})`), `notes/service.ts:159-173,276-282`
(`ensureEntityNote` idempotent find-or-create; `getTagsForEntity` = raw soft-delete-filtered read), the S4/S7 tasks
precedents (optional deny-safe deps + fail-loud `TimerNotWiredError` `types.ts:230-235`; register-helper
`registerTasksTimer` `service.ts:92`). **Writes delegate to the owning substrate; junction READS are raw read-only
repos; seam registration is a `registerX(registry, svc)` helper; deps after S1 are optional + fail-loud.** Followed.

- **Tags — `'task'` is ALREADY registered.** `[FACT: db/schema/_registry.ts:27-31]` ENTITY_TYPES lists `'task'`
  ("a valid pages/entity_links/entity_tags target"); `[FACT: foundation/spaces/registry.ts:15-16]`
  `createTaggableTypeRegistry()` seeds from it. ⇒ **no `register()` code and no `registry` dep in tasks** — the
  seam-contract's `registry: TaggableTypeRegistry // 'task' registered` line was written before the S1 finding
  (S1 already noted "already in `_registry.ts`"). Projects takes `registry` only to build an association resolver
  for deliverable-source reads `[FACT: projects/types.ts:28-29; service.ts:61]` — tasks has no such read.
  [[spaces-junctions-split-read-write-tagentity-blind-inserts]]
- **Tags — the write is `spaces.tagEntity(tagId,'task',id)` / `untagEntity`** `[FACT: foundation/spaces/service.ts:
  44-45,128-155]` (idempotent BR-14; resolve-then-soft-delete BR-15; validates `entity_type` BR-2). It **blind-inserts
  an unresolved `tag_id`** (validates the type, never the tag) ⇒ the create path must guard
  (`flashcards/service.ts:189-192`: `tagsRepo.findById(tagId) == null ⇒ TagNotFound`; `findById` is soft-delete
  filtered `[FACT: db/repository.ts:356-363]` so a soft-deleted tag also refuses). The remove path stays unguarded.
- **Tags — the read is a raw read-only `entity_tags` repo** `[FACT: notes/service.ts:276-282 getTagsForEntity;
  knowledge/service.ts:184]` with the hand-appended `isNull(deleted_at)` ([[repository-findwhere-skips-softdelete-filter]]).
  No read API on `SpacesService` (it "owns the WRITE half").
- **Notes — `notes.ensureEntityNote(pageType, entityType, entityId, seed)`** `[FACT: notes/types.ts:68-73;
  service.ts:159-173]` is idempotent (returns the existing non-deleted page of that `pageType` for the entity, else
  creates with a deterministic seed). **`PAGE_TYPE` has a dedicated `'task_note'`** `[FACT: @vida/types/note.ts:23-30;
  schema/notes.ts:46 SQL CHECK]` — knowledge/books fall back to `'note'` only because they have no dedicated type.
  ⇒ tasks uses `'task_note'`. Seed = `{ title: task.title }` (the knowledge precedent; a seed is applied once at
  creation — status/kind would go stale, so they are not seeded).
- **Views — the primitive is `ViewsService`** `[FACT: foundation/views/service.ts:25-37]`: `createView · updateView ·
  deleteView · getView · cloneView`. **No `listViews`, no pin, no order.** `[FACT: schema/foundation/spaces.ts views
  table — columns: space_id · name · layout · filter · grouping · sort · deleted_at; NO is_pinned / sort_order]`.
  `[FACT: ADR-007:84-88 §3.5]` "a Task board is a `views` row with `entity_types=[task]`"; "**Nav placement /
  default-view preference lives in Preferences**". `[FACT: xcut-views XCU-20/XCU-21]` XCU-21 = "Preferences service
  (out of views scope)". `[FACT: grep services/preferences/types.ts — no view/pin surface]`. `[FACT: db/schema/
  preferences.ts:56-58]` `user_preferences.dashboard_layout`/`default_dashboard_view` are DASHBOARD-scoped, not
  per-view; `[FACT: :92-101]` `nav_preferences` = dock/mobile-nav only (no view id, pin, or order);
  `[FACT: :111]` `command_bar_history.is_pinned` is the ⌘K palette store. `[FACT: spaces BR-9]`
  `spaces.default_view_id` names a Space's opener (Space-scoped, one slot). ⇒ **`pinView`/`reorderViews` have NO
  store anywhere today** (FACT, closed across schema + services) — and their OWNER is Preferences (§Resolved below).
- **Views — tasks identity of a view** = `filter.entity_types` is **exactly** `['task']` (ADR-007 §3.5 "a Task board
  is a `views` row with `entity_types=[task]`" — the definition is exact; a mixed view such as the Global Calendar
  `['task','event']` is a first-class heterogeneous view `[FACT: ADR-007:66-72]`, NOT a task view, and tasks never
  edits it). There is no owning-module column. `listViews()` for tasks = the `views` rows whose parsed filter has
  exactly `['task']`.
- **ReadProvider** `[FACT: foundation/views/types.ts:24-27]` `{ entityType; list(filter: ViewFilter): Promise<unknown[]> }`;
  `[FACT: engine.ts:47-60]` the engine passes the WHOLE filter and catches throws; `[FACT: XCU-13; ADR-007:66-72]`
  "each type's read API applies the predicates it understands; a predicate a provider does not recognize is ignored
  for that type". `[FACT: XCU-07; views/CLAUDE.md]` "real providers register per-module at their build" — the
  register-helper pattern (`registerTasksTimer`, `registerProjectsJournal` `projects/journal.ts:47`).
- **Presets (TAS-30)** `[FACT: foundation/templates/CLAUDE.md]` "the preset primitive (XCU-12/13, tab = P6)" is a
  **FIRST-CONSUMER-PULL seam, NOT built**; `[FACT: parts/tasks.md TAS-30]` "Preset primitive HOME = Spaces (SP3/SP5);
  **Tasks provides the type + the data**. Ships editable presets (Today, Board, All-by-project)". ⇒ tasks ships the
  DATA (three `views` configs bound to `kind`) as exported constants; the primitive + tab are not tasks'.
- **Deps shape** — the seam-contract lists `spaces/notes/registry` as required; the BUILT pattern makes every post-S1
  dep optional + fail-loud (`sessions?` is listed required there too, built optional at S4 — no M1 composition root
  `[FACT: projects/types.ts:31]`). Follow the built pattern; the seam-contract is updated at currency (§XXIX).

## What is already built (the grounding floor)
- `SpacesService` (tag CRUD + `tagEntity`/`untagEntity`, AR-6) · `TaggableTypeRegistry` seeded with `'task'` ·
  `NotesService.ensureEntityNote` (+ `pages.type` CHECK incl. `task_note`) · `ViewsService` CRUD/clone + `views` table ·
  `ViewProviderRegistry` (EMPTY) + `ViewEngine.resolve` · tasks S1–S7 (`listTasks` soft-delete-filtered; `getTask`;
  the S7 top-level grain BR-TK-S7-8; `providers?` consumed).
- Zero `ReadProvider` registrations anywhere `[FACT: grep services/ — none]`; zero `ViewsService` consumers
  `[FACT: grep — none]` ⇒ **tasks is the FIRST consumer of both** (first-consumer-pull applies to any substrate gap).

## Scope (what's in ① vs deferred)
**In (net-new, all on the built floor):**
1. **Tags** — `tagTask(taskId, tagId)` · `untagTask(taskId, tagId)` · `getTaskTags(taskId)`.
2. **Notes** — `getTaskNote(taskId)` (find-or-create the `task_note` page).
3. **Views (cite-level, C8)** — `saveView(input)` (create, or REPLACE the config when `id` given) · `listViews()`
   (task views); **+ one read-only substrate addition `ViewsService.listViews()`** (first-consumer-pull — the S4
   `findOpenSessionForEntity` precedent; `ViewsService` already owns reads (`getView`); every XCU-01 contributor
   needs "list views", so it lands on the primitive, not as the first raw read of a foundation NON-junction table).
4. **Presets data (TAS-30)** — `TASK_VIEW_PRESETS` (Today · Board · All-by-project) as `SaveTaskViewInput` constants
   bound to `kind`; consumed by the seed pipeline (XCU-06 / db-10) and the ② preset tab. No primitive built.
   **+ a `kind` filter** on `ListTasksFilter`/`listTasks` (own-table, additive) so a `kind`-bound preset is
   expressible through the provider (otherwise the T4 binding is inert as a filter — g1 F6).
5. **tasks as a `ReadProvider`** — `createTasksReadProvider(svc)` + `registerTasksReadProvider(providers, svc)`.
6. Deps grow `spaces?` · `notes?` · `views?` (optional, fail-loud `TasksDepNotWiredError`; the shipped
   `TimerNotWiredError` is KEPT as-is — renaming a shipped error would be a seam change).

**Deferred — each traced to its homing doc, NOT manufactured:**
- **`pinView(id)` / `reorderViews(ids)`** → **Preferences-OWNED (doc-resolved C8, see §Resolved below)** — not a
  tasks ① op; recorded as a first-consumer-pull gap against the Preferences corpus.
- The full V1 anatomy (predicate-DSL grammar, cross-type resolution, per-layout required fields) → the dedicated
  ADR-007 pass `[FACT: C8; views/CLAUDE.md "build-time"]`. S8 stamps `entity_types=['task']` and passes
  `filter.predicates`/`grouping`/`sort` through OPAQUE (JSON TEXT, XCU-17) — no grammar authored. (Tag membership
  **incl. nested** is NOT grammar — ADR-007:57 fixes it — so S8 implements it; see the provider flow.)
- The preset PRIMITIVE + tab (XCU-12/13) → first-consumer-pull / P6 `[FACT: templates/CLAUDE.md]`; the seeding of
  the preset rows → XCU-06 seed pipeline (db-10, M1.4).
- The 12→7 layout mapping (TAS-29) → owed to the 007 pass `[FACT: rerun N2/C8]`.
- Provider REGISTRATION at a composition root (someone calling `registerTasksReadProvider`) → M2/P6
  `[FACT: projects/types.ts:31]` — same status as `registerTasksTimer`.
- `[E]` on `entity_tags`/`views.name` → M3 (BR-13 pass-through now).
- Tag/link unify⇄separate association surface (XCU-SP-27) → build-phase design pass; tasks exposes the raw rows.
- Non-note pages per task (`task_group_note`, attachments) → the ② manages via `NotesService` directly (the
  projects precedent `service.ts:382-384`); tasks owns ONE guiding page.

## Resolved by the docs — C8: `pinView` / `reorderViews` are Preferences-owned
Rerun C8 asked that this scoping be surfaced; the corpus answers it without a judgment call:
- **Origin.** `pinView`/`reorderViews` entered the tasks contract at the first documentation commit (`77723cf`)
  from Victor's resolved intake gap **G1**: "a view = a saved configuration of {…}, **named, reorderable, pinnable**,
  user-created. Ships with presets (Today, Board, All-by-project)" `[FACT: docs/intake/tasks.md:49-51]`. So "pin" and
  "reorder" are view-builder *nav placement* intents (which saved views show as tabs, in what order), not view
  CONFIG (filter × layout × grouping — the `views` row, V1).
- **Owner.** `[FACT: ADR-007:84-88 §3.5]` "**Nav placement / default-view preference lives in Preferences**
  (generalizing per-module visibility to per-Space), as established in ADR-006." `[FACT: information-architecture.md
  §6:128-131]` "Per-module visibility generalizes to **per-Space visibility, configured in Preferences** (ADR-006/007)."
  `[FACT: xcut-views XCU-21]` "Boundary note: the views service owns the view rows; **Preferences owns which opens
  where**" → candidate home "Preferences service (out of views scope)". `[FACT: views table — no pin/order column;
  preferences.ts:56-58/92-101/111 — no view-scoped pin/order column; parts/preferences.md — no PRE row]`.
- **Therefore:** tasks' ① view surface is `saveView` + `listViews` (the row half); `pinView`/`reorderViews` are a
  Preferences capability the tasks contract NAMED but does not OWN (the same shape as `surface_calendar` in S3 D1:
  a valid capability tasks consumes, not emits). Not a deferral tasks manufactures — ownership the ADR assigns.
  **Not built here; not built on `spaces.default_view_id`** (BR-9 is a Space's single opener, not a user's pinned
  tab set — a different semantic, and a `spaces` row tasks does not own); **no columns added to `views`** (§3.5:
  pref ≠ view row).
- **Recorded as:** (1) an amendment at currency of EVERY four-op line so no authoritative-looking copy survives:
  `delivery/seam-contract.md:66` + `delivery/slice-map.md:32` (→ the two row ops + the Preferences pointer) and
  `delivery/interpretation.md:35` + `backend-intent/parts/tasks.md:38` TAS-28 (→ "historical — pin/reorder resolved
  Preferences-owned, see PLAN-S8 §Resolved"); (2) a **first-consumer-pull gap filed against the Preferences corpus** — "per-view
  nav placement (pinned set + order), per-Space, consumed by the ② view-switcher (fe-tasks) — ADR-007 §3.5 / XCU-21",
  in the task file's homed-deferrals + `current-spec` Deferred (the pattern every prior slice used); the Preferences
  service pulls it when fe-tasks' view-switcher lands.

## Operations
```ts
// Tags (TAS-27) — writes delegate to SpacesService; the read is a raw read-only entity_tags repo
tagTask(taskId: string, tagId: string): Promise<EntityTagRow>   // TaskNotFoundError · TagNotFound (live-tag guard) · TasksDepNotWiredError('spaces')
untagTask(taskId: string, tagId: string): Promise<void>        // TaskNotFoundError · idempotent (absent ⇒ no-op, BR-15)
getTaskTags(taskId: string): Promise<EntityTagRow[]>           // live rows only; no dep needed (raw read)
// Notes (TAS-31)
getTaskNote(taskId: string): Promise<PageRow>                  // find-or-create the 'task_note' page; TaskNotFoundError · TasksDepNotWiredError('notes')
// Views (TAS-28, cite-level)
saveView(input: SaveTaskViewInput): Promise<ViewRow>           // id absent ⇒ createView; id present ⇒ REPLACE that task view's config (exactly ['task'], else TaskViewNotFoundError)
listViews(): Promise<ViewRow[]>                                // the views whose filter.entity_types is exactly ['task']; substrate order (created_at, id)
// Seam (XCU-07/08) — exported helpers, not methods
createTasksReadProvider(svc: TasksService): ReadProvider
registerTasksReadProvider(providers: ViewProviderRegistry, svc: TasksService): void
// Presets data (TAS-30)
export const TASK_VIEW_PRESETS: readonly TaskViewPreset[]
```
Substrate addition (first-consumer-pull): `ViewsService.listViews(): Promise<ViewRow[]>` — `repo.findAll()`
(soft-delete filtered), ordered by `created_at` then `id` (findAll has no ORDER BY — the S7 g2 F2 lesson).

## Types (net-new)
```ts
/** The tasks-side view input = the WHOLE config (the view-builder draft). `entity_types` is NOT accepted — tasks STAMPS
 *  `['task']` (ADR-007 §3.5: a task view IS a views row with entity_types=[task]); predicates/grouping/sort pass through
 *  opaque (the DSL is the 007 pass). With `id`, the config is REPLACED (see flow) — there is no partial-patch form. */
export interface SaveTaskViewInput {
  id?: string                      // present ⇒ replace that task view's config
  name: string
  layout: ViewLayout               // VIEW_LAYOUT (BR-10)
  space_id?: string | null         // create: NULL = global All-Tasks view (V2). update: OMITTED ⇒ ownership unchanged
  tags?: string[]                  // tag ids (filter.tags) — omitted ⇒ none
  predicates?: Record<string, unknown> // omitted ⇒ none
  grouping?: ViewGrouping          // omitted ⇒ null
  sort?: unknown                   // omitted ⇒ null
}
/** A shipped preset = a task view config bound to the `kind` discriminator (T4 — the preset does NOT own one).
 *  `kind` is BOTH the tab binding (which preset shows for which kind, TAS-30) AND, when non-null, the preset's
 *  `predicates.kind` (expressible through the provider via the new `kind` filter key). */
export interface TaskViewPreset { key: 'today' | 'board' | 'all_by_project'; kind: TaskKind | null; view: Omit<SaveTaskViewInput, 'id' | 'space_id'> }
/** S8 — `kind` filter key (own-table, additive): `ListTasksFilter.kind?: TaskKind` (validated by `TaskKindSchema`). */

export class TasksDepNotWiredError extends Error { constructor(dep: 'spaces' | 'notes' | 'views') }
export class TaskViewNotFoundError extends Error { constructor(viewId: string) } // absent, soft-deleted, or NOT a task view
```
`TagNotFound` is re-used from `foundation/spaces/types` (the flashcards precedent) — no tasks-local duplicate.

## Operation flow + invariants
- **`tagTask`:** `getTask` ⇒ `TaskNotFoundError`; `spaces` absent ⇒ `TasksDepNotWiredError('spaces')`;
  read-only `tagsRepo.findById(tagId)` null ⇒ `TagNotFound` (orphan guard — soft-deleted tags refuse too);
  `spaces.tagEntity(tagId,'task',taskId)` (idempotent: re-tag ⇒ same row; re-tag-after-untag ⇒ revived row).
- **`untagTask`:** `getTask` guard; `spaces.untagEntity` — absent junction ⇒ no-op; **no tag guard** (removing
  creates no orphan; a soft-deleted tag must stay cleanable).
- **`getTaskTags`:** raw `entityTagRepo.findWhere(and(entity_type='task', entity_id, isNull(deleted_at)))`; no
  task-exists guard needed (an unknown id ⇒ `[]` — a read, not a write); no dep.
- **`getTaskNote`:** `getTask` guard; `notes` absent ⇒ `TasksDepNotWiredError('notes')`;
  `notes.ensureEntityNote('task_note','task',taskId,{ title: task.title })` — idempotent (second call returns the
  same page id; a renamed task does NOT retitle the page — the seed is creation-only).
- **`saveView` (create):** validate via `SaveTaskViewSchema`; `views` absent ⇒ `TasksDepNotWiredError('views')`;
  `views.createView({ space_id, name, layout, filter: { entity_types:['task'], tags?, predicates? }, grouping, sort })`.
  `entity_types` is always exactly `['task']` on a task-authored view (stamped, never caller-supplied).
- **`saveView` (update, `id` given) = REPLACE the config (g1 F1/F2):** `views.getView(id)` → `ViewNotFound` ⇒
  `TaskViewNotFoundError`; parsed `filter.entity_types` must be **exactly** `['task']` (length 1) else
  `TaskViewNotFoundError` — a mixed view (`['task','page']`) is NOT a task view and tasks never rewrites it (ADR-007
  §3.3/§3.5 heterogeneous views are first-class; an "includes" guard would silently drop the other types because
  `filter` is ONE JSON column that `encodePatch` replaces whole `[FACT: views/service.ts:44]`). Then
  `views.updateView(id, { name, layout, filter: { entity_types:['task'], tags?, predicates? }, grouping ?? null,
  sort ?? null, ...(space_id !== undefined ? { space_id } : {}) })` — the CONFIG (name · layout · filter · grouping ·
  sort) is written in full from the input (omitted optional keys ⇒ cleared: no tags/predicates, grouping/sort null);
  `space_id` is OWNERSHIP, not config — changed only when given. Rationale: "save" = the view-builder writing its
  whole draft (business-rules.md:35 R5 "save fails → keep editing"); a partial-patch form has no caller in ①.
- **`listViews`:** `views.listViews()` filtered to rows whose `JSON.parse(filter)` (malformed ⇒ `{}` — the engine's
  own tolerant parse `engine.ts:27-34`) has `entity_types` **exactly** `['task']`; order as returned by the substrate
  (`created_at`, then `id` as the tiebreak).
- **`createTasksReadProvider(svc).list(filter)` (XCU-13 — honours what it understands, ignores the rest, never throws
  for a bad predicate):**
  1. **by-id SHORT-CIRCUIT:** `predicates.id` (string) ⇒ `[await svc.getTask(id)]` minus null, and RETURN — `tags`
     and the top-level grain do NOT apply (a sub-task IS returned by id; the by-id contract S7 relies on, BR-TK-S7-3,
     now honoured from the tasks side — one universal key).
  2. else the known `ListTasksFilter` keys are PICKED from `predicates` — `const PROVIDER_KEYS = ['status','priority',
     'project_id','parent_task_id','completed','due_before','kind'] as const satisfies readonly (keyof ListTasksFilter)[]`
     (a `const` tuple narrows `k` to the literal key union so `shape[k]` is typed per key; `noUncheckedIndexedAccess`
     is NOT enabled in `tsconfig.base.json` — preflight A2) — and validated **per key** via
     the INNER object schema: `ListTasksFilterSchema` is `z.object({…}).optional()` `[FACT: validators/task.ts:76-85]`
     and a `ZodOptional` exposes `.unwrap()`, not `.shape`, in zod 4.4.3 `[FACT: node_modules/.pnpm/zod@4.4.3/…/
     v4/classic/schemas.d.ts:600-602; core/package.json "zod": "^4.4.3"]` ⇒ refactor: export
     `ListTasksFilterFieldsSchema = z.object({…})` and define `ListTasksFilterSchema =
     ListTasksFilterFieldsSchema.optional()` (behaviour unchanged for `listTasks`); the provider uses
     `ListTasksFilterFieldsSchema.shape[k].safeParse(v)`; an invalid value drops that key (ignored, never a throw);
     unknown keys are ignored.
  3. **grain:** unless `predicates.parent_task_id` was given, `parent_task_id: null` is applied — top-level only,
     the same grain as `getAggregatedTasks` (BR-TK-S7-8; a sub-task is reachable via its parent, not a view row).
  4. `filter.tags` (non-empty) ⇒ **tag membership incl. nested** — the doc-FIXED semantic: `[FACT: ADR-007:57]`
     filter `tags (→ entity_tags, ADR-006, **incl. nested**)`; `[FACT: ADR-006:75-76]` "`parent_tag_id` gives a
     hierarchy (`#languages ⊃ #languages/spanish`) — nesting is how Spaces sub-group"; `[FACT: ADR-006:102]` a
     Space's contents are "everything carrying the root tag". Implementation: `expandTagIds(ids)` — one read of the
     live `tags` rows (`tagsRepo.findAll()`, soft-delete filtered), BFS over `parent_tag_id` with a `seen` set
     (cycle-safe even though BR-3 forbids cycles on write) ⇒ the requested ids ∪ all live descendants; then keep
     the tasks whose live `entity_tags` rows carry **any** of the expanded ids. Soft-deleted descendants are not
     expanded, and **the walk stops at a soft-deleted node** — a live grandchild beneath it is NOT reached (`a ⊃ a/x
     ⊃ a/x/y` with `a/x` soft-deleted ⇒ `a/x/y`'s tasks drop out of the `a` view; Spaces has no delete-reparent rule,
     so the cut is the honest reading); an unknown id expands to itself (matches nothing). **Input hardening
     (XCU-13 "honours what it understands"):** `filter.tags` arrives from opaque JSON — accept only
     `Array.isArray(t)` and keep only `string` members; anything else (e.g. `tags:'abc'`) is IGNORED, never iterated.
     **Membership read:** `entityTagRepo.findWhere(and(entity_type='task', isNull(deleted_at)))` once + a JS `Set`
     over the expanded ids (the `listTasks` JS-filter precedent) — NOT `inArray(tag_id, expanded)`, which would hit
     SQLite's bound-variable cap (999 on some wa-sqlite builds) on a wide hierarchy. **Multi-tag combinator** — the docs define a tag
     filter as MEMBERSHIP and fix only the single-root-tag case (a Space's contents); no doc states AND vs OR for a
     list ⇒ `[INTERPRETATION, the only one in this slice]`: a list of memberships is their **union** (the contents of
     several Spaces); an intersection combinator, if wanted, is a predicate for the 007 DSL pass. Not grammar: the
     hierarchy walk is ADR-007's own definition of `tags`, so it is implemented, not deferred.
  5. returns `TaskRow[]` (opaque to the engine — `unknown[]`); soft-deleted excluded (via `listTasks`).
- **`registerTasksReadProvider(providers, svc)`** ⇒ `providers.register(createTasksReadProvider(svc))` — keyed
  `'task'`; re-registration replaces (registry semantics `provider-registry.ts:21`).
- **Presets (data only, no I/O):** `TASK_VIEW_PRESETS` = three configs bound per T4 (`kind:null` = all kinds; a
  `kind`-bound preset is the Duties/obligation case the ② can add from the same shape — realizable because `kind`
  is now a provider-honoured filter key, g1 F6):
  `today` ⇒ `layout:'list'`, `predicates:{ completed:false }` (the "due today" literal is a per-day value the ②
  supplies — `due_before` is a date, not a constant; the preset is the open-tasks list the ② scopes to the day);
  `board` ⇒ `layout:'board'`, `predicates:{ completed:false }`, `grouping:{ field:'status' }`;
  `all_by_project` ⇒ `layout:'list'`, `grouping:{ field:'project_id' }`. Each is a valid `SaveTaskViewInput`
  (gate 9 proves it against the live primitive + engine).
- **No cross-module table.** The only tables tasks reads raw are the foundation `entity_tags` junction + the `tags`
  row (the live-tag guard) — the notes/knowledge/flashcards precedent; `views` is read through its service. The S7
  structural gate (`/db\/schema\/(tasks|foundation\/)/` `[FACT: __tests__/service.test.ts:1095-1105]`) ALREADY
  admits `db/schema/foundation/spaces` — no widening; gate 10 adds the positive assertion.

## Deps / validators
- `spaces?: SpacesService` · `notes?: NotesService` · `views?: ViewsService` — type-only imports
  (`../../foundation/spaces`, `../notes`, `../../foundation/views`). Optional + fail-loud (the S4 shape).
- `SaveTaskViewSchema` (`validators/task.ts`): `id?: uuid-ish string · name: min 1 · layout: ViewLayoutSchema ·
  space_id?: string|null · tags?: string[] · predicates?: z.record(z.string(), z.unknown()) [zod v4 takes TWO args] ·
  grouping?: {field?: string} · sort?: unknown`. Authored as **`z.strictObject({…})`** (zod 4.4.3: `.strict()` is
  `@deprecated` in favour of `z.strictObject` — preflight A3) so `entity_types` is REJECTED if present — the stamp is
  not overridable.
- `ListTasksFilterFieldsSchema` += `kind: TaskKindSchema.optional()`; `ListTasksFilter` += `kind?: TaskKind`;
  `listTasks` += the `kind` predicate (own-table, additive, non-breaking).
- **No `@vida/types` change, no migration, no schema change, no new dep.** One substrate addition
  (`ViewsService.listViews` + its spaces test) **with its §XXIX currency in the SAME commit**: `docs/core/spaces/
  current-spec.md:30` (the `ViewsService` line) + its BR table + `:50` test count + `packages/core/src/foundation/
  views/CLAUDE.md`; and `packages/core/src/services/tasks/CLAUDE.md` Status (stale through S7 — rewritten to S1–S8).

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, REAL spaces/notes/views services + registries)
Harness: `createTaggableTypeRegistry()` · `createSpacesService(db, dev, registry)` · `createBacklinkResolver(db, dev)` ·
`createNotesService({db, deviceId, spaces, backlinks, registry})` · `createViewsService(db, dev)` ·
`createViewProviderRegistry()` + `createViewEngine(registry)` (the notes/spaces test wiring).
1. **tagTask** happy path ⇒ an `entity_tags` row `{tag_id, entity_type:'task', entity_id}`; `getTaskTags` returns it;
   re-tag ⇒ same row id (idempotent); untag ⇒ `getTaskTags` empty; re-tag after untag ⇒ the row REVIVED (same id);
   `getTaskTags(unknownId)` ⇒ `[]` (a read, no throw).
2. tagTask with an unknown tag id ⇒ `TagNotFound`, **no** `entity_tags` row (orphan guard); with a soft-deleted tag ⇒
   `TagNotFound`; unknown task ⇒ `TaskNotFoundError`; a **soft-deleted task** ⇒ `TaskNotFoundError`; `spaces` absent ⇒
   `TasksDepNotWiredError('spaces')`; `untagTask` on a never-tagged pair ⇒ resolves (no-op); **cleanable:** tag →
   soft-delete the TAG → `untagTask` still succeeds (junction soft-deleted; no guard on remove).
3. **getTaskNote** ⇒ a `pages` row `type:'task_note'`, `entity_type:'task'`, `entity_id`, content seeded with the
   title heading; second call ⇒ SAME page id; unknown task ⇒ `TaskNotFoundError`; `notes` absent ⇒ not-wired.
4. **saveView** create ⇒ a `views` row with `filter` JSON `{entity_types:['task'], …}` (stamped), `space_id` null by
   default; a caller-supplied `entity_types` ⇒ Zod rejection; bad `layout` ⇒ Zod rejection; `views` absent ⇒ not-wired.
5. saveView update (`id`) = REPLACE: a view saved with `{tags:[a], predicates:{status:'open'}, grouping:{field:'status'}}`
   then saved again as `{id, name:'renamed', layout:'board'}` ⇒ name/layout applied, `entity_types` still `['task']`,
   `tags`/`predicates` CLEARED, `grouping`/`sort` null, `space_id` UNCHANGED (omitted); passing `space_id` re-homes it;
   updating a NON-task view (`['page']`) ⇒ `TaskViewNotFoundError`; updating a MIXED view (`['task','page']`, seeded
   via `views.createView`) ⇒ `TaskViewNotFoundError` and the row is byte-for-byte unchanged (g1 F1); unknown id ⇒
   `TaskViewNotFoundError`.
6. **listViews** ⇒ only EXACT task views (a `['page']` view, a MIXED `['task','page']` view, and a soft-deleted task
   view excluded); a view with malformed filter JSON excluded (tolerant parse); **order:** two views created under a
   PINNED clock (`vi.useFakeTimers` + `vi.setSystemTime` around both `createView` calls so `created_at` is equal) ⇒
   ordered by `id` (the UUIDv7 tiebreak — `findAll` has no ORDER BY `[FACT: repository.ts:369-375]`), stable
   across two calls. + **substrate:** `ViewsService.listViews()` returns live rows only, `created_at` then `id` order
   (spaces test).
7. **ReadProvider — end to end through the REAL engine:** register via `registerTasksReadProvider`; a saved task view
   with `predicates:{status:'completed'}` resolved by `ViewEngine.resolve(view)` ⇒ `state:'success'`, rows = the
   completed top-level tasks only, `degraded:[]`; a view selecting `['task','page']` ⇒ `state:'success'` (a MISSING
   provider is *degraded*, not *error* `[FACT: engine.ts:49-51,77]`), task rows present, `degraded` = exactly one
   entry naming `page` (BR-11) — the seam works in both directions (S7 consumed; S8 provides).
8. provider predicates: `{id}` ⇒ exactly that task (or `[]`); `{id:<subtask>}` ⇒ that sub-task row (by-id
   short-circuits the grain); an unknown key ⇒ ignored; an INVALID known value (`status:'bogus'`) ⇒ that key dropped,
   no throw; default grain excludes sub-tasks; `{parent_task_id:<p>}` ⇒ that parent's sub-tasks; `{kind:'obligation'}`
   ⇒ obligations only; `tags:[a,b]` ⇒ union (a task tagged `a` only IS returned); **nested (ADR-007:57):** with
   `a ⊃ a/x ⊃ a/x/y`, a task tagged only `a/x/y` IS returned by `tags:[a]` and by `tags:[a/x]`, and a task tagged only
   `a` is NOT returned by `tags:[a/x]` (membership flows UP the hierarchy, never down); a soft-deleted child tag is
   not expanded (its tasks drop out of the parent view); an **intermediate** soft-deleted `a/x` cuts the subtree
   (a live `a/x/y`-only task is NOT returned by `tags:[a]`); an unknown tag id ⇒ `[]`; a malformed `tags:'abc'` ⇒
   ignored (all top-level tasks returned, no throw); soft-deleted tasks excluded;
   `grouping:{field:'status'}` on the view ⇒ the engine groups the provider's rows (BR-10 — the rows carry the field).
9. **Presets:** every `TASK_VIEW_PRESETS[i].view` passes `SaveTaskViewSchema`; saving each through `saveView` ⇒ 3
   valid rows the engine resolves with `degraded:[]` (data is well-formed against the live primitive).
10. **Structural (C5/TK-9):** the existing import-scoped test passes unchanged (`db/schema/foundation/spaces` is
    already admitted) + the positive assertion: `service.ts` imports `db/schema/foundation/spaces` and
    `foundation/{spaces,views}` / `services/notes` type-only, and still no `services/{projects,relationships,
    learning-education,languages}` and no `db/schema` barrel.
11. Full tasks suite green (76 + S8) · tsc 0 · eslint 0 · full `@vida/core` suite ALONE at the end.

## Preflight addendum (gate 2 — `/preflight` PASSED, 0 rule gaps; folded before Approval 2)
Independent preflight + ADR-006/007/009/002 check: every S8 choice CONFORMS (table in the gate record). Two
implementability corrections are binding on the build, the rest are implementer facts:
- **A1 (binding) — `PageRow` is imported in `types.ts` ONLY.** The structural gate reads `service.ts` import lines
  and admits only `db/schema/(tasks|foundation/)`; `import type { PageRow } from '../../db/schema/notes'` in
  `service.ts` would fail it, and the notes barrel does not re-export `PageRow`. `types.ts` (ungated; already imports
  `db/schema/foundation/sessions`) carries `getTaskNote(): Promise<PageRow>`; `service.ts` lets the return type infer
  from `notes.ensureEntityNote(...)` (no `explicit-function-return-type` rule is active). The notes barrel is untouched.
- **A3 (binding) — zod 4.4.3 shapes:** `z.strictObject({...})` (not the deprecated `.strict()`); `z.record(z.string(),
  z.unknown())` (two args); `ZodOptional.unwrap()` exists, `.shape` does not → the `ListTasksFilterFieldsSchema` split.
- **A2** — `noUncheckedIndexedAccess` is OFF; `noUnusedLocals`/`noUnusedParameters` are ON (no dead helpers);
  `isolatedModules` ON (type-only names use `import type`). ESLint = recommended + `no-unused-vars` (`^_` args) +
  `no-explicit-any: warn`; the `and(...)!` assertion is already used in this file (`:312,368`).
- **A4** — `ListTasksFilterSchema`'s sole importer is `services/tasks/service.ts` (the split is safe);
  `CalendarDateSchema` is `.nullable().optional()` (per-key `safeParse` fine).
- **A5** — `ensureEntityNote` writes `{type, entity_type, entity_id, content}` and leaves `pages.title` NULL (the seed
  title becomes the content H1; `title` is nullable, `type` NN-defaulted). Gate 3 asserts the H1 in `content`, not
  `title`. `createPageSchema.type` validates against `PAGE_TYPE` (incl. `task_note`); `assertRegistered('task')` passes.
- **A6** — gate 6 fake clock: add `vi` to the vitest import; `vi.useFakeTimers({ toFake: ['Date'] })` +
  `vi.setSystemTime(...)` around ONLY the two `createView` calls, then `vi.useRealTimers()` BEFORE the `listViews()`
  assertions and any later writes in that test (the frozen clock also stamps `created_at`/`updated_at` + the
  sync-queue rows — g2 NIT), plus `finally` as the safety net (no `setTimeout` in repository/adapter/vault — safe);
  `uuidv7()` = 48-bit ms prefix + random tail ⇒ equal-ms ids are distinct and sort deterministically.
- **A7** — `repo.update` on a missing row throws a generic `Error('Row not found: …')` ⇒ the `views.getView(id)` guard
  (`ViewNotFound` → `TaskViewNotFoundError`) MUST precede `updateView` (it is required, not defensive).
- **A9/A10** — type-only imports from the barrels (`../../foundation/spaces` incl. the VALUE import `TagNotFound`;
  `../notes`; `../../foundation/views`); `ViewRow`/`TagRow`/`EntityTagRow` + the `tags`/`entityTags` tables from
  `../../db/schema/foundation/spaces`. **Barrel collision: none** — every new export name grepped free across
  `packages/core/src` + `packages/types/src`; `expandTagIds`/`PROVIDER_KEYS` stay module-private.
- **A11** — all 13 currency paths exist; `docs/core/spaces/current-spec.md:50` test count bumps with the substrate
  test; `services/tasks/CLAUDE.md` Status is stale through S7 (S8 currency rewrites the whole line).
- **Harness (verbatim):** `setupWithSubstrates()` = the existing `setup()` + `createTaggableTypeRegistry()` ·
  `createSpacesService(db,'test-device',registry)` · `createBacklinkResolver(db,'test-device')` (from
  `'../../search/backlink-resolver'`) · `createNotesService({db, deviceId:'test-device', spaces, backlinks, registry})` ·
  `createViewsService(db,'test-device')` · `createViewProviderRegistry()` + `createViewEngine(providers)`; migrations
  001…033 already create `tags/entity_tags/views` (003) + `pages` (033) — no new migration. Substrate test home:
  `foundation/spaces/__tests__/spaces.test.ts` next to the `cloneView (XCU-05)` describe.
- **Build-time refinement (§XXVIII, signature only — no decision changed):** the provider helpers take
  `{ svc, db, deviceId }` (not bare `svc`) — `createTasksReadProvider(deps)` / `registerTasksReadProvider(providers,
  deps)` — because the `tags` membership read (nested expansion + the `entity_tags` scan) is a raw foundation-junction
  read that the public `TasksService` surface does not expose; this is exactly the `registerTasksTimer(deps)` shape
  (`service.ts:92`). `grouping?: ViewGrouping | null` widened on the substrate `CreateViewInput` (type-accuracy: the
  runtime already treats `== null` as a NULL write) so REPLACE can clear it.
- **Precedents to copy:** `projects/service.ts:393-401` (tag wrappers) · `:384-392` (find-or-create page) ·
  `flashcards/service.ts:187-193` (orphan guard) · `notes/service.ts:276-286` (raw tag read) · `registerTasksTimer`
  `service.ts:92-107` (module-level `export function` shape for the provider helpers).

## Addendum — g2 code review (post-implementation; §XXVIII: the spec never lags the code)
Independent g2: **REVISE → folded → re-verified.** The code matched the spec; 1 BLOCKING + 5 NITs, all folded:
- **F1 (blocking)** gate-9 asserted a real-clock `listViews` ORDER for three presets saved in the same ms (random id
  tiebreak ⇒ flaky) → set equality (the spec's gate 9 never asked for order).
- **F2 — a soft-deleted REQUESTED tag now matches nothing** (semantic sharpened, BR-TK-S8-9): `expandTagIds` expands
  only LIVE requested ids (`liveIds` set) — a view saved on `#x` after `#x` is deleted returns `[]`; previously the dead
  root still expanded to its live children and its stale `entity_tags` rows (not cascaded by `deleteTag`) resurrected
  membership. Gate 8b pins `list({tags:[ax]})` ⇒ `[]` after `deleteTag(ax)`.
- **F3** the docblock/BR said "BFS" for a `pop()` worklist → "worklist walk (stack)"; the `as string` cast replaced by
  an `undefined` guard.
- **F4 — a present-but-non-string `predicates.id` ⇒ `[]`** (BR-TK-S8-8): an identity predicate that can match nothing
  returns nothing, never falls through to "all top-level tasks". Gate 8 pins `{id: 5}` ⇒ `[]`.
- **F5** gate-8 grouping assertion strengthened: `top` completed first ⇒ keys `['completed','not_started']` + the
  completed bucket holds exactly `top`.
- **F6** currency gaps beyond the list: `docs/core/spaces/current-spec.md` registry line (first registrant: tasks),
  the union INTERPRETATION recorded in `delivery/interpretation.md`, the Preferences first-consumer-pull gap in the task
  file's homed deferrals.
Verified sound by g2 (not re-litigated): guard orders, REPLACE semantics + `encodePatch` nulls, `parseFilter` edge
inputs, by-id short-circuit, per-key validation, no import cycle, no barrel collision, both structural gates, test 6's
fake clock.

## Out of scope
`pinView`/`reorderViews` (Preferences-owned — ADR-007 §3.5 / IA §6 / XCU-21; filed as a Preferences first-consumer
pull) · a multi-tag INTERSECTION combinator (007 DSL pass — a predicate, not membership) · a partial-patch
`updateView` form (no ① caller) · the predicate-DSL
grammar + per-layout field declarations + 12→7 mapping (007 pass) · the preset PRIMITIVE + tab (first-consumer-pull /
P6) · preset ROW seeding (XCU-06 / db-10) · composition-root registration (M2/P6) · `[E]` (M3) · the ② view-builder,
tag picker, note page render (P6) · Journal/DueProvider (S9).
