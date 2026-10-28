# Spec: feature:mod-notes-and-pages — S1 Service shell + Pages core

Status: draft
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-notes-and-pages (S1).
Gate: §XXVI Per-Step Build Gate, gate-1 = THIS spec. Authority: backend-intent/parts/notes-and-pages.md.
Slice contract: docs/features/notes-and-pages/delivery/{slice-map,seam-contract,interpretation}.md.

## 1. Identity

The `@vida/core` **Notes & Pages service — Slice 1**: the factory/DI shell + the `pages`-table CRUD surface.
Home: `packages/core/src/services/notes/{types.ts, service.ts, index.ts}` (clean create — service ABSENT on main).

- **What it is:** `createNotesService(deps)` returning a `NotesService` object literal exposing page CRUD, NP-2
  journal uniqueness, `entity_type` registry validation on create, metadata/`summary_config`/`word_count`
  storage, soft-delete — all over the finished `pages` table (`schema/notes.ts:42-73`).
- **What it is NOT:** page-links (S3), attachments + entity-note seed (S2), entity-link/tag facade (S4),
  the `/summary` ENGINE (journals), `[E]` encryption wiring (M3/DB-5), hard-delete cascade (Part 2),
  `word_count` DERIVATION (editor/FTS, DB-8), any ② UI. See slice-map §"seam/deferred".
- **Rows:** NOT-01…10 · 20(createPage half) · 21 · 32(storage) · 39 · 40 · 41 · 42 · 43 · 44 · 45 · 46 · 47.

## 2. Business Rules

- **BR-S1-1 (NP-2, in-service):** `createPage({type:'journal', journal_date})` MUST call `getPageByJournalDate(date)`
  first; a live (non-soft-deleted) row for that date → throw `JournalExistsError(date)`, never overwrite. The SQL
  partial-UNIQUE is a migration-only backstop, not the enforcement path. [FACT: notes-and-pages.md:23 (NOT-09); schema/notes.ts:71]
- **BR-S1-2 (validator refine):** `createPage` runs `createPageSchema` — `journal_date` required iff `type==='journal'`,
  else null. [FACT: validators/note.ts:42-45]
- **BR-S1-3 (NP-6/SP2 registry):** when `createPage` input has a non-null `entity_type`, validate it via
  `deps.registry.isRegistered(entity_type)`; unregistered → throw `UnregisteredEntityTypeError(entity_type)`.
  [FACT: notes-and-pages.md:34 (NOT-20); foundation/spaces/types.ts:16]
- **BR-S1-4 (NP-2 corollary, update immutability):** `updatePage` runs `updatePageSchema` (`.strict()`), which OMITS
  `type`/`journal_date`/`entity_type`/`entity_id`/`deleted_at` — journal identity cannot change via update. Unknown keys
  → Zod rejection. [FACT: validators/note.ts:48-61 (NOT-03)]
- **BR-S1-5 (async rejection):** `createPage`/`updatePage` are `async`; a Zod/registry failure is a Promise rejection,
  never a sync throw. [FACT: notes-and-pages.md:56 (NOT-42); memory factory-service-no-this]
- **BR-S1-6 (soft-delete, NP-9):** `softDeletePage` → `pageRepo.delete(id)` (repo `softDelete:true` sets `deleted_at`
  - enqueues `operation:'update'`). Hard-delete + cascade mechanics DEFERRED (Part 2). [FACT: notes-and-pages.md:18,53 (NOT-04/NOT-39); repository.ts:206]
- **BR-S1-7 (findWhere soft-delete filter):** every custom-predicate read (`getPageByJournalDate`,
  `getPagesByType`, `getPagesForEntity`, `listPages`) MUST append `isNull(pages.deleted_at)` — `findWhere` runs the
  clause verbatim (unlike `findById`/`findAll`). [FACT: repository.ts:213 "findWhere"; memory repository-findwhere-skips-softdelete-filter]
- **BR-S1-8 (word_count pass-through):** `word_count` is an OPTIONAL caller-supplied input (create+update), DB default
  `0`; ① never derives it from content. [FACT: validators/note.ts:39,59; schema/notes.ts:63; notes-and-pages.md:59 (NOT-45)]
- **BR-S1-9 (summary_config storage-only):** `summary_config` is an opaque stringified-JSON `text()` column; S1 reads/writes
  the string via create/update, never parses/aggregates (engine is journals). [FACT: schema/notes.ts:60-61 (NOT-32)]
- **BR-S1-10 (factory shape):** `createNotesService` returns an object literal; intra-service calls use hoisted closures,
  NO `this.` (survives destructured consumption). [FACT: notes-and-pages.md:57 (NOT-43); services/journals/service.ts:43-119]
- **BR-S1-11 (M1.0 encryption pass-through):** `pageRepo` registers `encryptedFields: []` even though title/content/
  cover_image/summary_config are `[E]`-marked; the vault key is fetched only if the set is non-empty. `initVault()` still
  runs on the sync-hash path (verify at the live-store gate). [FACT: schema/notes.ts:33-34; repository.ts:252-254; memory m10-repos-use-empty-encryptedfields-seam]
- **BR-S1-12 (parent_id orphan):** `parent_id` is a plain TEXT self-ref (no FK); S1 sets it on create but enforces no
  cascade — orphan-on-delete is app-layer, DEFERRED with hard-delete. [FACT: notes-and-pages.md:55 (NOT-41); schema/notes.ts:51]
- **BR-S1-13 (NP-1 guard, by construction):** the polymorphic-`pages` API is the ONLY note home; S1 adds no inline
  `notes` column anywhere — an architectural invariant upheld by construction, not a method. [FACT: notes-and-pages.md:54 (NOT-40)]
- **BR-S1-14 (`has_pomodoro` metadata):** a plaintext filter boolean carried on create/update as a pass-through
  (`has_pomodoro: z.boolean().optional()`), DB default `false`; S1 stores it, does not compute it. [FACT: validators/note.ts:38,58; schema/notes.ts:62; notes-and-pages.md:60 (NOT-46)]

**Terminal states:** create → `PageRow` | `JournalExistsError` | `UnregisteredEntityTypeError` | Zod rejection;
get/list → `PageRow`/`PageRow[]`/`null` (never throws on absence, returns null/[]). Fail loud on invalid input.

## 3. Contract

Deps + interface per `seam-contract.md` (S1 methods only). Construction:

```ts
const { db, deviceId, registry } = deps // spaces/backlinks injected but UNUSED in S1
const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })
```

S1 methods (returns Drizzle `PageRow` = `typeof pages.$inferSelect` [FACT: schema/notes.ts:110]):
`createPage(input: CreatePageInput): Promise<PageRow>` · `getPage(id): Promise<PageRow|null>` ·
`updatePage(id, patch: UpdatePageInput): Promise<PageRow>` · `softDeletePage(id): Promise<void>` ·
`getPageByJournalDate(date): Promise<PageRow|null>` · `getPagesByType(type: PageType): Promise<PageRow[]>` ·
`getPagesForEntity(entityType, entityId): Promise<PageRow[]>` · `listPages({favorite?,archived?}): Promise<PageRow[]>`.
Errors (`types.ts`, bespoke `extends Error`, stable `.name`): `JournalExistsError(journalDate)`,
`UnregisteredEntityTypeError(entityType)`. [FACT: notes-and-pages.md:24,35,58 (NOT-10/21/44); ServiceError reconcile → DB-11]
Input types: `CreatePageInput = z.infer<typeof createPageSchema>`, `UpdatePageInput = z.infer<typeof updatePageSchema>`.

## 4. Acceptance

- [ ] `packages/core/src/services/notes/{types.ts,service.ts,index.ts}` created; `index.ts` barrel exports `createNotesService` + the two error classes + input types.
- [ ] All 8 S1 methods implemented per §3, returning `PageRow`(s).
- [ ] `createPage`: validates via `createPageSchema`; NP-2 pre-check throws `JournalExistsError` on live clash (BR-S1-1); `entity_type` non-null validated via `registry.isRegistered` → `UnregisteredEntityTypeError` (BR-S1-3); async rejection (BR-S1-5).
- [ ] `updatePage`: `.strict()` whitelist rejects `type`/`journal_date`/`entity_*`/`deleted_at` + unknown keys (BR-S1-4).
- [ ] Every custom-predicate read appends `isNull(pages.deleted_at)` (BR-S1-7) — asserted by a test that soft-deletes then re-queries.
- [ ] No `this.` anywhere; object-literal factory (BR-S1-10) — a destructure-consumption test passes.
- [ ] `word_count` pass-through: absent → 0; supplied → stored (BR-S1-8).
- [ ] Typed errors have stable `.name`; thrown as Promise rejections.
- [ ] `tsc --noEmit` 0 errors; ESLint 0.
- [ ] **Verification Gate:** Vitest unit (happy + ≥2 failure paths per method incl. JournalExists, UnregisteredEntityType, strict-reject) + typed-error asserts + **live-store smoke** (real SQLite: create→getByJournalDate clash→soft-delete→re-query excludes it; entity_type validation against a seeded registry). All @vida/core tests stay green (currently 965).

## 5. Implementation Prompt

1. `types.ts` — declare `NotesServiceDeps` ({db, deviceId, spaces: SpacesService, backlinks: BacklinkResolver, registry: TaggableTypeRegistry}), the `NotesService` interface (S1 methods now; S2–S4 appended per slice), `CreatePageInput`/`UpdatePageInput` (z.infer), and the two error classes (`extends Error`, set `.name`). Satisfies §3, BR-S1-10/BR-S1-5. Import `PageRow` from `../../db/schema/notes`, registry/spaces/backlink types from their foundation modules.
2. `service.ts` — `import { and, eq, isNull } from 'drizzle-orm'`; `import type { DrizzleDb } from '../../db/adapter'`; `createRepository` from `../../db/repository`; `pages` from `../../db/schema/notes`; `createPageSchema`/`updatePageSchema` from `../../validators/note`. Construct `pageRepo` per §3 (BR-S1-11). Mirror `services/journals/service.ts:43-119` exactly (hoisted closures, object-literal return).
3. Hoisted helper `assertRegistered(entityType: string|null|undefined)`: if non-null and `!registry.isRegistered(entityType)` → throw `UnregisteredEntityTypeError`. Satisfies BR-S1-3 (reused by S4 later).
4. `createPage`: `createPageSchema.parse(input)` (async, rejection on fail); if `type==='journal'` → `getPageByJournalDate(journal_date)` live-clash check → `JournalExistsError` (BR-S1-1); `assertRegistered(entity_type)` (BR-S1-3); `pageRepo.create(parsed)` → `PageRow`.
5. `getPage` → `pageRepo.findById(id)`. `updatePage` → `updatePageSchema.parse(patch)` (BR-S1-4) → `pageRepo.update(id, parsed)`. `softDeletePage` → `pageRepo.delete(id)` (BR-S1-6).
6. `getPageByJournalDate(date)` → `pageRepo.findWhere(and(eq(pages.journal_date, date), eq(pages.type,'journal'), isNull(pages.deleted_at)))` → first or null (BR-S1-7). `getPagesByType(type)` → `findWhere(and(eq(pages.type,type), isNull(pages.deleted_at)))`. `getPagesForEntity(et,eid)` → `findWhere(and(eq(pages.entity_type,et), eq(pages.entity_id,eid), isNull(pages.deleted_at)))`. `listPages(f)` → `findWhere(and(...f.favorite?[eq(pages.is_favorite,true)]:[], ...f.archived?[eq(pages.is_archived,true)]:[], isNull(pages.deleted_at)))`.
7. `services/notes/index.ts` — barrel (BR-S1-10 exports: `createNotesService`, `NotesService`, input types, error classes).
8. **Root barrel (G-S1-1):** add `export * from './services/notes'` to `packages/core/src/index.ts` after the journals line (mirrors `index.ts:142`) so the service is consumable by ② + other modules. Then Acceptance §4 is the done-check: `tsc`, tests, live-store smoke.

**Exact dep-import paths (no guessing):** `SpacesService` ← `../../foundation/spaces/service`; `BacklinkResolver` ← `../../services/search/backlink-resolver`; `TaggableTypeRegistry` ← `../../foundation/spaces/types`; `DrizzleDb` ← `../../db/adapter`; `createRepository` ← `../../db/repository`; `pages`/`PageRow` ← `../../db/schema/notes`; `createPageSchema`/`updatePageSchema` ← `../../validators/note`; `and`/`eq`/`isNull` ← `drizzle-orm`.

## 6. Open UNKNOWNs / Decisions Needed

- None blocking. `word_count` RESOLVED (BR-S1-8, doc/code-grounded). `entity_type` registry method RESOLVED (`isRegistered`).
  `EntityNoteSeed`/`NewAttachment` input types belong to S2 (not S1). G6 merge + `focus_sessions` value = S4/Sessions, not S1.

## 7. Change Log

| Date       | Session                  | Change                                                              |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| 2026-09-19 | mod-notes-and-pages (S1) | initial draft — gate-1 artifact after Decomposition Gate Approval 1 |
