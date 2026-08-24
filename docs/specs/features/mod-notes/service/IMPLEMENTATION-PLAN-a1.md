<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A1. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a1-pages-crud-and-factory.md (§2 rules, §4 acceptance). -->

# IMPLEMENTATION-PLAN — A1 pages CRUD + service factory

**Home:** `packages/core/src/services/notes/` (net-new dir; currently empty). Barrel into `core/src/index.ts`.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified import surface (all confirmed on disk)
- `createRepository`, `type DrizzleDb` — `../../db/repository` / `../../db/adapter` `[FACT]`.
- `pages`, `type PageRow`, `type PageInsert` — `../../db/schema/notes` `[FACT: schema/notes.ts:36,104-105]`.
- `createPageSchema`, `updatePageSchema` — `../../validators/note` `[FACT: validators/note.ts:25,49]`.
- `PageType` — `@vida/types` `[FACT: types/note.ts:21]`.
- `and`, `eq`, `isNull` — `drizzle-orm` (the `and(...)!` non-null pattern, spaces precedent).
- Deps types (frozen, unused until A5): `type SpacesService` ← `../../foundation/spaces/service`;
  `type BacklinkResolver` ← `../search/backlink-resolver`; `type TaggableTypeRegistry` ←
  `../../foundation/spaces/types` `[FACT: all three verified]`.

## Build step 1 — `services/notes/types.ts`
```ts
import { z } from 'zod'
import type { createPageSchema, updatePageSchema } from '../../validators/note'
import type { SpacesService } from '../../foundation/spaces/service'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { PageRow } from '../../db/schema/notes'
import type { PageType } from '@vida/types'

export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>

export interface NotesServiceDeps {
  spaces: SpacesService
  backlinks: BacklinkResolver
  registry: TaggableTypeRegistry
}

export interface NotesService {
  createPage(input: CreatePageInput): Promise<PageRow>
  getPage(id: string): Promise<PageRow | null>
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow>
  softDeletePage(id: string): Promise<void>
  getPageByJournalDate(date: string): Promise<PageRow | null>
  getPagesByType(type: PageType): Promise<PageRow[]>
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]>
  listPages(filter: { favorite?: boolean; archived?: boolean; tag?: string }): Promise<PageRow[]>
}

/** NP-2: a live journal already exists for this date. */
export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal already exists for ${journalDate}`)
    this.name = 'JournalExistsError'
  }
}
```
Note: `z.infer<typeof createPageSchema>` requires a `typeof`-imported value, so import the schemas as *values*
(drop `type` on those two) — `import { createPageSchema, updatePageSchema } from '../../validators/note'` at
runtime is fine (they're used in service.ts anyway). Keep the input TYPE ≡ the validator (post-impl lesson from
the removed ①: never hand-redeclare the input shape).

## Build step 2 — `services/notes/service.ts`
```ts
import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { pages, type PageRow } from '../../db/schema/notes'
import { createPageSchema, updatePageSchema } from '../../validators/note'
import type { PageType } from '@vida/types'
import {
  type NotesService, type NotesServiceDeps,
  type CreatePageInput, type UpdatePageInput, JournalExistsError,
} from './types'

export function createNotesService(db: DrizzleDb, deviceId: string, _deps: NotesServiceDeps): NotesService {
  // N9/N2: empty-[E] pass-through, soft-delete, deviceId (mirrors spaces/service.ts:69).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })

  // N7/IR-6: findWhere runs predicates verbatim → always AND isNull(deleted_at). and() is SQL|undefined → `!`.
  const live = (pred: SQL): Promise<PageRow[]> => pageRepo.findWhere(and(pred, isNull(pages.deleted_at))!)

  return {
    async createPage(input) {
      const data = createPageSchema.parse(input) as CreatePageInput          // async method → ZodError = rejection
      if (data.type === 'journal' && data.journal_date != null) {
        const clash = await live(and(eq(pages.type, 'journal'), eq(pages.journal_date, data.journal_date))!)
        if (clash.length > 0) throw new JournalExistsError(data.journal_date) // BR-A1-1 (DB partial-UNIQUE backstops)
      }
      // N1: create → hashContent. Direct-pass of nullish() output into the optional-nullable insert type
      // is sound under tsconfig `exactOptionalPropertyTypes:false` (verified: tsc 0). A future flip to true
      // would surface this coupling here (vs the removed ①'s explicit `?? null/?? false` literal).
      return pageRepo.create(data)
    },

    getPage(id) {
      return pageRepo.findById(id)                                           // already notDeleted-filtered
    },

    async updatePage(id, patch) {
      const data = updatePageSchema.parse(patch) as UpdatePageInput          // .strict() → rejects type/journal_date/unknown
      return pageRepo.update(id, data)                                       // throws `Row not found: <id>` if absent
    },

    async softDeletePage(id) {
      await pageRepo.delete(id)                                              // soft (deleted_at) + enqueue 'update'
    },

    async getPageByJournalDate(date) {
      const rows = await live(and(eq(pages.type, 'journal'), eq(pages.journal_date, date))!)
      return rows[0] ?? null
    },

    getPagesByType(type: PageType) {
      return live(eq(pages.type, type))
    },

    getPagesForEntity(entityType, entityId) {
      return live(and(eq(pages.entity_type, entityType), eq(pages.entity_id, entityId))!)
    },

    listPages(filter) {
      if (filter.tag !== undefined) {                                        // BR-A1-7 fail-loud (D-2)
        throw new Error('listPages({tag}) is available from slice A5')
      }
      const conds: SQL[] = []
      if (filter.favorite !== undefined) conds.push(eq(pages.is_favorite, filter.favorite))
      if (filter.archived !== undefined) conds.push(eq(pages.is_archived, filter.archived))
      const pred = conds.length > 0 ? and(...conds)! : undefined
      return pred ? live(pred) : pageRepo.findWhere(isNull(pages.deleted_at))
    },
  }
}
```
- `listPages` with `tag` throws SYNC (not a rejection) — acceptable: it is an interim guard removed at A5, and
  the method isn't a validator. If the gate prefers uniform async, wrap in `async` — non-material.
- `boolInt` columns compare against JS booleans via drizzle's `eq(pages.is_favorite, true)` (the column maps
  0/1 ↔ boolean). Confirm in the live test.

## Build step 3 — barrel
- `services/notes/index.ts`: `export * from './service'` + `export * from './types'`.
- `core/src/index.ts`: add `export * from './services/notes'` (mirror line 133 `./services/search`).

## Build step 4 — `services/notes/__tests__/notes-service.test.ts`
Harness (copy from `foundation/spaces/__tests__/spaces.test.ts:20-45`): `better-sqlite3` `Database(':memory:')`
→ `createBetterSqlite3Driver` → `createDrizzleProxy` → `migrate(driver)` (applies `012_notes`) → `initVault()` →
build deps stubs (`createTaggableTypeRegistry()`, `createSpacesService(db, dev, reg)`, `createBacklinkResolver(db,
dev)`) → `createNotesService(db, dev, {spaces, backlinks, registry})`.

Cases (spec §4):
1. createPage each of the 6 types → row persisted, `type` correct.
2. createPage journal date X twice → 2nd rejects `JournalExistsError` (instanceof + `.journalDate===X`).
3. createPage journal after soft-deleting the first for date X → SUCCEEDS (D-1 create-fresh).
4. updatePage title → updated row; updatePage `{type:'journal'}` or unknown key → rejects (`.strict()`).
5. updatePage missing id → rejects `/Row not found/`.
6. softDeletePage → getPage/getPagesByType/getPageByJournalDate all exclude it.
7. getPagesForEntity(entityType, entityId) → only matching, non-deleted.
8. listPages({favorite:true}) / ({archived:true}) → correct subset; listPages({tag:'x'}) → throws `/A5/`.
9. **live-DB smoke (N1):** the whole suite runs after `initVault()` and a real createPage round-trips (probe
   read returns the persisted row) — proves `hashContent` runs. **This positive round-trip IS the N1 guard**
   (a `sodium.ready`-not-awaited regression throws on the first write). The uninitialized-throw path has **no
   test seam** — `vault.ts:20 _ready` is a module-private singleton with no reset export (gate-2 verified), so a
   per-process reset is impossible without a new seam. Do NOT fabricate a reset and do NOT cite the vault unit
   test (it inits in `beforeAll`, never asserting the throw). Positive smoke only; out of scope for A1.

## Build step 5 — currency
Do NOT touch `current-*` (they describe the removed ①). §XXIX regenerates them at the A-track close.

## Done = spec §4 green
`pnpm --filter @vida/core test` green · root `pnpm typecheck` 0 · `pnpm lint` 0. Then A1's Verification Gate
(post-impl critique) before A2.

## Deviation note
Any change to a landed seam signature → §XXVIII. Within A1, if step 4.9's negative-path can't be exercised
without a fabricated reset, that's a spec-acceptance clarification (positive smoke + cite the vault unit test),
not a silent drop — record it in the task Route History.
