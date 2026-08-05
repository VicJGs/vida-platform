# AR-8 · Increment #1 — Backlink / entity-link resolver  (forward-spec)

**Unit:** `core/src/services/backlink-service.ts` (a new `@vida/core` read service).
**Gate:** Add Backend Component / Default · flow B·F·C·L · §XXVI double-gate.
**Bound by the No-Guessing Principle** — every claim below traces to a cited floor.

---

## 1. Identity & intent
A **read-only resolver** over the `entity_links` table: given an entity, find the pages that link *to* it
(backlinks); given a page, find the entities it links *to*. It is the query/resolution half of the
`[[wiki-link]]` system whose **write** half (create/remove link) AR-6 already shipped.

- **Consumers (why it exists):** the backlink panel + entity-link preview cards
  (`cross-module-integration.md §3.4`, `§9` — "Backlink panel ← `entity_links`"); HARD-3 graph-backlinks rides AR-8.
- **Home = `packages/core/src/services/search/` (a DIRECTORY).** Resolution of the doc conflict:
  `cross-module-integration.md:170` names a *flat* `services/backlink-service.ts`, but that doc explicitly defers
  code homes to the structural phase (`:8`), and **ADR-018 §3.2 (the structural phase) mandates `services/` as
  one-subdir-per-unit** — all 19 live `services/*` are directories, zero flat `.ts`. ADR-018 outranks the
  architecture doc (CLAUDE.md governance). The delivery-plan §5:182 homes AR-8 at `services/{search,export}`; the
  backlink resolver is a read/query utility → the **`search/`** dir (FTS5 search joins it at DB-8 #60).
  ⚠ Doc-hygiene follow-up: `cross-module-integration.md:170`'s flat path is stale vs ADR-018 — flag, don't follow.
- **Boundary vs `services/notes/`:** `services/notes/CLAUDE.md` calls notes "the pages integration hub … backlinks
  across every module" — that is the **M1.1 surface/consumer**. AR-8 `search/` owns the **M1.0 read util** the notes
  surface will call; resolution logic lives here once, not duplicated inside `services/notes/` (`spaces/current-spec.md:33`).

## 2. No-Guessing baseline (the grep'd floor)
- **`entity_links` EXISTS** — `schema/foundation/spaces.ts:67` — columns: `id · page_id`(TEXT, no FK) ·
  `entity_type`(open registry, no CHECK) · `entity_id` · `context`(nullable) · `deleted_at` · +`_sync_*`(managed).
  Index **`idx_entity_links_entity` on `(entity_type, entity_id)`** (`:78`) = the backlink read path.
- **AR-6 owns the WRITE side** — `SpacesService.createLink(pageId, entityType, entityId, context?)` /
  `removeLink(...)` (`foundation/spaces/service.ts:47-53`, SP4). AR-8 must NOT re-implement writes.
- **`page_links` and `pages` DO NOT EXIST** — the schema has no `page_links` table; `entity_links.page_id` is
  *"plain TEXT, no FK (N&P is M1.1)"* (`spaces.ts:71`). Page↔page link resolution is therefore **out of scope**
  (Notes & Pages / MOD-notes is M1.1). This is the key grain boundary — surfaced by grepping the floor, not the
  doc prose (`cross-module-integration.md §3.3` describes `page_links` as a *target*, not a shipped table).
- **Repository read surface** — `repository.ts:213` `findWhere(where: SQL): Promise<RowOf<T>[]>` decrypts rows but
  runs the predicate **verbatim** — unlike `findById`/`findAll`/`count`, it does NOT apply `notDeleted()` internally
  (`:379-382`). **Soft-delete is the caller's responsibility** → every query below appends `isNull(deleted_at)`.
  `EntityLinkRow = typeof entityLinks.$inferSelect` (`spaces.ts:135`).
- **Service pattern** — factory `createXService(db, deviceId, …)` → per-table repo via
  `createRepository(db, table, {deviceId, encryptedFields: [], softDelete: true})` → typed errors → barrel
  `index.ts` → co-located `__tests__/` (`foundation/spaces/service.ts:63-74`).

## 3. Grain — IN vs DEFERRED
**IN (increment #1):** read/resolve over `entity_links` only.
**DEFERRED (with the reason each is a real floor gap, not a cut corner):**
- Page↔page (`page_links`) resolution → **table doesn't exist** (M1.1 N&P). Seam: add `getPageLinks*` when `pages`/`page_links` land.
- Preview-card **data enrichment** (target entity name/status/metrics) → **those module tables don't exist** (M1.1+).
  The resolver returns the raw `EntityLinkRow`; consumers enrich once modules exist.
- **`context` decryption** → M1.0 empty-`[E]` pass-through (BR-13); returned as stored. `[E]` activation = M3.
- Any write/mutation → **AR-6 owns it** (`createLink`/`removeLink`). This service is read-only by construction.

## 4. Contract
```ts
export interface BacklinkResolver {
  /** Backlinks: every page that links TO this entity. Read path = idx_entity_links_entity. */
  getBacklinksTo(entityType: string, entityId: string): Promise<EntityLinkRow[]>
  /** Forward links: every entity a given page links TO. */
  getLinksFrom(pageId: string): Promise<EntityLinkRow[]>
  /** Resolve ONE specific link (preview-card path); null if absent/soft-deleted. */
  resolveLink(pageId: string, entityType: string, entityId: string): Promise<EntityLinkRow | null>
}

export function createBacklinkResolver(db: DrizzleDb, deviceId: string): BacklinkResolver
```
**Semantics (all queries append `isNull(deleted_at)` — soft-delete aware, BR-15). NB drizzle `and(...)` returns
`SQL | undefined`; `findWhere` wants non-nullable `SQL` → suffix `!` exactly as AR-6 does (`spaces/service.ts:135`):**
- `getBacklinksTo` → `findWhere(and(eq(entity_type, ?), eq(entity_id, ?), isNull(deleted_at))!)` — hits `idx_entity_links_entity`.
- `getLinksFrom` → `findWhere(and(eq(page_id, ?), isNull(deleted_at))!)`.
- `resolveLink` → the three-way `and(...)!`; returns `rows[0] ?? null` (the SP4 business key
  `UNIQUE(page_id, entity_type, entity_id)` is enforced — `migration 003_spaces.ts:82` + `spaces/current-spec.md:14`
  — so ≤1 live row; verified by the critique).
- **No registry validation on reads** — an unregistered/unknown `entity_type` simply yields `[]` (reads never
  fail-loud; the BR-2 fail-loud guard is a *write*-path concern owned by AR-6). Flagged as a design decision.
- `deviceId` is threaded only to keep the repo config byte-identical to AR-6's (so `context` decryption stays
  correct when `[E]` activates at M3); it is unused on the read path today.

## 5. Files (directory home — ADR-018 §3.2)
- `packages/core/src/services/search/backlink-resolver.ts` — interface + `createBacklinkResolver` + queries.
- `packages/core/src/services/search/index.ts` — barrel (re-exports the resolver).
- `packages/core/src/services/search/__tests__/backlink-resolver.test.ts` — see §6 (matches the `foundation/*`
  `__tests__/` convention — the only live test layout in `core/src`; `services/*` have no code yet to contradict it).
- Replace the existing `services/search/CLAUDE.md` "directory home only" note with the built-context layer-doc at D6.
- Barrel: export from `packages/core/src/index.ts` (match existing export style).

## 6. Test plan (Vitest — success + ≥2 error/edge)
1. **Success — backlinks:** seed 2 links to `(task, T1)` + 1 to `(note, N1)` via the entityLinks repo →
   `getBacklinksTo('task','T1')` returns exactly the 2.
2. **Success — links-from:** seed 3 links from `page P1` → `getLinksFrom('P1')` returns the 3.
3. **Edge — soft-delete excluded:** create then `removeLink` one → it disappears from both reads (BR-15).
4. **Edge — empty:** unknown entity / page → `[]` (never throws).
5. **Edge — resolveLink single vs null:** exact-key hit returns the row; a non-matching key returns `null`.
6. **Isolation:** a link to `(task, T1)` must NOT surface for `(task, T2)` or `(note, T1)` (composite-key correctness).

## 7. Verification gates
- `tsc --noEmit` zero errors · `@vida/core` suite green (new tests + no regression).
- `/critique` → SHIP · engineering gate (error handling / read-only contract / no exposed internals) · verification.
- Currency (§XXIX): birth `docs/.../current-spec.md` + `current-business-rules.md` for the backlink-service context at D6.

## 8. Design decisions (critique-resolved · gate-1)
1. **Read-only, no registry** — the resolver takes no `TaggableTypeRegistry`; unknown types yield `[]` (BR-2
   fail-loud is a write-path guard, `spaces/service.ts:76`). ✅ CONFIRMED by critique.
2. **`deviceId` on a read-only factory** — KEPT. `RepositoryConfig.deviceId` is required (`repository.ts:179`), so
   `createRepository` cannot be called without it; parity with AR-6's cfg preserves the M3 `[E]` decrypt seam.
   Querying drizzle directly (no repo) was rejected — bypasses that seam. ✅ CONFIRMED by critique.
3. **Home = `services/search/` DIRECTORY** — resolved (see §1): ADR-018 §3.2 > the arch doc's flat-file; delivery-plan
   §5:182 homes AR-8 at `{search,export}`. ⚠ carries a doc-hygiene flag (`cross-module-integration.md:170`).
4. **Test layout** — `__tests__/backlink-resolver.test.ts` (the only live convention in `core/src`).
