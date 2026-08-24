<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A5 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in delivery/{slice-map,seam-contract,interpretation,baseline}.md
     + the aspect docs + the shipped AR-6/AR-8 code + A1-A4. No-Guessing: every claim is [FACT: path:line].
     A5 is where `_deps` (spaces/backlinks/registry) is CONSUMED for the first time (N4). -->
<!-- ground-truth docs referenced by bare filename below live at docs/features/notes-and-pages/ (+ delivery/) and docs/specs/features/mod-notes/ -->

# A5 — tag reads + link/tag facade  (MOD-notes ① · slice A5)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = the Entity Front Matter
(`delivery/{slice-map,seam-contract,interpretation,baseline}.md`) + the shipped AR-6 `SpacesService`
(`foundation/spaces/service.ts`) + AR-8 `BacklinkResolver` (`services/search/backlink-resolver.ts`) + A1-A4. The
`current-*` docs are removed-① residue — where they diverge from the rebuild's seam (esp. `getBacklinks`), the seam
governs (see §2 BR-A5-6). §XXIX regenerates `current-*` at the A-track close.

## 1. Context & scope
A5 wires the Notes service into the AR-6/AR-8 substrate: the **net-new `entity_tags` reads** (AR-6 has none, B1),
the **write facade** over AR-6 (link/tag writes), the **read facade** over AR-8 (entity-link reads), and the
**net-new `getBacklinks` merge** (page_links ⊕ entity_links). It **consumes `_deps` for the first time** (N4) — so
the factory's `_deps` param is renamed to `deps` (the frozen 3-dep signature is unchanged, D-3).

**In scope (the frozen seam rows tagged A5 — `seam-contract.md:25-28`):**
- **Tag reads (net-new, B1):** `getEntitiesByTag(tagId)` · `getTagsForEntity(entityType, entityId)` → `EntityTagRow[]`.
- **Write facade → AR-6:** `createEntityLink(pageId, entityType, entityId, context?)` → `deps.spaces.createLink` ·
  `removeEntityLink(...)` → `removeLink` · `tagEntity(tagId, entityType, entityId)` → `tagEntity` · `untagEntity(...)`
  → `untagEntity`. `createEntityLink`/`tagEntity` **pre-validate** `entityType` (IR-2) → `UnregisteredEntityTypeError`.
- **Read facade → AR-8:** `getEntityLinksFrom(pageId)` → `deps.backlinks.getLinksFrom` (pure delegate, entity_links).
- **Merged read (① composes):** `getBacklinks(entityType, entityId)` → `{ entityLinks, pageLinks }` (AR-8
  `getBacklinksTo` ⊕ A2 `getPageLinksTo`), the C4/G6 merge whose shape A5 owns.

**Explicitly OUT (later slices — do NOT build):** attachments (A6), summary (A7), cascade (A8). A5 does **not** author
`entity_tags`/`entity_links` schema (AR-6 owns it), does **not** re-implement link/tag WRITES or entity-link READS
(delegates), does **not** guard the page write (that's N3, already A1/A4).

**Pattern to mirror (read before authoring):** AR-8 `backlink-resolver.ts:32-73` — the **read-repo** shape for the
net-new tag reads (`createRepository(db, entityTags, {deviceId, encryptedFields:[], softDelete:true})`, `findWhere` +
`isNull(deleted_at)`) `[FACT: backlink-resolver.ts:36-40,46-53]`; AR-6 `spaces/service.ts:76-77,128-192` — the delegated
write targets + `registry.isRegistered` guard `[FACT: spaces/service.ts:76,128,158,182]`.

## 2. Business rules (invariants A5 must hold)
- **BR-A5-1 · Tag reads are NET-NEW, read-only (B1).** AR-6 `SpacesService` exposes **no** tag-read method
  `[FACT: spaces/service.ts:38-61 interface — tagEntity/untagEntity only]`; A5 adds a read-only `entityTagRepo`
  (empty-`[E]`, soft-delete) and `getTagsForEntity(entityType, entityId)` = live `entity_tags` where
  `(entity_type, entity_id)` match; `getEntitiesByTag(tagId)` = live where `tag_id` matches. Both return
  `EntityTagRow[]` `[FACT: spaces.ts:133 EntityTagRow; :55-57 columns; :60 idx_entity_tags_entity]`. Verbatim
  `findWhere` → append `isNull(entityTags.deleted_at)` (N7/IR-6, mirror backlink-resolver.ts:42-53). WRITES stay AR-6.
- **BR-A5-2 · Write facade delegates to AR-6; ① owns the error surface (IR-2/C5).** `createEntityLink`/`tagEntity`
  **pre-validate** `entityType` against the **runtime registry** (`deps.registry.isRegistered`), throwing Notes'
  **`UnregisteredEntityTypeError(entityType)`** — NOT the closed `EntityLinkTargetSchema` (that would silently
  re-close the OPEN SP2 registry) `[FACT: interpretation.md:87 IR-2; baseline.md:160 C5; validators/note.ts:11 vs
  spaces/service.ts:76]`. Then delegate to `deps.spaces.createLink`/`tagEntity` (which also validate — a
  defense-in-depth backstop; for a valid type both pass). `removeEntityLink`/`untagEntity` do **NOT** pre-validate
  (AR-6's `removeLink`/`untagEntity` don't either — a remove for an unknown type is a harmless no-op)
  `[FACT: spaces/service.ts:145,182 no assertRegistered]`. Returns AR-6's `EntityLinkRow`/`EntityTagRow`/`void`.
- **BR-A5-3 · `UnregisteredEntityTypeError` is a bespoke `extends Error` (seam-contract:34).** In
  `services/notes/types.ts`, matching the `JournalExistsError` (A1) + AR-6 `UnknownEntityType` precedent (`name`,
  `entityType` field) `[FACT: services/notes/types.ts JournalExistsError; spaces/types.ts:37]`. (Distinct from AR-6's
  `UnknownEntityType` by design — Notes consumers catch a Notes error; the data-flow.md §5 `ServiceError` divergence
  is a flagged DB-11 reconcile, not this slice's, `_index.md:88`.)
- **BR-A5-4 · Read facade → AR-8 is a PURE delegate.** `getEntityLinksFrom(pageId)` = `deps.backlinks.getLinksFrom(
  pageId)` — no re-implementation (AR-8 owns entity-link reads) `[FACT: backlink-resolver.ts:56-60; interpretation.md:39]`.
- **BR-A5-5 · `getBacklinks` = the ①-composed MERGE (C4/G6) — supersedes the removed-① entity-links-only.**
  `getBacklinks(entityType, entityId)` returns **`{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }`** —
  `entityLinks` = `deps.backlinks.getBacklinksTo(entityType, entityId)` (entity_links → this entity); `pageLinks` =
  the A5-internal call to A2 `getPageLinksTo(entityId)` (page_links whose target is this id — non-empty only when the
  entity is a page; a page's `entity_id` in a backlink context IS its page id) `[FACT: seam-contract.md:28;
  baseline.md:159 C4; interpretation.md:104]`. The two are kept **typed-distinct** (B4 renders them distinctly,
  slice-map.md:33), which IS the merge shape A5's Verification Gate owns. The removed-① returned entity-links-only
  and deferred the merge to ② (`_index.md:83`); the base-flow Decomposition Gate resolved it to this ①-merge — the
  seam governs `[FACT: seam-contract.md:28; task Decomposition note "getBacklinks = ①-merge not AR-8 delegate"]`.
- **BR-A5-6 · `_deps` is CONSUMED (N4) — rename `_deps` → `deps`.** The frozen `createNotesService(db, deviceId,
  deps: NotesServiceDeps)` signature is unchanged (D-3); A5 drops the `_` prefix and uses `deps.spaces`/`deps.backlinks`/
  `deps.registry`. Notes **composes** the seams; it constructs none (N4) `[FACT: interpretation.md:63 N4; seam-contract.md:8]`.
- **BR-A5-7 · Returns Drizzle Rows.** `EntityTagRow`/`EntityLinkRow` from `spaces.ts`, `PageLinkRow` from `notes.ts`
  (DB-11 reconcile not this entity's job — baseline C2). Tag-read repo config mirrors AR-6/AR-8 exactly (empty-`[E]`).

## 3. Contract (the A5 surface ② will bind to)
```ts
export interface NotesService {                    // GROWS per slice; A5 appends these rows
  // tag reads (net-new, B1)
  getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>
  getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>
  // write facade → AR-6 (createEntityLink/tagEntity pre-validate → UnregisteredEntityTypeError)
  createEntityLink(pageId: string, entityType: string, entityId: string, context?: string | null): Promise<EntityLinkRow>
  removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>
  tagEntity(tagId: string, entityType: string, entityId: string): Promise<EntityTagRow>
  untagEntity(tagId: string, entityType: string, entityId: string): Promise<void>
  // read facade → AR-8 (pure delegate) + the ①-composed merge
  getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>
  getBacklinks(entityType: string, entityId: string): Promise<{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }>
}
export class UnregisteredEntityTypeError extends Error { constructor(public readonly entityType: string) { … } }  // types.ts
export function createNotesService(db, deviceId, deps: NotesServiceDeps): NotesService   // `_deps` → `deps` (consumed)
```
- Imports: `EntityTagRow`/`EntityLinkRow` from `../../db/schema/foundation/spaces`; `entityTags` (for the read-repo);
  `PageLinkRow` already imported (A2). `②` consumers: B4 (`createEntityLink`/`getBacklinks`/`getEntityLinksFrom`) ·
  B6 (`tagEntity`, create-with-tags) `[FACT: seam-contract.md:40,42]`.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A5 — tag reads + facade')` (reuse A1 `setup()`, which already builds real `spaces`/`backlinks`/`registry`):**
   - **tag reads:** `spaces.tagEntity(tag, 'task', 't1')` then `getTagsForEntity('task','t1')` → 1 row; `getEntitiesByTag(tag)`
     → the entities; `untagEntity` (soft-delete) → excluded from both reads (N7).
   - **createEntityLink delegates + returns the AR-6 row;** a second identical call is idempotent (AR-6 revive-or-noop).
   - **registry guard (IR-2):** `createEntityLink(p, 'unregistered_type', 'x')` and `tagEntity(tag,'unregistered_type','x')`
     **reject `UnregisteredEntityTypeError`** (instanceof + `.entityType`); a REGISTERED type (register it on the test
     `registry`) succeeds. `removeEntityLink`/`untagEntity` on an unregistered type do **not** throw (no-op).
   - **getEntityLinksFrom** = the AR-8 result (delegate); **getBacklinks** returns `{entityLinks, pageLinks}` — seed an
     entity_link (`createEntityLink`) + a page_link (A2 `createPageLink(other, pageId)`) targeting the same id → both
     arrays populated; a non-page entity → `pageLinks` empty, `entityLinks` populated.
2. **Live-DB smoke (REAL DB — N1):** cases run after `initVault()` on the real spaces/backlinks/registry wiring.
3. **Green bars:** `pnpm --filter @vida/core test` all green (A1-A4 stay green) · root `typecheck` 0 · `eslint` 0.
4. **§XXIX currency:** deferred to the A-track close — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `services/notes/types.ts` — append the A5 interface rows (§3); add `EntityTagRow`/`EntityLinkRow` to the schema
   import; add `export class UnregisteredEntityTypeError extends Error` (bespoke, mirror `JournalExistsError`).
2. `services/notes/service.ts` — rename the factory param `_deps` → `deps`; add `entityTagRepo = createRepository(db,
   entityTags, {deviceId, encryptedFields: [], softDelete: true})` + a `liveEntityTags(pred)` closure; import
   `entityTags, type EntityTagRow, type EntityLinkRow` from `../../db/schema/foundation/spaces` and
   `UnregisteredEntityTypeError` from `./types`; add an `assertRegistered(et)` closure (`if
   (!deps.registry.isRegistered(et)) throw new UnregisteredEntityTypeError(et)`); append the methods:
   - `getEntitiesByTag`/`getTagsForEntity` → `liveEntityTags(eq(...))`.
   - `createEntityLink`/`tagEntity` → `assertRegistered(entityType)` then `return deps.spaces.createLink(...)`/`tagEntity(...)`.
   - `removeEntityLink`/`untagEntity` → `deps.spaces.removeLink(...)`/`untagEntity(...)` (no guard).
   - `getEntityLinksFrom` → `deps.backlinks.getLinksFrom(pageId)`.
   - **Intra-call (no `this` — [[factory-service-no-this-for-intra-calls]]):** the A2 `getPageLinksTo` method IS
     already just `livePageLinks(eq(pageLinks.target_page_id, pageId))`, and `livePageLinks` is a **hoisted closure**
     (declared before `return`). So `getBacklinks` reuses `livePageLinks` **directly** — no `getPageLinksToImpl` hoist
     is needed (the closure already exists). `getBacklinks` → `const [entityLinks, pageLinkRows] = await Promise.all([
     deps.backlinks.getBacklinksTo(entityType, entityId), livePageLinks(eq(pageLinks.target_page_id, entityId))]);
     return { entityLinks, pageLinks: pageLinkRows }`. The local is named `pageLinkRows` (NOT `pageLinks`) so it does
     not collide with the imported `pageLinks` table used in the `eq` predicate (a destructure-TDZ hazard). Never
     `this.getPageLinksTo(...)` (breaks on the ② destructure). *(Amended at gate-2 from a `getPageLinksToImpl`-hoist
     draft — the code-verified reality [`getPageLinksTo` = `livePageLinks(eq(...))`] makes the extra closure dead.)*
3. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A5` cases (register extra entity types on the
   test `registry` where a valid-type path is exercised).
4. Do NOT touch current-* (§XXIX). Do NOT author entity_tags/entity_links schema. Do NOT add cascade (A8).

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to escalate:
- tag reads net-new, read-only → BR-A5-1 (`B1`·`spaces/service.ts:38-61`·`backlink-resolver.ts:36-53`).
- facade pre-validates via the RUNTIME registry → `UnregisteredEntityTypeError` (create/tag only) → BR-A5-2/3
  (`IR-2`·`C5`·`seam-contract:26,34`).
- read facade = pure AR-8 delegate → BR-A5-4 (`interpretation:39`).
- **`getBacklinks` = ①-merge `{entityLinks, pageLinks}`** (supersedes the removed-① entity-links-only) → BR-A5-5
  (`seam-contract:28`·`baseline:159 C4`·`interpretation:104`; the base-flow Decomposition Gate already flipped it).
- `_deps` consumed → `deps` → BR-A5-6 (`N4`·`D-3`). Returns Drizzle Rows → BR-A5-7 (baseline C2).
