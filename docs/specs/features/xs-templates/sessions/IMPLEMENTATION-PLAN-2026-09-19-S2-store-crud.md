# IMPLEMENTATION-PLAN — xs-templates S2  (§XXVI gate 2 = build-steps)

Status: draft (gate 2). Executes SPEC `PLAN-2026-09-19-S2-store-crud.md` §1–§4. Every step cites a spec rule;
nothing invented. Env: Node 24 via nvm. Branch `xs-templates`.

## Grounding notes folded from gate-2 prep
- **`initVault()` IS required in the S2 test (corrected post-impl, §XXVIII).** The empty-`[E]` seam only skips FIELD
  encryption (`key()` isn't fetched); but `repo.create` still computes each row's `_sync_hash` via
  `vault.hashContent` → `assertReady()`, which throws "Vault not initialized" without `initVault()`. So the test
  MUST `await initVault()` in `beforeEach` (as `enforcer.test.ts`'s `harness()` does). `[FACT: repository.ts:169 computeSyncHash → vault.ts:256 hashContent → :31 assertReady; enforcer.test.ts harness]`
- **`migrate` builds the `templates` table.** The runner applies `ALL_MIGRATIONS` incl. `011_templates` (registered) →
  the live test DB has the table. `[FACT: Step 0 substrate map; migrations/runner.ts ALL_MIGRATIONS]`
- **`repo.create` mints id/_sync_*/timestamps** — pass only domain fields (name, bundle), like `createView`.
  `[FACT: views service.ts:66-73]`

## Build steps (ordered)

1. **`packages/core/src/foundation/templates/service.ts`** — create. Mirror `foundation/views/service.ts`:
   - Imports: `DrizzleDb` (`../../db/adapter`), `createRepository` (`../../db/repository`), `templates`/`TemplateRow`
     (`../../db/schema/foundation/templates`), `TemplateBundle` (`@vida/types`), `TemplateNotFound` (`./types`).
   - `export interface CreateTemplateInput { name: string; bundle: TemplateBundle }` → SPEC §3 (BR-S2-4).
   - `export interface TemplatesService { createTemplate; listTemplates; getTemplate; deleteTemplate }` → SPEC §3 (BR-S2-1).
   - `export function createTemplatesService(db, deviceId)`:
     `const repo = createRepository(db, templates, { deviceId, encryptedFields: [], softDelete: true })` → BR-S2-3.
     - `createTemplate({name, bundle})` → `repo.create({ name, bundle: JSON.stringify(bundle) })` → BR-S2-4.
     - `listTemplates()` → `repo.findAll()` (excludes soft-deleted) → BR-S2-5.
     - `getTemplate(id)` → inline `const row = await repo.findById(id); if (!row) throw new TemplateNotFound(id); return row`
       (no `this.`) → BR-S2-2/5.
     - `deleteTemplate(id)` → `repo.delete(id)` (soft) → BR-S2-1/3.
2. **`packages/core/src/foundation/templates/index.ts`** — add `export * from './service'` (after `./types`). → SPEC §4.
3. **`packages/core/src/foundation/templates/__tests__/service.test.ts`** — create, mirroring
   `capability/__tests__/enforcer.test.ts` setup: `createBetterSqlite3Driver` → `createDrizzleProxy` → `migrate(db)`
   → `createTemplatesService(proxy, 'dev-1')`. Cases (SPEC §4):
   (a) `createTemplate({name:'T', bundle:<minimal envelope>})` → returns a row with fresh id; `bundle` round-trips
   (`JSON.parse(row.bundle)` deep-equals the input envelope). (b) `listTemplates` returns it; after `deleteTemplate`,
   `listTemplates` excludes it. (c) `getTemplate(id)` returns it; `getTemplate('nope')` and `getTemplate(deletedId)`
   reject `TemplateNotFound`. (d) after `createTemplate`, a `syncQueue` row exists with **`operation:'create'`**
   (SYNC_OPERATION = create|update|delete — NOT 'insert'; corrected post-impl §XXVIII) for the new id
   (query `syncQueue` like enforcer.test.ts). → BR-S2-1..5.
4. **Verify** (S2 Verification Gate): `corepack pnpm --filter @vida/core typecheck` → `--filter @vida/core test`.
   Expect tsc 0 + **901 prior + new S2 tests** green. (No `@vida/types` rebuild — S2 adds no new `@vida/types` exports.)

## Deviation
Any divergence → §XXVIII. Update this plan + task `## Build Steps` in lockstep.

## Done-check
SPEC §4 all ticked → S2 done → S3 (capture + invariants).
