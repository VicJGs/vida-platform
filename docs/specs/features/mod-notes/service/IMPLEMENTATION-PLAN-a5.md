<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A5. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a5-tag-reads-and-facade.md (§2 rules, §4 acceptance). A5 CONSUMES `_deps` (→ `deps`). -->

# IMPLEMENTATION-PLAN — A5 tag reads + link/tag facade

**Home:** `services/notes/{types,service}.ts` + tests (all in `@vida/core`). No new file.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified import/shape surface (confirmed on disk)
- AR-6 delegate targets (`service.ts:44-53` interface): `createLink(pageId, entityType, entityId, context?) →
  Promise<EntityLinkRow>` · `removeLink(...) → Promise<void>` · `tagEntity(tagId, entityType, entityId) →
  Promise<EntityTagRow>` · `untagEntity(...) → Promise<void>` `[FACT: foundation/spaces/service.ts:44-53]`.
  `createLink`/`tagEntity` assertRegistered → `UnknownEntityType`; `removeLink`/`untagEntity` do NOT
  `[FACT: spaces/service.ts:128-129,158-159 vs 145,182]`.
- AR-8 delegate targets: `getLinksFrom(pageId) → EntityLinkRow[]` · `getBacklinksTo(entityType, entityId) →
  EntityLinkRow[]` `[FACT: backlink-resolver.ts:24-27,46-60]`.
- `deps.registry.isRegistered(entityType): boolean` `[FACT: spaces/service.ts:76-77; foundation/spaces/types.ts]`.
- Schema: `entityTags` (table) · `EntityTagRow` (:133) · `EntityLinkRow` · `entity_tags` cols `tag_id`/`entity_type`/
  `entity_id` (:55-57) — all from `../../db/schema/foundation/spaces` `[FACT: spaces.ts:51-60,133]`.
- `service.ts` already imports `and, eq, isNull, type SQL` (:16), `pageLinks` (:19), and has the hoisted
  `livePageLinks` closure (:49-50) — `getBacklinks` reuses it directly (the `getPageLinksTo` method IS just
  `livePageLinks(eq(pageLinks.target_page_id, pageId))`, `service.ts` A2). **No `getPageLinksToImpl` hoist needed.**

## Build step 1 — `services/notes/types.ts`
1. Add the spaces-row type import: `import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'`.
   (`PageLinkRow` already imported from schema/notes, A2.)
2. Append the A5 interface rows (after the A4 `ensureEntityNote`):
   ```ts
     // --- tag reads (A5, net-new B1) --------------------------------------------
     getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>
     getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>
     // --- write facade → AR-6 (A5); createEntityLink/tagEntity pre-validate → UnregisteredEntityTypeError
     createEntityLink(pageId: string, entityType: string, entityId: string, context?: string | null): Promise<EntityLinkRow>
     removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>
     tagEntity(tagId: string, entityType: string, entityId: string): Promise<EntityTagRow>
     untagEntity(tagId: string, entityType: string, entityId: string): Promise<void>
     // --- read facade → AR-8 (A5) + the ①-composed merge
     getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>
     getBacklinks(entityType: string, entityId: string): Promise<{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }>
   ```
3. Add the typed error (after `JournalExistsError`, mirror its shape):
   ```ts
   /** NP-6/SP2: an entity_type not in the runtime registry (IR-2/C5). Distinct from AR-6's UnknownEntityType. */
   export class UnregisteredEntityTypeError extends Error {
     constructor(public readonly entityType: string) {
       super(`Entity type is not registered: ${entityType}`)
       this.name = 'UnregisteredEntityTypeError'
     }
   }
   ```

## Build step 2 — `services/notes/service.ts`
1. Imports:
   - `import { entityTags, type EntityTagRow } from '../../db/schema/foundation/spaces'` (new line; `EntityLinkRow`
     is inferred from the delegate returns — add it only if tsc asks).
   - Extend the `./types` import to add the error value: `import { …, UnregisteredEntityTypeError } from './types'`.
2. Rename the factory param `_deps: NotesServiceDeps` → `deps: NotesServiceDeps` (drop the `_`; update the comment —
   it's now consumed). Internal rename only; the exported signature/type is unchanged (BR-A5-6).
3. After `pageLinkRepo` (:45) add the tag read-repo + its live closure (mirror AR-8 read-repo):
   ```ts
   const entityTagRepo = createRepository(db, entityTags, { deviceId, encryptedFields: [], softDelete: true })
   const liveEntityTags = (pred: SQL): Promise<EntityTagRow[]> =>
     entityTagRepo.findWhere(and(pred, isNull(entityTags.deleted_at))!)
   // IR-2/C5: validate against the RUNTIME registry (not EntityLinkTargetSchema). Notes' own error surface.
   const assertRegistered = (entityType: string): void => {
     if (!deps.registry.isRegistered(entityType)) throw new UnregisteredEntityTypeError(entityType)
   }
   ```
4. Append the methods to the returned object literal (after `ensureEntityNote`):
   ```ts
   // --- tag reads (A5, net-new B1) ------------------------------------------
   getEntitiesByTag(tagId) {
     return liveEntityTags(eq(entityTags.tag_id, tagId))
   },
   getTagsForEntity(entityType, entityId) {
     return liveEntityTags(and(eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId))!)
   },

   // --- write facade → AR-6 (A5) --------------------------------------------
   async createEntityLink(pageId, entityType, entityId, context) {
     assertRegistered(entityType)                       // IR-2; throw becomes a rejection (async method)
     return deps.spaces.createLink(pageId, entityType, entityId, context)
   },
   removeEntityLink(pageId, entityType, entityId) {
     return deps.spaces.removeLink(pageId, entityType, entityId)   // no guard (AR-6 removeLink doesn't either)
   },
   async tagEntity(tagId, entityType, entityId) {
     assertRegistered(entityType)
     return deps.spaces.tagEntity(tagId, entityType, entityId)
   },
   untagEntity(tagId, entityType, entityId) {
     return deps.spaces.untagEntity(tagId, entityType, entityId)   // no guard
   },

   // --- read facade → AR-8 (A5) + the ①-composed merge ----------------------
   getEntityLinksFrom(pageId) {
     return deps.backlinks.getLinksFrom(pageId)                    // pure delegate (entity_links)
   },
   async getBacklinks(entityType, entityId) {
     // BR-A5-5 (C4/G6): entity_links (AR-8) ⊕ page_links (A2 livePageLinks), kept typed-distinct.
     // Local named `pageLinkRows` to NOT shadow the imported `pageLinks` table (used in the eq predicate).
     const [entityLinks, pageLinkRows] = await Promise.all([
       deps.backlinks.getBacklinksTo(entityType, entityId),
       livePageLinks(eq(pageLinks.target_page_id, entityId)),
     ])
     return { entityLinks, pageLinks: pageLinkRows }
   },
   ```
Notes:
- `assertRegistered` inside an `async` method → the sync throw surfaces as a Promise rejection (the async-rejection
  contract, seam-contract:34). `removeEntityLink`/`untagEntity`/reads stay non-async (return the delegate promise).
- The `pageLinkRows` rename avoids shadowing the module-imported `pageLinks` table in the destructure.

## Build step 3 — `services/notes/__tests__/notes-service.test.ts` (append)
`describe('A5 — tag reads + facade')`, reuse `setup()` (already builds real `spaces`/`backlinks`/`registry` + injects
deps). Register any extra entity types on the test `registry` for valid-type paths (check how `setup()`'s
`createTaggableTypeRegistry()` seeds — `page`/`note`/`journal` are seeded; use those, or register a new one). Cases (§4):
1. **tag reads:** `spaces.tagEntity(tag, 'note', 'n1')` → `getTagsForEntity('note','n1')` length 1 + `getEntitiesByTag(
   tag)` returns it; then `svc.untagEntity(tag,'note','n1')` → both reads exclude it (N7). (Create the tag via
   `spaces.createTag` first to get a tagId.)
2. **createEntityLink delegates + idempotent:** `createEntityLink(pageId,'note','n1')` → an `EntityLinkRow`; a 2nd
   identical call returns the same row (AR-6 revive-or-noop).
3. **registry guard (IR-2):** `createEntityLink(p,'nope','x')` and `tagEntity(tag,'nope','x')` reject
   `UnregisteredEntityTypeError` (instanceof + `.entityType==='nope'`); `removeEntityLink(p,'nope','x')` and
   `untagEntity(tag,'nope','x')` resolve (no throw — no-op).
4. **getEntityLinksFrom** = the AR-8 result (delegate returns the created link).
5. **getBacklinks merge:** create a page P; `createEntityLink(otherPage,'note',P.id)` (entity_link → P) + a page_link
   `createPageLink(otherPage, P.id)` (page_link → P); `getBacklinks('note', P.id)` → `entityLinks` length 1 AND
   `pageLinks` length 1. A **non-page** entity: `createEntityLink(somePage,'task','t1')` then `getBacklinks('task','t1')`
   → `entityLinks` length 1 (the entity-link branch works) AND `pageLinks` **empty** (no page↔page links to a task id).
Live-DB smoke (N1): all after `initVault()` on the real wiring.

## Build step 4 — currency
Do NOT touch `current-*` (§XXIX, A-track close). Do NOT author entity_tags/entity_links schema. Do NOT add cascade (A8).

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1-A4's 34 stay green) · root `pnpm typecheck` 0 · `eslint` 0. All within
`@vida/core`. Then A5's ░Verification Gate░ (post-impl critique). **Run test ALONE — not concurrently with typecheck**
(the crypto suite times out under CPU contention; a prior A4 run produced 16 false failures that way).

## Deviation note
Any change to a landed seam signature → §XXVIII. The `_deps`→`deps` rename is internal (type unchanged), not a
divergence. Record any real divergence in Route History.
