# PLAN — xs-templates S2: store CRUD (`TemplatesService`)  (§XXVI gate 1 = the SPEC)

Status: draft (gate 1)
Unit: Slice **S2** of the xs-templates head (#36) — the `templates` store CRUD, over S1's types.
Source-repo: vida-platform · `@vida/core`
Profile: Add Backend Component · Scenario: Entity Re-scope (recovery)
Grounding rule (Victor directive): every element traces to a `[FACT: cite]`. No invented shape or op.
Legs: XCU-01 (store CRUD) · XCU-09 (name/bundle `[E]` M1.0 pass-through — ratify). `[FACT: slice-map.md S2]`
Precedent (mirror): `foundation/views/service.ts` (factory CRUD over Repository). `[FACT: service.ts:56-90]`

---

## 1. Identity

S2 authors `TemplatesService` at `packages/core/src/foundation/templates/service.ts` — a **thin CRUD** over the
built `templates` table via the DB-6 Repository (→ co-transactional `sync_queue`). It is the "light templates
store" of ADR-009 §3.3. `[FACT: ADR-009:70-71; templates.ts:15-22; xcut-templates XCU-01]`

**What it is NOT:** NOT the capture transform (S3) — it does not read a Space or build a bundle; a caller hands it
a bundle. NOT instantiate/fork (S4). NOT `updateTemplate` — templates follow the FORK model (no propagation, no
edit-in-place); you save a new bundle, you do not mutate a stored one, so XCU-01 lists exactly
**create/list/get/soft-delete**. `[FACT: ADR-009:59-65 (fork, no live link); xcut-templates XCU-01 "create/list/get/soft-delete"]`

## 2. Business Rules

- **BR-S2-1 (four ops only, no update).** `createTemplate` · `listTemplates` · `getTemplate` · `deleteTemplate`
  (soft). No `updateTemplate` — the fork model has no edit-in-place. `[FACT: xcut-templates XCU-01; ADR-009:59-65]`
- **BR-S2-2 (factory-service shape).** `createTemplatesService(db, deviceId)` returns an object literal; intra-service
  calls hoist to closures / inline (never `this.` — breaks on destructure); validating methods async-reject.
  `[FACT: foundation/views/service.ts:56 (createViewsService); [[factory-service-no-this-for-intra-calls]]]`
- **BR-S2-3 (Repository, syncable soft-delete, M1.0 `[E]` pass-through).** `createRepository(db, templates,
  { deviceId, encryptedFields: [], softDelete: true })` — writes flow to `sync_queue`; `deleteTemplate` = soft
  (deleted_at set, row still syncs `operation:'update'`); `encryptedFields: []` at M1.0 (name/bundle `[E]` is the
  M3 target — XCU-09 ratify). `[FACT: views service.ts:60; repository.ts:316,458-461; XCU-09; [[m10-repos-use-empty-encryptedfields-seam]]]`
- **BR-S2-4 (bundle serialized to TEXT on write; opaque on read).** `createTemplate` accepts a `TemplateBundle`
  (S1 envelope) + `name`, and stores `bundle` as `JSON.stringify(bundle)` (object→JSON TEXT, exactly the views
  filter/grouping stringify precedent); `name` verbatim. Reads return the row with `bundle` as raw TEXT — parsing
  is the consumer's concern (S4 instantiate), never S2's. This transport stringify is NOT the per-member
  serialization schema (that is S3). `[FACT: views service.ts:66-73 (JSON.stringify on write); templates.ts:19-20 (bundle TEXT "opaque serialized"); ADR-009:112-115 (member schema = S3)]`
- **BR-S2-5 (absent → typed reject; list excludes soft-deleted).** `getTemplate(id)` with no live row → reject
  `TemplateNotFound(id)` (S1 error), async not sync. `listTemplates` uses `repo.findAll` → `isNull(deleted_at)`
  (soft-deleted excluded; NOT `findWhere`, which skips the filter). `[FACT: views service.ts:80-84 (getView→ViewNotFound); repository.ts:316; [[repository-findwhere-skips-softdelete-filter]]]`

## 3. Contract

**`packages/core/src/foundation/templates/service.ts`** (exported):
```ts
export interface CreateTemplateInput { name: string; bundle: TemplateBundle }          // BR-S2-4
export interface TemplatesService {
  createTemplate(input: CreateTemplateInput): Promise<TemplateRow>                      // BR-S2-1/3/4
  listTemplates(): Promise<TemplateRow[]>                                               // BR-S2-1/5 (excludes soft-deleted)
  getTemplate(id: string): Promise<TemplateRow>                                         // BR-S2-1/5 (→ TemplateNotFound)
  deleteTemplate(id: string): Promise<void>                                             // BR-S2-1/3 (soft)
}
export function createTemplatesService(db: DrizzleDb, deviceId: string): TemplatesService
```
Imports: `TemplateBundle` from `@vida/types`; `templates`/`TemplateRow` from `db/schema/foundation/templates`;
`TemplateNotFound` from `./types`; `createRepository` from `db/repository`. `[FACT: mirror views service.ts:9-13]`

## 4. Acceptance
- [ ] `service.ts` exports `TemplatesService`, `CreateTemplateInput`, `createTemplatesService`; re-exported from
  `foundation/templates/index.ts`. (BR-S2-1)
- [ ] Vitest (real store — better-sqlite3 + migrations, the enum-parity/introspection fixture style):
  create→list→get→delete round-trips; `getTemplate` on an absent/deleted id rejects `TemplateNotFound`;
  `listTemplates` excludes a soft-deleted row; a `create` enqueues a `sync_queue` insert row; `bundle` persists as
  the stringified envelope and round-trips. (BR-S2-1..5)
- [ ] `tsc --noEmit` 0 (`@vida/core`); regression floor **901** holds (+ new S2 tests).

## 6. Open UNKNOWNs / Decisions Needed
- None. (Whether `getTemplate`/`listTemplates` should JSON.parse `bundle` for the caller is resolved: NO — S2 is a
  pure store, parsing is S4's concern, mirroring views' engine-parses-not-service split. `[FACT: views engine.ts parses; service stores TEXT]`)

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | 2026-09-19-xs-templates | S2 spec drafted (gate 1) |
