<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A4. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a4-ensure-entity-note.md (§2 rules, §4 acceptance). -->

# IMPLEMENTATION-PLAN — A4 ensureEntityNote (NP-8)

**Home:** `packages/core/src/services/notes/` (A1-A3) + a net-new type in `@vida/types` + a schema in `validators/note.ts`.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).
**Seed target:** `content` (a minimal TipTap doc), NOT `title` — per `_index.md:46` + `conventions.md:7` + `ADR-003:457`
("the `content` column stores a TipTap JSON snapshot for local rendering"). IR-7 governs content SYNC, not this local write.

## Verified import/shape surface (confirmed on disk)
- **`EntityNoteSeed` is single-homed** as a `z.infer` alias in `services/notes/types.ts` (mirrors `CreatePageInput`,
  `types.ts:19-20`), NOT a `@vida/types` interface. `_index.md:88,106` lists it in the `CreatePageInput`/`UpdatePageInput`
  set; `@vida/types` holds `SyncableEntity`/`SyncMetadata` entity interfaces, not service input DTOs (`@vida/types/CLAUDE.md`).
  (gate-2 fix: a prior draft duplicated it as a `@vida/types` interface — a zero-consumer drift; dropped.)
- `validators/note.ts` — already exports `createPageSchema` via `z.object({...}).refine()`; append `entityNoteSeedSchema`
  the same way (`z.string().nullish()` ×4) `[FACT: validators/note.ts:25-46]`. `z` already imported.
- `services/notes/types.ts` — `CreatePageInput = z.infer<typeof createPageSchema>` is the pattern to mirror for
  `EntityNoteSeed` `[FACT: services/notes/types.ts:11-20]`. `PageType`/`PageRow` already imported there.
- `services/notes/service.ts` — `pageRepo`, `and`/`eq`/`isNull`, `pages` all in scope (A1); `pageRepo.create` accepts
  `content` (a `string`) via `CreatePageInput` (`content: z.string().nullish()`) `[FACT: validators/note.ts:29;
  service.ts:32,16,19]`. **One new import needed:** `import type { EntityNoteSeed } from './types'` — the local
  `buildSeedContent(seed: EntityNoteSeed)` helper's param annotation requires it (the method-body param infers from the
  interface, but the module-scope helper does not).

## Build step 1 — `packages/core/src/validators/note.ts` (add the schema — EXTEND, do not overwrite)
Append after `updatePageSchema`:
```ts
/** NP-8 seed input (defense-in-depth; all fields optional — different parents populate different subsets). */
export const entityNoteSeedSchema = z.object({
  title: z.string().nullish(),
  type: z.string().nullish(),
  status: z.string().nullish(),
  dates: z.string().nullish(),
})
```

## Build step 2 — `services/notes/types.ts` (type alias + interface row)
1. Extend the validator import to include the new schema:
   `import { createPageSchema, updatePageSchema, entityNoteSeedSchema } from '../../validators/note'`.
2. Add the inferred type: `export type EntityNoteSeed = z.infer<typeof entityNoteSeedSchema>`.
3. Append the interface row (after the A3 `resolveWikiLink`):
   ```ts
     // --- entity-note seed (A4) -------------------------------------------------
     ensureEntityNote(
       pageType: PageType, entityType: string, entityId: string, seed: EntityNoteSeed,
     ): Promise<PageRow>
   ```

## Build step 3 — `services/notes/service.ts` (helper + method)
1. Add a module-scope helper ABOVE `createNotesService` (pure, deterministic; no *runtime* import — one *type* import):
   ```ts
   import type { EntityNoteSeed } from './types'   // add to the existing './types' import (needed for the helper's param)

   // NP-8 seed: fixed field order (title·type·status·dates), skip nullish → a short summary, wrapped in a minimal
   // TipTap doc (conventions.md:7 — content is TipTap JSON). Deterministic: no Date.now/random; JSON.stringify of a
   // literal preserves insertion order. An all-nullish seed → an empty paragraph (a valid, structurally-non-blank doc).
   function buildSeedContent(seed: EntityNoteSeed): string {
     const summary = [seed.title, seed.type, seed.status, seed.dates].filter((v) => v != null).join(' · ')
     return JSON.stringify({
       type: 'doc',
       content: [{ type: 'paragraph', content: summary ? [{ type: 'text', text: summary }] : [] }],
     })
   }
   ```
2. Append the method to the returned object literal (after `resolveWikiLink`):
   ```ts
   // --- entity-note seed (A4) -----------------------------------------------
   async ensureEntityNote(pageType, entityType, entityId, seed) {
     // BR-A4-1/IR-5: idempotent — return the existing *_note of THIS type for this entity, else create.
     // Key includes `type` so an A3 [[-stub `note` on the same entity doesn't satisfy a `task_note` request.
     const existing = await pageRepo.findWhere(
       and(
         eq(pages.type, pageType),
         eq(pages.entity_type, entityType),
         eq(pages.entity_id, entityId),
         isNull(pages.deleted_at),
       )!,
     )
     if (existing.length > 0) return existing[0]
     // BR-A4-3: seed → content (minimal TipTap doc), the Yjs-doc genesis; title unset. BR-A4-4: no registry guard.
     return pageRepo.create({
       type: pageType, entity_type: entityType, entity_id: entityId, content: buildSeedContent(seed),
     })
   }
   ```
Notes:
- `existing[0]` is `PageRow` (noUncheckedIndexedAccess OFF) — no `!`/guard; mirrors A2's `createPageLink`.
- `import type { EntityNoteSeed }` is added to the EXISTING `./types` import line in service.ts (currently
  `import { type NotesService, type NotesServiceDeps, JournalExistsError } from './types'`).
- The `pageRepo.create({..., content})` is a valid `CreatePageInput` (`content: z.string().nullish()`), no `journal_date`
  → the createPageSchema refine passes for the 4 `*_note` types (none is `journal`).

## Build step 4 — `services/notes/__tests__/notes-service.test.ts` (append)
`describe('A4 — ensureEntityNote')`, reuse `setup()`. Cases (spec §4):
1. **creates on first call:** `ensureEntityNote('task_note','task','t1',{title:'Buy milk',status:'todo'})` → `type`/
   `entity_type`/`entity_id` correct; `content` non-null; `JSON.parse(row.content!).type === 'doc'`; the doc's text
   contains 'Buy milk' and 'todo'.
2. **idempotent (same id):** second identical call → same `id`; `getPagesForEntity('task','t1')` length 1.
3. **type-keyed idempotency:** `createPage({type:'note', entity_type:'task', entity_id:'t1', title:'stub'})` first, then
   `ensureEntityNote('task_note','task','t1',{title:'x'})` → returned `type==='task_note'`, id ≠ the note's id;
   `getPagesForEntity('task','t1')` length 2.
4. **deterministic content:** `ensureEntityNote('task_note','task','a',SEED)` and `('task_note','task','b',SEED)` (SAME
   seed, different entity) → identical `content` strings.
5. **fixed field order:** a seed `{status:'s', dates:'d', type:'t', title:'ti'}` (scrambled insertion) → the doc's
   text is the **exact** string `'ti · t · s · d'` (assert the full string, not just "contains").
6. **no registry guard:** `ensureEntityNote('task_note','unregistered_type','x',{title:'y'})` resolves (no throw).
7. **soft-deleted → create-fresh:** seed → `softDeletePage(id)` → seed again → new id.
Live-DB smoke (N1): all run after `initVault()`; a real create round-trips (`_sync_hash` stamped).

## Build step 5 — currency
Do NOT touch `current-*` (§XXIX, A-track close). Do NOT wire the content-sync split (AR-9b). Do NOT add cascade (A8).

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1+A2+A3's 27 stay green) · root `pnpm typecheck` 0 · `eslint` 0. All changes are
within `@vida/core` (validators + services/notes) — no cross-package build order concern. Then A4's ░Verification Gate░.

## Deviation note
Any change to a landed seam signature → §XXVIII. Record any divergence in Route History.
