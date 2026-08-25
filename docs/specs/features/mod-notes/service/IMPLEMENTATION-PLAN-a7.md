<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A7. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a7-summary.md (§2 rules, §4 acceptance). Re-scoped: config storage ONLY (buildJournalSummary → ② B7). -->

# IMPLEMENTATION-PLAN — A7 today /summary config storage

**Home:** `services/notes/{types,service}.ts` + `validators/note.ts` + tests (all `@vida/core`). No new file.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).
**Scope:** `getSummaryConfig` + `setSummaryConfig` + `summaryConfigSchema`. **NOT** `buildJournalSummary` (② B7).

## Verified import/shape surface (confirmed on disk)
- Column: `pages.summary_config = text('summary_config')` (nullable) `[FACT: schema/notes.ts:55]`; `PageRow.summary_config:
  string | null` (`$inferSelect`, :104). Plain `text()`, NOT `json<T>()` — the service stringifies/parses (IR-8, BR-A7-1).
- Type: `JournalSummaryConfig` (5 optional booleans) exported from `@vida/types` `[FACT: @vida/types/note.ts:83-89;
  barrel index.ts]`; `Page.summary_config: JournalSummaryConfig | null` (:112). CONSUMED, not re-homed (BR-A7-2).
- `pageRepo.update(id, patch)` accepts a partial of the updatable columns → `{ summary_config: string }` typechecks;
  throws `Row not found: <id>` if absent `[FACT: service.ts:103-107 (updatePage uses pageRepo.update); repository.ts update]`.
- `pageRepo.findById(id): Promise<PageRow | null>`, already notDeleted-filtered `[FACT: service.ts:99-101]`.
- `service.ts` already imports what's needed (`eq/and/isNull/SQL`, `createRepository`, `pages`, `pageRepo`); A7 adds
  NO new repo/table import — only `summaryConfigSchema` (value). `JournalSummaryConfig` is imported ONLY in `types.ts`
  (the interface), NOT `service.ts` (the bodies infer from the interface → the name is unused there; §XXVIII deviation).
- `validators/note.ts` — `z` imported; append `summaryConfigSchema` after `newAttachmentSchema` (EXTEND). Existing
  `createPageSchema`/`updatePageSchema` already carry `summary_config: z.string().nullish()` (the storage-string form,
  :38,58) — A7's `summaryConfigSchema` is the STRUCTURED-object validator, a distinct concern (config-in, not page-patch).

## z.infer / assignability check (empirical, No-Guessing)
- `summaryConfigSchema` = `z.object({ showHabits: z.boolean().optional(), … })`; `z.infer` = `{ showHabits?: boolean |
  undefined; … }`, structurally equal to `JournalSummaryConfig` (`{ showHabits?: boolean; … }`). Under the repo's
  `exactOptionalPropertyTypes:false` (A1 gate-2 FACT) the two are mutually assignable → `getSummaryConfig` may return
  `summaryConfigSchema.parse(...)` typed as `JournalSummaryConfig`, and `setSummaryConfig(config: JournalSummaryConfig)`
  may pass `config` into `.parse()`. No cast needed.
- `z.object` (non-strict) STRIPS unknown keys on parse — a config with stray keys is normalized to the 5 known flags
  (acceptable; the config is a closed 5-flag shape). `JSON.parse` of a stored blob → `.parse()` re-validates
  (defense-in-depth, BR-A7-3).

## Build step 1 — `validators/note.ts` (EXTEND)
Append after `newAttachmentSchema`:
```ts
/** A7 journal-summary config. The canonical Zod mirror of @vida/types JournalSummaryConfig (note.ts:83-89);
 *  keep the field set in lockstep. Stored stringified in pages.summary_config (text, IR-8). */
export const summaryConfigSchema = z.object({
  showHabits: z.boolean().optional(),
  showTasks: z.boolean().optional(),
  showStudySessions: z.boolean().optional(),
  showTransactions: z.boolean().optional(),
  showInteractions: z.boolean().optional(),
})
```

## Build step 2 — `services/notes/types.ts`
1. Extend the `@vida/types` import to add the type: it's currently `import { type PageType, MAX_ATTACHMENT_BYTES } from
   '@vida/types'` → add `type JournalSummaryConfig` (a type-only member of the same import):
   `import { type PageType, type JournalSummaryConfig, MAX_ATTACHMENT_BYTES } from '@vida/types'`.
2. Append the interface rows (after the A6 attachments block):
   ```ts
     // --- summary config (A7) ---------------------------------------------------
     // ① owns ONLY summary_config storage; the /summary block (buildJournalSummary) is ② (B7). See a7-summary.md §1.
     getSummaryConfig(pageId: string): Promise<JournalSummaryConfig | null>
     setSummaryConfig(pageId: string, config: JournalSummaryConfig): Promise<PageRow>
   ```
   No new error class (A7 has no failure mode beyond repo `Row not found` + `ZodError`).

## Build step 3 — `services/notes/service.ts`
1. Add to the validator import: `import { createPageSchema, updatePageSchema, summaryConfigSchema } from
   '../../validators/note'`.
2. **[§XXVIII deviation — applied]** Do NOT add `type JournalSummaryConfig` to the `service.ts` `@vida/types` import.
   The method bodies infer their param/return types from the `: NotesService` interface annotation (like `getPage(id)`),
   so the type NAME is never referenced in `service.ts` — importing it there is an UNUSED import (`noUnusedLocals`/eslint
   fail). The type is imported+used only in `types.ts` (step 2). `service.ts` adds only `summaryConfigSchema` (value).
3. Append the methods to the returned object literal (after the A3 `resolveWikiLink`, before the closing `}`):
   ```ts
   // --- summary config (A7 · seam-contract:30) ------------------------------
   async getSummaryConfig(pageId) {
     const page = await pageRepo.findById(pageId)              // notDeleted-filtered (repository.ts)
     if (page == null || page.summary_config == null) return null
     // BR-A7-3: IR-8 parse + re-validate (defense-in-depth, the "UI already validated" validator ethos,
     // validators/note.ts:17). A corrupt persisted value FAILS LOUD (natural SyntaxError/ZodError throw) —
     // NOT silently masked to null — per the fail-loud convention (contract.md:33; typed-error convention).
     return summaryConfigSchema.parse(JSON.parse(page.summary_config))
   },
   async setSummaryConfig(pageId, config) {
     const data = summaryConfigSchema.parse(config)            // async → ZodError surfaces as a rejection
     return pageRepo.update(pageId, { summary_config: JSON.stringify(data) })  // IR-8: service stringifies
   },
   ```

## Build step 4 — `services/notes/__tests__/notes-service.test.ts` (append)
`describe('A7 — summary config')`, reuse `setup()`. Cases (§4):
1. **round-trip (live-DB smoke, N1):** create a page P; `setSummaryConfig(P.id, { showHabits: true, showTasks: false })`
   → a `PageRow` whose `summary_config` is a non-null string; `getSummaryConfig(P.id)` `toEqual({ showHabits: true,
   showTasks: false })` (structured object, not the raw string).
2. **null when unset:** fresh page (no config write) → `getSummaryConfig(P.id)` `toBeNull()`.
3. **null for absent page:** `getSummaryConfig('missing-id')` `toBeNull()` (not a throw).
4. **missing-page write rejects:** `await expect(setSummaryConfig('missing-id', {})).rejects.toThrow(/Row not found/)`.
5. **invalid config rejects (ZodError, fail-loud):** `await expect(setSummaryConfig(P.id, { showHabits: 'yes' } as any))
   .rejects.toBeInstanceOf(ZodError)` (import `ZodError` from `zod`); then `getSummaryConfig(P.id)` still `toBeNull()`
   (the rejected write never persisted).
6. **empty config round-trips:** `setSummaryConfig(P.id, {})` → `getSummaryConfig(P.id)` `toEqual({})` (distinct from `null`).
7. **corrupt stored value → FAILS LOUD (BR-A7-3):** `updatePage(P.id, { summary_config: 'not json {' })` →
   `getSummaryConfig(P.id)` `rejects.toThrow()` (SyntaxError); `updatePage(P2.id, { summary_config: '{"showHabits":"yes"}' })`
   → `rejects.toBeInstanceOf(ZodError)`. Locks out a `try/catch→null` regression.

## Build step 5 — currency
Do NOT touch `current-*` (§XXIX; A-track close). Do NOT build `buildJournalSummary` / the `/summary` block (② B7).
Do NOT build the aggregation engine (MOD-journals). Do NOT add cascade (A8).

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1-A6's 44 stay green → 51) · root `pnpm typecheck` 0 · `eslint` 0. All within
`@vida/core`. Then A7's ░Verification Gate░ (post-impl critique). **Run test ALONE**, not concurrent with typecheck
(env CPU contention → false crypto timeouts).

## Deviation note
Any change to a landed seam signature → §XXVIII. Record any divergence in Route History.
