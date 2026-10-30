# Spec: component:ar-6-spaces

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: implemented (2026-07-29 — 3 critiques clean, typecheck 10/10, tests green) <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-07-28-ar-6-spaces (§7).

<!-- FORWARD spec — §1–§4 describe; §5 is the executable build prompt citing §1–§4. -->

## 1. Identity

The **Spaces substrate** (AR-6, LIF-77) — M1.0 `foundation/` connective base. Homes:
`core/src/foundation/{spaces,views}`. [FACT: m1.0-delivery-plan.md:121]

**Scope = ADR-006 (SP1–SP7) + ADR-007 (V1–V5)** — the capability-framework §3 mechanical presence
predicates ARE the buildable unit (not a grain dial). [FACT: capability-framework.md:100-116, §6]

Intent: the connective tissue every M1.1+ module inherits — universal tagging, cross-entity typed links,
lightweight user-assembled Spaces, and saved Views — built as generic primitives, not per-feature Hub
pages. [FACT: ADR-006 §1; ADR-007 §1; docs/core/spaces/README.md]

**What it is NOT** (each reconciles against the roadmap AR-6 row, which reads _"Spaces + `entity_tags`/`entity_links` + backlinks + saved Views"_ with home `foundation/{spaces,views,effects}` [FACT: m1.0-delivery-plan.md:121] — that row conflates AR-6's and AR-7's homes, the same class of error §5.1.1 was correcting):

- NOT the effect-firing rail. Despite `:121` listing `effects` under AR-6's home, `foundation/effects` (R1/R2)
  is **AR-7** [FACT: capability-framework §2; m1.0-delivery-plan:122 lists `effects` under AR-7 too]. **No SP/V
  predicate references R1/R2** (verified — SP1–SP7/V1–V5 contain zero effect-rail tokens), so building it here
  would be an over-build. AR-6 does **not** author `foundation/effects`.
- NOT the capability-block registry / `block_instances` — ADR-008 CB1–CB6 = **AR-7**. SP6 ships only the
  `space_enabled_blocks` junction (refs into AR-7's registry). [FACT: capability-framework.md:105,118-127]
- **"backlinks" in the `:121` row = the `entity_links` TABLE + its backlink-read index, which AR-6 SHIPS**
  (§3.1 table 3 + the `(entity_type, entity_id)` index — "what links point at this entity"). The backlink
  _resolver service_ that reads it is **AR-8** [FACT: m1.0-delivery-plan §5.1.1:207 — resolver reads
  `entity_links` "owned by AR-6"]. Table-and-index here; resolver there — not an under-build.
- NOT the predicate-DSL grammar, per-layout visual specs, or the unify⇄separate resolution _surface_ —
  all build-time [FACT: ADR-006 §"What this decision does NOT do":129; ADR-007 §"does NOT":94].
- NOT the `page_tags`→`entity_tags` migration — N&P's build (M1.1); no live floor exists to migrate. [INTERP: v2 floor has no `pages`/`page_tags`; schema/index.ts exports only sync-queue + sessions]

### 1.1 Gathered source set (delivery-plan §2.1 `[B]` DoD — routed, not derived)

Every table/enum/shape below traces to one of these; none derived:

- **Routing map:** `docs/README.md` (Spaces = CORE/foundation, docs = "ADR set + core docs, not 5 aspect docs" :107) → `docs/core/spaces/README.md` (front door).
- **Scope decision (mechanical):** `docs/specs/foundation/capability-framework.md` §2 rails + §3 SP1–SP7 / V1–V5 (:100-116).
- **ADRs:** ADR-006 (§3.1–3.5 + §"does NOT"), ADR-007 (§3.1–3.5 + §"does NOT"); ADR-008 CB1–6 (boundary → AR-7).
- **Architecture (the decided DDL/shapes):** `cross-module-integration.md §3.2:137` (`entity_links(page_id, entity_type, entity_id, context)`); `security-model.md:473` (per-field E/P: only `context` = E); `performance-strategy.md:64` (index shapes).
- **Owed-tables ledger (authoritative for the DDL):** `ADR-002 §5.20` — `entity_tags` :3765, `spaces` :3766, `space_enabled_blocks` :3767, `views` :3768; AMEND `parent_tag_id on tags` :3792, open `entity_links.entity_type` :3791; RETIRE `page_tags` :3750 / `task_views` :3751. **AR-7/later:** `block_instances` :3770, `capability_grants` :3772, capability-registry :3769.
- **v1 As-is floor:** `ADR-002:1399` (`tags` v1 DDL), `:1365` (`entity_links` v1 DDL).
- **Live code floor:** `schema/foundation/sessions.ts`, `migration 002`, `_shared.ts`, `_registry.ts` (`ENTITY_TYPES` incl. `space`/`tag`), `repository.ts`, `runner.ts`.

## 2. Business Rules

Each maps a framework capability predicate. Invariants (must/never), validation, terminal states, fail-loud.

- **BR-1 (SP1) Universal tagging.** The tag primitive is `entity_tags(tag_id, entity_type, entity_id)`. No
  page-only `tagPage`/`getPagesByTag` path; no per-module tag table. [FACT: capability-framework:100; ADR-006 §3.2]
- **BR-2 (SP2) Open taggable-type registry.** `entity_type` values come from the ONE open registry
  (`db/schema/_registry.ts` `ENTITY_TYPES` + a runtime register API); a new type becomes taggable/linkable by
  **registering**, never a schema edit. `entity_type` columns are **plain `text()` with NO SQL CHECK**,
  validated app-layer (`isEntityType`) — the live precedent (`session_attachments.entity_type`). The SAME
  registry governs both `entity_tags` and `entity_links`. [FACT: capability-framework:101; ADR-006 §3.2;
  schema/_registry.ts; migration 002 `session_attachments` no-CHECK]
- **BR-3 (SP3) Nestable tags.** A `tags` row carries `parent_tag_id` (self-ref, `#a/b`) + `name [E]`,
  `color`, `icon`, `description [E]`. **v1's global `UNIQUE(name)` is RETIRED** [FACT: ADR-002:1401 v1
  `tags.name NOT NULL UNIQUE`]: (a) nesting means two Spaces may each own a child `#spanish`, so global-unique
  is wrong; (b) `name` is `[E]` — a SQL `UNIQUE` on ciphertext is meaningless (per-nonce ciphertext differs),
  so `[E]` fields **never carry SQL UNIQUE** (AR-5 precedent). Uniqueness, if desired, is `(parent_tag_id,
name)` enforced **app-layer** in `SpacesService`. A `parent_tag_id` chain that reaches itself is rejected
  (`InvalidTagNesting`, fail-loud). [FACT: capability-framework:102; ADR-006 §3.2]
- **BR-4 (SP4) Tags vs links — distinct, never merged.** `entity_tags` (grouping) and `entity_links` (typed
  reference) are two tables that never merge; both draw `entity_type` from the one registry (BR-2). [FACT:
  capability-framework:103; ADR-006 §3.3]
- **BR-5 (SP5) `spaces` first-class entity.** A Space is a `spaces` row: `root_tag_id` (→ tag spine),
  `name [E]`, `icon`, `default_view_id` (→ views, nullable), `parent_space_id` (self-ref, nullable). Not
  "just a tag"; nav-addressable + nestable. [FACT: capability-framework:104; ADR-006 §3.4]
- **BR-6 (SP6) `enabled_blocks` palette.** A Space's offered-capability set is a **row-based junction**
  (`space_enabled_blocks`) of capability-**definition** refs — NEVER a projection over placed instances,
  and distinct from `block_instances` (AR-7). AR-6 ships the junction; the def refs point at AR-7's
  registry (no FK — not built yet). [FACT: capability-framework:105; ADR-006 §3.4]
- **BR-7 (SP7) Spaces-tier sync + encryption.** R3 + R4 on every Spaces-tier table (`tags`, `entity_tags`,
  `entity_links`, `spaces`, `space_enabled_blocks`, `views`): each carries `_sync_*` + `deleted_at`;
  `name`/`description`/`context` free-text are `[E]`. [FACT: capability-framework:106, §2 R3/R4; ADR-006 §3.5]
- **BR-8 (V1) `views` first-class.** A saved surface is a `views` row (filter × layout × grouping), not a
  component; `@vida/ui` renderers are selectable, not the unit. [FACT: capability-framework:112; ADR-007 §3.1]
- **BR-9 (V2) View ownership.** `views.space_id` nullable — NULL = global/reusable, set → `spaces.id`
  (Space-owned); `spaces.default_view_id` names the opener. [FACT: capability-framework:113; ADR-007 §3.2]
- **BR-10 (V3) Anatomy + cross-type resolution.** filter = `{tags, entity_types, predicates}` (JSON TEXT);
  layout ∈ `VIEW_LAYOUT` = `list·table·board·gallery·calendar·graph·timeline` (FIXED → SQL CHECK);
  grouping/sort JSON TEXT. Heterogeneous views: each type's provider applies the predicates it understands;
  an unrecognized predicate is ignored for that type, the type is **never silently dropped**; group-by a
  field a type lacks → that type's rows go to an **"ungrouped" bucket**. A layout whose required field a
  type lacks → layout **unavailable/degraded (declared state), never a crash**. [FACT: capability-framework:114; ADR-007 §3.3]
- **BR-11 (V4/R7) Provider fan-out (INT-1).** A cross-module view fans its filter out to each entity type's
  **documented read provider** (`ReadProvider.list(filter)`); NEVER a direct cross-module table read or a
  materialized index. Providers register per-module (ships with zero registered). [FACT: capability-framework:115, §2 R7; ADR-007 §3.4]
- **BR-12 (V5/R5) View sync/encryption + terminal states.** R4 on `views`; `views.name` `[E]`; user-literal
  filter values `[E]` (tag/entity IDs are refs, not secrets). Every view resolution declares
  `loading · empty · error · success` (degrade, never crash). [FACT: capability-framework:116, §2 R5; ADR-007 §3.3]

**BR-13 (M1.0 encryption stance) — pass-through seam, NOT wired.** In M1.0 every AR-6 table registers with the
DB-6 Repository over an **EMPTY `[E]` field set** (pass-through; lazy vault key) — the DB-6 / ADR-017:20 decision.
The `[E]` marks in §3.1/BR-7/BR-12 are the **M3 target** (documented, not wired now); no field encryption is
implemented in AR-6. `views.filter` is stored plaintext in M1.0; its granular user-literal `[E]` split is an M3
concern. [FACT: ADR-017:20 pass-through mechanism; DB-6 repository seam = empty [E] set + lazy vault key; AR-5 precedent]

**BR-14 (junction idempotency) — critique MF-1.** `tagEntity`/`createLink`/`addEnabledBlock` are idempotent:
`findWhere` the business UNIQUE key before insert (AR-5 `registry.ts:101-105` precedent); existing row → no-op /
return it. A duplicate must NEVER surface as a raw SQLite UNIQUE error (the routine "tag twice" action). [FACT:
repository.ts:315-338 `create()` blind-inserts a fresh id; §3.1 UNIQUE keys :115/:116/:118]

**BR-15 (junction soft-delete by business key) — critique MF-2.** `untagEntity`/`removeLink`/`removeEnabledBlock`
resolve the row via `findWhere(business key)` then `repo.delete(id, {softDelete:true})` — these tables are syncable
soft-delete (`deleted_at`), so an untag propagates as `operation:'update'`, never a hard delete; row not found →
no-op. [FACT: repository.ts:198,444-452 delete-by-id + softDelete; §3.1:111 deleted_at]

**Fail-loud.** Registry/service methods throw typed errors (never silent partial): `UnknownEntityType`
(BR-2), `InvalidTagNesting` (cycle in parent_tag_id, BR-3), `SpaceNotFound`, `ViewNotFound`,
`UnknownViewLayout` (BR-10), `NoProviderForEntityType` (BR-11 — surfaced as a per-type degraded state in
resolution, thrown only on a direct provider lookup). Junction duplicates/misses are idempotent no-ops (BR-14/BR-15), not throws.

## 3. Contract

### 3.1 Tables (DDL shape — hand-SQL migration 003; Drizzle query mirror in schema)

All compose `...baseColumns` (id + created*at + updated_at + 6 `\_sync*\*`) + `deleted_at`. entity_type = plain
`text()`NO CHECK (BR-2). JSON = plain`text()` (app stringifies). No cross-table FK (plain TEXT + index).

1. **`tags`** — `name [E]` · `color` · `icon` · `description [E]` · `parent_tag_id` (nullable, self-ref, no FK). idx on `parent_tag_id`. [FACT: v1 shape ADR-002:1399 (id/name[E]/color); ADR-006 §3.2 metadata adds icon/description[E]; §5.20:3792 AMEND +parent_tag_id; UNIQUE(name) retired per BR-3]
2. **`entity_tags`** — `tag_id` · `entity_type` (open) · `entity_id`. `UNIQUE(tag_id, entity_type, entity_id)`; idx on `(entity_type, entity_id)`. [FACT: ADR-002 §5.20:3765 `entity_tags(tag_id, entity_type, entity_id)`; ADR-006 §3.2]
3. **`entity_links`** — `page_id` (plain TEXT, **no FK** per live convention) · `entity_type` (open registry) · `entity_id` · `context [E]`. `UNIQUE(page_id, entity_type, entity_id)`; idx `(entity_type, entity_id)` (the backlink read path AR-8 consumes). [FACT: cross-module-integration.md §3.2:137 `entity_links (page_id, entity_type, entity_id, context)`; security-model.md:473 `context`=E, `page_id`/`entity_type`/`entity_id`=P; ADR-002:1365 v1 DDL, §5.20:3791 open CHECK]
4. **`spaces`** — `root_tag_id` · `name [E]` · `icon` · `default_view_id` (nullable) · `parent_space_id` (nullable, self-ref). idx on `parent_space_id`. [FACT: ADR-006 §3.4 (column set); §5.20:3766 "lightweight first-class entity, membership spine = root tag"]
5. **`space_enabled_blocks`** — `space_id` · `capability_def_id` (open TEXT ref → AR-7 registry, no FK). `UNIQUE(space_id, capability_def_id)`; idx on `space_id`. [FACT: ADR-002 §5.20:3767 `space_enabled_blocks (junction)` "Space↔capability-definition palette; row-based; storage strategy → F10"; ADR-006 §3.4]
6. **`views`** — `space_id` (nullable) · `name [E]` · `layout` (`enumText VIEW_LAYOUT` → SQL CHECK) · `filter` (JSON TEXT, `[E]` user-literals) · `grouping` (JSON TEXT) · `sort` (JSON TEXT). idx on `space_id`. [FACT: ADR-002 §5.20:3768 `views (filter × layout × grouping; space_id nullable)`; ADR-007 §3.3]

### 3.2 Types placement — per the BUILT-substrate convention (AR-5 precedent + ADR-016)

A built DB-layer substrate places types exactly as AR-5 did — NOT as hand-written entity interfaces in `@vida/types`:

- **`@vida/types` = enum vocab only** (`@vida/types/CLAUDE.md`: "footprint deliberately tiny … the canonical enum
  tuples"). AR-6's only enum: `VIEW_LAYOUT = ['list','table','board','gallery','calendar','graph','timeline'] as const`
  → `ViewLayout` union → `z.enum` (DB-9 C2). `entity_type`/`link` are the OPEN registry (no enum); `entity_links`
  has no `link_type` column. [FACT: AR-5 `session.ts` = 5 enums, 0 interfaces; `@vida/types/CLAUDE.md`]
- **Row types = schema `$inferSelect`** exported from `db/schema/foundation/spaces.ts` (`TagRow`, `EntityTagRow`,
  `EntityLinkRow`, `SpaceRow`, `SpaceEnabledBlockRow`, `ViewRow`) — single source, no duplicate hand-written
  interface to drift (ADR-016 storage-rebuild; AR-5 `SessionRow` precedent). [FACT: schema/foundation/sessions.ts `$inferSelect`]
- **Service/contract types in `core/foundation/*`**: `ViewFilter`, `ViewGrouping`, `ReadProvider`, `ResolvedView`
  (`foundation/views/types.ts`); `CreateTagInput`/`CreateSpaceInput`/`CreateViewInput` + typed errors in the
  service layer (mirrors AR-5's `SessionTypeDef` in `foundation/sessions/types.ts`).
- **Correction note:** an earlier draft of this §3.2 listed hand-written `Tag`/`EntityTag`/`Space`/… interfaces in
  `@vida/types`. That was spec-prose imprecision — it contradicts the built-substrate precedent (row shapes come
  from `$inferSelect`, never a duplicated interface). The code followed the precedent; this text is corrected to match. No decision — the convention is fixed.

### 3.3 Service / registry interfaces (`foundation/{spaces,views}`)

- **`TaggableTypeRegistry`** (SP2): `register(entityType: string): void` · `isRegistered(t): boolean` · seeded from `ENTITY_TYPES`. Extends the existing `_registry.ts` mechanism (opens it to runtime registration).
- **`SpacesService`** (via `createRepository`): `createTag/updateTag/deleteTag` · `tagEntity(tagId, entityType, entityId)/untagEntity` · `createLink/removeLink` · `createSpace/updateSpace/deleteSpace` · `addEnabledBlock/removeEnabledBlock`. Every mutation validates `entity_type` against the registry (BR-2), routes through the DB-6 Repository → co-transactional `sync_queue` enqueue.
  - **Junction writes are IDEMPOTENT (BR-14, critique MF-1).** `tagEntity`/`createLink`/`addEnabledBlock` must `findWhere` the business UNIQUE key **before** insert (the AR-5 `registry.ts:101-105` precedent) — if the row exists, return it / no-op; **never** blind-`create()` (which mints a fresh `id` and blind-inserts → a raw SQLite UNIQUE error on the routine "click the tag chip twice"). Re-tagging is a no-op, not an error.
  - **Junction removes RESOLVE-then-SOFT-DELETE (BR-15, critique MF-2).** The Repository deletes by `id` PK only (`repository.ts:198`), but callers hold the business key. So `untagEntity`/`removeLink`/`removeEnabledBlock` = `findWhere(business key)` → `repo.delete(row.id, { softDelete: true })` (these tables are syncable soft-delete — `deleted_at` + must propagate as `operation:'update'`; NOT `hardDelete`). Row not found → idempotent no-op.
  - **Space-with-default-view is a create→create→update sequence (MF-3).** `default_view_id ↔ views.space_id` is safe (both nullable, no FK), but the write path is: `createSpace(default_view_id=null)` → `createView(space_id=<space.id>)` → `updateSpace(default_view_id=<view.id>)`. AR-6 ships this primitive CRUD; a "new Space with a starter view" compose-helper is a consumer/UX concern (M1.1+).
- **`ViewProviderRegistry`** (V4): `register(p: ReadProvider): void` · `get(entityType): ReadProvider | undefined`. Ships empty.
- **`ViewsService`** (via `createRepository`): `createView/updateView/deleteView/getView`.
- **`ViewEngine`** (V3/V4/V5): `resolve(view: View): Promise<ResolvedView>` — fan filter out to registered providers, provider-delegate predicates, merge, group (ungrouped bucket for missing group-by), return with terminal `state`. No provider for a selected type → that type contributes empty + a declared degraded note, never throws mid-resolve (BR-11/BR-12).

## 4. Acceptance (testable DoD — every item a checkbox)

- [ ] Migration `003_spaces` authors the 6 tables with correct CHECK (only `views.layout`) / no-CHECK (all `entity_type`) / UNIQUE / indexes (incl. `entity_links(entity_type, entity_id)` backlink index); `entity_links` shape = `(page_id, entity_type, entity_id, context)` with `page_id` plain TEXT no-FK; registered in `runner.ts`; `migrate()` advances version to 3. (BR-1..10)
- [ ] Every table carries `_sync_*` + `deleted_at`; `tags.name/description`, `spaces.name`, `views.name`, `entity_links.context` are documented `[E]`. (BR-7, BR-12)
- [ ] `entity_type` columns are plain TEXT (no CHECK); a runtime-registered new type is accepted by `SpacesService` without a schema change; an unregistered type throws `UnknownEntityType`. (BR-2)
- [ ] `entity_tags` and `entity_links` are separate tables (no merged polymorphic table). (BR-4)
- [ ] `VIEW_LAYOUT` tuple in `@vida/types` == the SQL CHECK in migration 003 == `z.enum` validator (parity test, DB-9 pattern). (BR-10)
- [ ] `SpacesService`/`ViewsService` mutations enqueue to `sync_queue` co-transactionally (assert one queue row per mutation, via the DB-6 Repository). (BR-7, BR-12)
- [ ] Re-`tagEntity`/`createLink`/`addEnabledBlock` of an existing business key is an idempotent no-op — NO raw SQLite UNIQUE error thrown (findWhere-before-insert). (BR-14)
- [ ] `untagEntity` of an existing tag → a **soft-delete** (`deleted_at` set) that enqueues one `operation:'update'` sync_queue row (NOT a hard delete); untag of a non-existent row → no-op. (BR-15)
- [ ] `ViewEngine.resolve` over a fake multi-type provider set: unmatched predicate → type kept (not dropped); missing group-by field → ungrouped bucket; a selected type with no provider → empty + degraded, no throw; empty result → `state:'empty'`. (BR-10, BR-11, BR-12)
- [ ] `TaggableTypeRegistry` seeded from `ENTITY_TYPES` (incl. `space`, `tag`); `register(t)` adds a new type at runtime; `_registry.ts` gains no `'view'` (preflight G2). (BR-2)
- [ ] AR-6 tables register with the DB-6 Repository over an **empty `[E]` set** (M1.0 pass-through); grep confirms no `encryptField`/vault-key call in AR-6's service code; `views.filter` stored plaintext. (BR-13)
- [ ] `space_enabled_blocks` is a row-per-offer junction — `UNIQUE(space_id, capability_def_id)` — and grep confirms **no `block_instances` table is authored in migration 003** (SP6 junction ≠ placements; forward seam to AR-7, `capability_def_id` plain TEXT, no FK). (BR-6)
- [ ] A `tags` insert whose `parent_tag_id` chain reaches itself throws `InvalidTagNesting`; same guard for `spaces.parent_space_id`. (BR-3, BR-5, fail-loud)
- [ ] `tags` has NO SQL `UNIQUE(name)` (retired; `name` is `[E]`); app-layer `(parent_tag_id, name)` uniqueness holds in `SpacesService`. (BR-3)
- [ ] Root `pnpm typecheck` 10/10 zero consumer edits; `@vida/core` + `@vida/web` test suites green; new unit tests for registry/service/engine pass.
- [ ] Deferral grep clean: no effect rail (R1/R2), no `block_instances`, no predicate-DSL grammar, no page_tags migration in AR-6's diff.

## 5. Implementation Prompt

Ordered; each step cites the §2/§3 rule it satisfies. Mirrors the AR-5 sessions build order.

1. **`@vida/types/src/view.ts`** — `VIEW_LAYOUT` C2 tuple + `ViewLayout` union; barrel in `types/src/index.ts`. NO `space.ts` — spaces has no fixed enum (entity_type = open registry); row types come from schema `$inferSelect` (§3.2, AR-5 substrate precedent). (BR-10, §3.2)
2. **`core/validators/view.ts`** — `z.enum(VIEW_LAYOUT)`; barrel. NO `space.ts` validator (no enum). (BR-10, DB-9)
3. **`db/schema/foundation/spaces.ts`** — 6 Drizzle mirrors (§3.1): `baseColumns` + `deleted_at`; `enumText('layout', VIEW_LAYOUT)`; plain `text()` for `entity_type` + the polymorphic `entity_id`/`page_id`/refs + JSON columns (no `link_type` column exists); export `$inferSelect/$inferInsert`. Export from `schema/index.ts`. (§3.1, BR-1..10)
4. **`db/migrations/003_spaces.ts`** — hand-SQL DDL mirroring §3.1 exactly (baseColumns + `_sync_*`), CHECK only on `views.layout`, UNIQUEs + indexes per §3.1; `up()` no own txn. Register in `runner.ts` `ALL_MIGRATIONS`. (§3.1, BR-2/4/7/10)
5. **`db/schema/_registry.ts`** — **no change.** `ENTITY_TYPES` already seeds `space` + `tag` (the AR-6 entities that are tagged/linked). Do NOT add `'view'` — no documented flow tags/links a view (preflight G2: speculative add, dropped). New taggable types are added by their owning module at its build (the registry's append-per-domain rule). (BR-2)
6. **`foundation/spaces/{types,registry,service,index}.ts`** — `TaggableTypeRegistry` (seed ENTITY_TYPES + runtime register); `SpacesService` via `createRepository` with an **empty `[E]` set** (BR-13 pass-through). Junction writes (`tagEntity`/`createLink`/`addEnabledBlock`) = **findWhere-then-insert** (idempotent, BR-14); junction removes (`untagEntity`/…) = **findWhere-then-`delete(id,{softDelete:true})`** (BR-15); all mutations validate entity_type (BR-2) + enqueue sync_queue; typed errors; barrel. (§3.3, BR-1..7/13/14/15)
7. **`foundation/views/{types,engine,provider-registry,service,index}.ts`** — `ViewProviderRegistry` (empty); `ViewsService` via `createRepository`; `ViewEngine.resolve` (fan-out + provider-delegated predicates + ungrouped bucket + terminal states); typed errors; barrel. (§3.3, BR-8/9/10/11/12)
8. **Fix directory stubs**: `foundation/spaces/CLAUDE.md` SP1–4 → SP1–SP7; `foundation/views/CLAUDE.md` add V3. (baseline doc-nit)
9. **Tests** (`__tests__/`): migration applies + version=3; registry seed/register; service enqueue (one sync_queue row/mutation); engine resolution cases (§4); VIEW_LAYOUT parity (tuple==CHECK==zod). (§4)
10. **Verify** against §4: `pnpm typecheck` + `pnpm test` (turbo `^build`, authoritative — not `--filter` false-green); deferral grep. (§4)

## 6. Open UNKNOWNs / Decisions Needed

- ~~DECISION-1 (entity_links source shape)~~ **NOT AN OPEN DECISION — already decided in the docs.** The v2
  shape is `entity_links (page_id, entity_type, entity_id, context)`: **page-anchored** `page_id`, polymorphic
  **target** `entity_type`/`entity_id` (open registry), `context [E]`. [FACT: cross-module-integration.md
  §3.2:137; security-model.md:473; ADR-002:1365 opened per ADR-006 §3.2]. The features-first "no `pages` table
  yet" gap is already solved by the **live no-FK convention** — `page_id` is plain TEXT (no `REFERENCES
pages(id)`), so the table stands up now and stays empty until N&P (M1.1) writes links. My earlier
  "source-polymorphic" framing was an invention (drift), not a documented decision — retracted.
- ~~DECISION-2 (`link_type` vocab)~~ **VOID** — the decided `entity_links` shape has no `link_type` column; I
  invented it. Removed from §3.1/§3.2/§4. `entity_type` (the open registry) is the only "type" on a link.
- ~~DECISION-3 (ViewEngine reach)~~ **CLEARED** by the independent critique (verified-and-cleared #2/#4): the
  fan-out engine + `ReadProvider` interface + empty registry (executable against a fake provider) IS the
  substrate boundary — mirrors AR-5's registry-ahead-of-modules; real providers register per-module (ADR-007 §3.4). Not under-build.

## 7. Change Log

| Date       | Session                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | 2026-07-28-ar-6-spaces | initial draft (stub + home)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-07-28 | 2026-07-28-ar-6-spaces | PLAN authored — SP1–SP7 + V1–V5 mechanical scope; 6 tables; §6 DECISION-1 entity_links source-polymorphic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-07-28 | 2026-07-28-ar-6-spaces | Independent critique (REVISE→SHIP): MF-1 backlinks table-vs-resolver reconciled vs :121; MF-2 effects-home conflict disclosed; MF-3 tags UNIQUE(name) retired + [E]-no-UNIQUE rule; MF-4 cycle-guard DoD; MF-5 enabled_blocks structural DoD; MF-6 DECISION-2 closed.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-07-28 | 2026-07-28-ar-6-spaces | **Victor caught drift**: `entity_links` shape was already DECIDED in cross-module-integration.md §3.2 + security-model.md:473 = `(page_id, entity_type, entity_id, context)`. Retracted my invented source-polymorphic shape + fabricated `link_type` column. DECISION-1 VOID/closed-by-docs, DECISION-2 VOID. Features-first gap solved by live no-FK convention (page_id plain TEXT).                                                                                                                                                                                                                                                                                                                        |
| 2026-07-28 | 2026-07-28-ar-6-spaces | **§2.1 gather protocol applied** (post-triage fix): routed full source set (§1.1), read ADR-002 §5.20 owed-ledger — confirms every table name + shape (`entity_tags`:3765, `spaces`:3766, `space_enabled_blocks`:3767, `views`:3768; AR-7-owned block_instances/capability_grants). Every §3.1 shape now FACT-cited; zero derived.                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-07-28 | 2026-07-28-ar-6-spaces | g1 critique RE-RUN (full sources): REVISE→SHIP. MF-1 fixed — retracted `link_type` survived in §5 step 3 build prompt (removed). SF-1 — tightened ADR-006 §"does NOT":129 cite. Critic verified-and-cleared: entity_links correction faithful, SP1–SP7+V1–V5 exact, PC-1/INT-1a/DATA-4 compliant, pattern conformant, tags shape sanctioned.                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-29 | 2026-07-28-ar-6-spaces | Approval 1 (PLAN gate cleared). §XXVI g2 /preflight: BLOCKED→resolved. G1 — added BR-13 (M1.0 empty-[E] pass-through, [E]=M3 target, filter plaintext). G2 — dropped speculative `'view'` from ENTITY_TYPES (§5 step 5 no-change; no doc sanctions views as taggable). §4 checkboxes updated.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-07-29 | 2026-07-28-ar-6-spaces | g2 (2nd independent) critique: REVISE→SHIP. Caught 3 executability defects vs real repository.ts API: MF-1 junction re-tag leaks raw UNIQUE → BR-14 idempotent findWhere-before-insert; MF-2 remove-by-business-key not expressible → BR-15 resolve-then-soft-delete(operation:update); MF-3 default_view_id↔space_id write sequence → create→create→update stated. §2/§3.3/§4/§5 propagated. Cleared: BR-13/G2 correct+propagated, migration 003 executable, schema mirror, sync-enqueue test non-false-green, entity_links faithful, scope exact.                                                                                                                                                            |
| 2026-07-29 | 2026-07-28-ar-6-spaces | IMPLEMENTED + post-impl independent critique (REVISE→SHIP). MF-1 (BLOCKING bug): missing `spaces.parent_space_id` cycle guard → added `assertNoSpaceCycle` + `InvalidSpaceNesting` + test (spaces 14/14). MF-2: NOT a real divergence — verified the built-substrate convention (AR-5: `@vida/types`=enum only, row types=`$inferSelect`, service types=core); code was correct, §3.2/§5 prose corrected to match (no menu, no code change). SF-1: engine never emits 'loading' (consumer state); partial-provider-failure → 'error' by intent (fail-loud). Verify: typecheck 10/10, core 123/124 (lone fail = pre-existing vault 1MB load-flake, green alone), spaces 14/14, parity 7/7, deferral grep clean. |
