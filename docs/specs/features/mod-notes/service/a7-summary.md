<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A7 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in the aspect docs (intent authority) + the shipped
     pages.summary_config column + @vida/types JournalSummaryConfig + A1-A6. No-Guessing: every claim is [FACT: path:line].
     ⚠ RE-SCOPED at Approval 1 (Victor drift-catch): `buildJournalSummary` is a ② block surface (B7), NOT an ① method —
     the intent authority (contract.md:20 "the /summary block", identity.md:19, current-spec.md:40) is unanimous; the
     slice-map/seam-contract/intent-coverage A7 rows that listed it in ① were the drift (now corrected). -->
<!-- ground-truth docs referenced by bare filename below live at docs/features/notes-and-pages/ (+ delivery/) and docs/specs/features/mod-notes/ -->

# A7 — today /summary config storage  (MOD-notes ① · slice A7)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = the aspect docs (**intent authority**:
`notes-and-pages/contract.md:20`, `identity.md:19` — the `/summary` **block** + its engine are NOT ① ) + the shipped
`pages.summary_config` column (`schema/notes.ts:55`) + the documented `JournalSummaryConfig` type
(`@vida/types/note.ts:83-89,112`) + A1-A6. `current-*` are removed-① residue for *service internals*, but their
**Contract-boundary** statement (`current-spec.md:38-40`) merely restates the authoritative aspect docs and agrees; §XXIX
regenerates the `current-*` bodies at the A-track close.

## 1. Context & scope
A7 adds the **journal-summary CONFIG storage** to the SAME `services/notes/service.ts`: the real read/write of the
existing `pages.summary_config` column. It authors no table (DB-4 shipped the column). **A7 does NOT build the
`/summary` block or its aggregation** — those are downstream (② + MOD-journals).

**In scope (the ① portion of the A7 concern — `contract.md:20` "① keeps only `summary_config` storage",
`current-spec.md:39`):**
- `summaryConfigSchema` (`validators/note.ts`, EXTEND) — the canonical Zod mirror of `JournalSummaryConfig`.
- `getSummaryConfig(pageId): Promise<JournalSummaryConfig | null>` — reads + `JSON.parse`es the `pages.summary_config`
  text column (IR-8).
- `setSummaryConfig(pageId, config: JournalSummaryConfig): Promise<PageRow>` — validates + `JSON.stringify`es +
  writes the column (IR-8); returns the updated `PageRow`.

**Explicitly OUT — homed elsewhere (do NOT build in A7 / ①):**
- **`buildJournalSummary(date, config)` — the `/summary` BLOCK surface — is ② (B7), NOT ①.** The intent authority is
  unanimous: it is *"the `/summary` **block**"* `[FACT: notes-and-pages/contract.md:20]`, *"the aggregation ENGINE
  behind this **block** is the Journals context"* `[FACT: identity.md:19]`, and *"the `buildJournalSummary`
  block-interface **is a ② surface**"* `[FACT: current-spec.md:40]`. B7 renders it, consuming MOD-journals' engine
  directly `[FACT: slice-map.md:36 — "render the `/summary` block … consuming MOD-journals"]`. A7 provides only the
  config it reads.
- **The `/summary` aggregation ENGINE** (`summary(date)` registry + `buildDashboard`) is **MOD-journals ①**
  `[FACT: current-spec.md:38; interpretation.md §1.7; home/CLAUDE.md — engine → MOD-journals #33, "0 lines INTENDED"]`.
- **No cascade on page delete.** `softDeletePage` cascade is **A8** (N8/IR-13), not A7.
- **Wider personalizable `/summary` menu → M1.4 (G5)**; field `[E]` encryption of `summary_config` → M3/DB-5 (M1.0
  pass-through) `[FACT: current-spec.md:41-42]`.

**Pattern to mirror (same file):** the A1 `updatePage` path (`pageRepo.update`, throws "Row not found") for the config
WRITE `[FACT: service.ts:103-107]`; `getPage`/`findById` for the config READ `[FACT: service.ts:99-101]`; the A4
`entityNoteSeedSchema` z.object pattern for `summaryConfigSchema`.

## 2. Business rules (invariants A7 must hold)
- **BR-A7-1 · `summary_config` is a plain `text()` column the SERVICE stringifies/parses (IR-8).** The column is
  `text('summary_config')`, NOT `json<T>()` `[FACT: schema/notes.ts:24,55]`; the service owns the
  `JSON.stringify`/`JSON.parse` at the storage boundary `[FACT: interpretation.md IR-8; validators/note.ts:18-19]`.
  The structured shape is the documented `@vida/types` `JournalSummaryConfig` (5 optional booleans:
  `showHabits`/`showTasks`/`showStudySessions`/`showTransactions`/`showInteractions`) `[FACT: @vida/types/note.ts:83-89]`.
- **BR-A7-2 · `JournalSummaryConfig` is CONSUMED from `@vida/types`, not re-homed.** Unlike A4 `EntityNoteSeed` /
  A6 `NewAttachment` (service-only DTOs with no `@vida/types` home), `JournalSummaryConfig` is a **documented entity
  supporting type** `[FACT: @vida/types/note.ts:83; Page.summary_config:112]` — so the public method signatures type
  against the imported `JournalSummaryConfig`, and `summaryConfigSchema` is its canonical `@vida/core` Zod validator —
  the same **type-in-`@vida/types` / validator-in-`@vida/core`** ownership split the DB-9 enum tuples follow (here for
  an interface, not a tuple, so the `z.enum` mechanism itself doesn't apply — only the ownership boundary does).
  `[FACT: @vida/types/CLAUDE.md — pkg = entity interfaces; validators live in @vida/core]`
- **BR-A7-3 · `getSummaryConfig(pageId)` reads the live page, parses, returns `JournalSummaryConfig | null`.**
  `pageRepo.findById(pageId)` (already notDeleted-filtered, `repository.ts`) `[FACT: service.ts:99-101]`; if the page
  is absent OR `summary_config` is null → return `null`; else `summaryConfigSchema.parse(JSON.parse(row.summary_config))`
  — IR-8 parse + re-validate (defense-in-depth, the *"UI already validated"* validator ethos, `validators/note.ts:17`).
  A **corrupt** persisted value **fails loud** (a natural `SyntaxError`/`ZodError` throw) — it is **NOT** silently
  masked to `null`. No doc sanctions swallowing a corrupt value into a silent default; fail-loud is the service
  convention (cf. `contract.md:33` — the summary surface itself fails loud; and the typed-error convention throughout).
  Returns the structured config, never the raw string (IR-8 — the service owns the boundary).
  (`null` is reserved for the *legitimately unset* case — a page with no `summary_config`, mirroring `getPage`'s
  null-for-absent read, `service.ts:100`.)
- **BR-A7-4 · `setSummaryConfig(pageId, config)` validates, stringifies, writes, returns `PageRow`.**
  `summaryConfigSchema.parse(config)` (async method → `ZodError` surfaces as a rejection, the Notes convention) →
  `pageRepo.update(pageId, { summary_config: JSON.stringify(parsed) })` `[FACT: service.ts:103-107 updatePage pattern;
  repository.ts update throws "Row not found: <id>" if absent]`. Returns the updated `PageRow`. N1: update stamps
  `_sync_hash` via `hashContent`; N2: `_sync_device_id`. Does NOT go through `updatePageSchema.strict()` — this is a
  dedicated single-column writer taking a STRUCTURED config, not a page patch.
- **BR-A7-5 · N7/IR-6 + N1/N2 + Rows.** The config read uses `findById` (notDeleted-filtered); the write reuses the
  existing `pageRepo` (empty-`[E]`, soft-delete, `deviceId`) — **no new repo, no new typed error** `[FACT: service.ts:58]`.
  Returns Drizzle Rows (DB-11 interface reconcile not this entity's job — baseline C2).

## 3. Contract (the A7 surface ② will bind to)
```ts
// validators/note.ts (canonical Zod — EXTEND). The Zod mirror of @vida/types JournalSummaryConfig (note.ts:83-89).
export const summaryConfigSchema = z.object({
  showHabits: z.boolean().optional(),
  showTasks: z.boolean().optional(),
  showStudySessions: z.boolean().optional(),
  showTransactions: z.boolean().optional(),
  showInteractions: z.boolean().optional(),
})

// services/notes/types.ts — import the DOCUMENTED type (do NOT re-home; BR-A7-2):
import type { JournalSummaryConfig } from '@vida/types'

export interface NotesService {                    // GROWS per slice; A7 appends these two rows
  getSummaryConfig(pageId: string): Promise<JournalSummaryConfig | null>
  setSummaryConfig(pageId: string, config: JournalSummaryConfig): Promise<PageRow>
}
```
- Imports: `JournalSummaryConfig` from `@vida/types` (barrel-exported, type-only); `summaryConfigSchema` from
  `../../validators/note`. No new schema/table imports (reuses `pages`/`pageRepo`). **No new error class** (A7 has no
  new failure mode beyond the repo's `Row not found` + `ZodError`).
- `②` consumer: **B7** reads config via `getSummaryConfig` / writes via `setSummaryConfig`, then renders the
  `/summary` **block** by calling MOD-journals' engine — `buildJournalSummary` lives in B7, not here
  `[FACT: slice-map.md:36; seam-contract.md:43]`.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A7 — summary config')` (reuse A1 `setup()`):**
   - **setSummaryConfig writes + getSummaryConfig round-trips (live-DB smoke, N1):** create a page →
     `setSummaryConfig(page.id, { showHabits: true, showTasks: false })` returns a `PageRow` with `summary_config`
     a non-null JSON string; `getSummaryConfig(page.id)` deep-equals `{ showHabits: true, showTasks: false }`
     (structured, not the raw string).
   - **getSummaryConfig null when unset:** a fresh page (no config) → `getSummaryConfig` returns `null`.
   - **getSummaryConfig null for an absent page:** `getSummaryConfig('missing-id')` returns `null` (not a throw).
   - **setSummaryConfig on a missing page rejects:** `setSummaryConfig('missing-id', {})` rejects `Row not found`
     (the repository.update contract) — fail-loud, not a silent no-op.
   - **setSummaryConfig rejects an invalid config (ZodError, fail-loud):** `setSummaryConfig(page.id, { showHabits:
     'yes' } as any)` rejects (async); the rejected write never persisted, so `getSummaryConfig` stays `null`.
   - **empty config round-trips:** `setSummaryConfig(page.id, {})` → `getSummaryConfig` = `{}` (all-flags-off is a
     valid distinct state from `null`/unset).
   - **getSummaryConfig FAILS LOUD on a corrupt stored value (BR-A7-3):** write a raw corrupt string via the reachable
     `updatePage(page.id, {summary_config: …})` path — `'not json {'` → `getSummaryConfig` rejects (`SyntaxError`);
     `'{"showHabits":"yes"}'` → rejects (`ZodError`). Proves the read does NOT mask a corrupt value to `null` (locks out
     a `try/catch→null` regression that every other case would leave green).
2. **Green bars:** `pnpm --filter @vida/core test` all green (A1-A6's 44 stay green) · root `typecheck` 0 · `eslint` 0.
   Run the crypto-heavy suite ALONE (not concurrent with typecheck — env CPU contention → false timeouts).
3. **§XXIX currency:** deferred to the A-track close — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `validators/note.ts` — append `summaryConfigSchema` (z.object per §3) — EXTEND, do not overwrite. (It mirrors the
   `@vida/types` `JournalSummaryConfig`; the field set must stay in lockstep with `note.ts:83-89`.)
2. `services/notes/types.ts` — add `type JournalSummaryConfig` to the `@vida/types` import; append the two interface
   rows. (`PageRow` is already imported; no new error class.)
3. `services/notes/service.ts` — import `summaryConfigSchema` from `../../validators/note`, `type JournalSummaryConfig`
   from `@vida/types` (type-only); append the methods (reuse `pageRepo`, NO new repo):
   ```ts
   async getSummaryConfig(pageId) {
     const page = await pageRepo.findById(pageId)              // notDeleted-filtered
     if (page == null || page.summary_config == null) return null
     return summaryConfigSchema.parse(JSON.parse(page.summary_config))  // IR-8: service parses the boundary
   },
   async setSummaryConfig(pageId, config) {
     const data = summaryConfigSchema.parse(config)            // async → ZodError rejection
     return pageRepo.update(pageId, { summary_config: JSON.stringify(data) })  // IR-8: service stringifies
   },
   ```
4. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A7` cases.
5. Do NOT touch current-* (§XXIX). Do NOT build `buildJournalSummary` / the `/summary` block (② B7). Do NOT build the
   aggregation engine (MOD-journals). Do NOT add cascade (A8). Do NOT change the frozen factory signature.

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to escalate:
- config storage = plain-text JSON the service stringifies/parses → BR-A7-1 (`schema/notes.ts:24,55`·IR-8).
- `JournalSummaryConfig` consumed from `@vida/types` (documented type exists), `summaryConfigSchema` = its canonical
  `@vida/core` Zod validator → BR-A7-2 (`note.ts:83`·`@vida/types/CLAUDE.md`). *(Distinct from A4/A6, whose DTOs had no
  `@vida/types` home and were single-homed as `z.infer`.)*
- `getSummaryConfig` returns structured config or null; absent page → null (not throw) → BR-A7-3.
- `setSummaryConfig` returns the updated `PageRow`; missing page → `Row not found` reject → BR-A7-4.
- **`buildJournalSummary` is OUT of A7/① — it is the ② `/summary` block surface (B7).** The intent authority is
  unanimous: `contract.md:20` ("the `/summary` **block**"), `identity.md:19` ("the aggregation ENGINE behind this
  **block** is the Journals context"), `current-spec.md:40` ("the `buildJournalSummary` block-interface **is a ②
  surface**"). ⚠ **Drift corrected at Approval 1 (Victor):** an earlier draft of this spec placed `buildJournalSummary`
  as an ① reserved seam, following the `slice-map.md:22` / `seam-contract.md:30` / `intent-coverage.md:33` A7 rows —
  those decomposition rows had drifted from the intent authority and are now corrected to home it at B7 (②).
- no cascade (A8), no aggregation engine (MOD-journals), no field `[E]` (M3) → §1 OUT.
