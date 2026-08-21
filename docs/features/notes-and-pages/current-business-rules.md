<!-- current-business-rules — features/notes-and-pages · the ENFORCED rules in the built slice (durable, §XXIX).
     business-rules.md is the INTENDED authority; THIS records what the shipped code actually enforces, cited to
     file. Born: MOD-notes ① (2026-08-21). -->

# Current Business Rules — Notes & Pages (built slice, MOD-notes ①)

The rules the shipped `@vida/core` Notes & Pages service enforces in code. Inherits the CORE constitution
(ZK-1/2/3, LF-1/2/3). Cited to `packages/core/src/services/notes/`.

## Enforced now (①)
- **NP-2 — One journal per date.** `createPage({type:'journal', journal_date})` calls `getPageByJournalDate`
  first; a live clash throws `JournalExistsError`. In-service (the SQL partial-UNIQUE is migration-only). Journal
  identity cannot be changed via `updatePage` (`.strict()` omits `type`/`journal_date`). `[FACT: service.ts createPage]`
- **NP-5 — Page-links unique + idempotent.** `createPageLink` on the `(source,target)` business key: live → no-op
  return; soft-deleted → revive (`update {deleted_at:null}`); absent → create. Mirrors AR-6 `createLink`. `[FACT: service.ts createPageLink]`
- **NP-6 / SP2 — Registered entity_type only.** A `*_note` page's `entity_type` and every delegated
  `createEntityLink` are validated against the injected `TaggableTypeRegistry`; unregistered → `UnregisteredEntityTypeError`.
  `[FACT: service.ts assertRegistered]`
- **NP-7 — Wiki-links resolve by id.** `resolveWikiLink(text)` returns title candidates (rows); the caller binds a
  `target_page_id` via `createPageLink`. Create-on-miss is an explicit caller compose (not silent). `[FACT: service.ts resolveWikiLink]`
- **NP-8 — Entity notes auto-exist, deterministic, client-side.** `ensureEntityNote` is idempotent (returns the
  existing `*_note` for the entity); the seed `content` is a pure function of the passed parent fields (stable key
  order, no `Date.now`/random) — the row's id/timestamps are repository-generated. `[FACT: service.ts ensureEntityNote + seedContent]`
- **NP-9 — Soft delete.** `softDeletePage`/`removePageLink`/`removeAttachment` set `deleted_at` via the repository
  (`softDelete:true` → enqueues `operation:'update'`). Every read appends `isNull(deleted_at)` (findWhere runs
  predicates verbatim). `[FACT: service.ts; repository.ts]`
- **Async-rejection contract.** Validating methods (`createPage`/`updatePage`/`createEntityLink`) are `async` so a
  Zod/registry failure is a Promise rejection, never a sync throw. `[FACT: service.ts]`
- **Delegation (ADR-018 §3.3).** entity-link/tag WRITES → AR-6 `SpacesService`; entity-link READS → AR-8
  `BacklinkResolver`. Notes composes, never re-implements. `[FACT: service.ts facade methods]`

## Enforced now (②a — the app data plane)
Rules the `apps/web` data plane enforces so React consumers get correct, local-first data. Cited to `apps/web/src/`.
- **DP-1 — No HTTP.** Every read/write resolves against the local SQLite worker via the `SqliteDriver` RPC. `[FACT: db/drizzle.ts, hooks.ts]`
- **DP-2 — Singletons.** Worker · client · `DrizzleDb` · `NotesService` are each module-scope memoized (StrictMode-safe). `[FACT: db/boot.ts, db/drizzle.ts, services/notes-service.ts]`
- **DP-3/DP-4 — Device id.** `getOrCreateDeviceId` persists a UUIDv7 in `app_state` once (never re-generated, never synced — structural: no `_sync_*`); resolved in boot; `getDeviceId()` throws pre-boot (fail-loud). `[FACT: db/device-id.ts, db/boot.ts]`
- **DP-5 — Positional reads.** The worker `values` op returns positional arrays (not object rows) so Drizzle's `mapResultRow` indexes correctly. `[FACT: db/worker.ts, db/client.ts]`
- **DP-8 — Whole-transaction serialization.** A non-reentrant async mutex wraps `db.transaction`, so concurrent writes can't interleave `BEGIN…BEGIN`; reads stay concurrent. `[FACT: db/drizzle.ts; drizzle.test.ts wire-order guard]`
- **DP-6 — RQ invalidate-and-reread.** No optimistic updates; each mutation invalidates its key matrix. `[FACT: app/notes/hooks.ts]`
- **DP-7 — Centralized terminal state.** Read hooks expose `deriveTerminalState(query, isEmpty)` (the UX-4 canon); consumers read `state`, never re-derive. `[FACT: app/notes/hooks.ts; state-conventions/terminal-state.ts]`

## Not enforced here (homed elsewhere — do not add to ①)
- Field-level `[E]` encryption (M1.0 pass-through) → M3/DB-5. `getBacklinks` returns entity-links only; the
  G6 page+entity merge is tentative → ②. `/summary` aggregation engine → MOD-journals ①. FTS5 → DB-8.
  Hard-delete cascade → deferred (no FK; service-driven cleanup, later).

## Status
2026-08-21 — MOD-notes ① IMPLEMENTED. 16 tests green. See `current-spec.md` + `docs/specs/features/mod-notes/`.
