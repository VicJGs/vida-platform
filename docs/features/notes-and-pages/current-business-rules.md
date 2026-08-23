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

## Enforced now (②c — the note editor + autosave + `[[` picker)
Rules the `apps/web` authoring surface + the `@vida/editor` WikiLink surface enforce. Cited to `apps/web/src/app/` +
`packages/editor/src/`.
- **EM-2 — Per-page isolation via an explicit remount key.** The `/note/$id` route reuses one component instance, so
  `NoteEditorSurface` is `key={id}` — a page change remounts + reseeds; no cross-page content bleed. `[FACT: note-detail.tsx]`
- **EM-3 — Autosave is debounced + skip-once + non-optimistic.** `onChange`→debounce(≈600 ms)→`useUpdatePage({content})`;
  the first onChange (the normalized-seed mount echo) is dropped by a skip-once flag (not string-equality — TipTap
  normalizes the seed). `[FACT: use-note-autosave.ts]`
- **EM-4 — Content parse is guarded.** null/blank/corrupt `pages.content` → the empty doc; never throws into render. `[FACT: note-detail.tsx safeParse]`
- **EM-6 — Title editable on the same path.** The title `Input` persists via `useUpdatePage({title})` on blur. `[FACT: note-detail.tsx]`
- **EM-9 — A missing id is `empty`, not error.** `getPage`→null→`deriveTerminalState`→`empty` → "Note not found"
  (never a blank editable editor); only `success` mounts `VidaEditor`. `[FACT: note-detail.tsx; hooks.ts usePage]`
- **EM-10 — Flush on unmount/id change.** Any pending debounced save flushes in cleanup → no lost edit on fast navigate. `[FACT: use-note-autosave.ts]`
- **WL-2b — `[[` two-write ordered, partial-failure tolerant.** `applyWikiSelection` awaits `createPageLink` (the
  `page_links` row) FIRST, then applies the `wikiLink` mark; a rejected `onSelect`/`onCreate` → no mark (no
  content↔relation divergence). `createPageLink` idempotency (NP-5) makes a retry safe. `[FACT: extensions/wiki-link.ts]`
- **WL-4 — Editor stays `@vida/core`-free.** The `[[` picker's data (`resolveWikiLink`/`createPage`/`createPageLink`)
  is INJECTED via the `VidaEditor` `wikiLink` prop; `@vida/editor` imports no `@vida/core`. `[FACT: extensions/wiki-link.ts; note-detail.tsx wiki config]`
- **WL-6 — `wikiLink` markdown is emit-only.** `to-markdown` emits `[[label]]`; `from-markdown` reads it as text (no
  `[[]]` rule); PDF/DOCX degrade to text. The `targetPageId` lives in the `pages.content` JSON (NP-7). `[FACT: serializers/to-markdown.ts]`

## Not enforced here (homed elsewhere — do not add to ①)
- Field-level `[E]` encryption (M1.0 pass-through) → M3/DB-5. `getBacklinks` returns entity-links only; the
  G6 page+entity merge is tentative → ②. `/summary` aggregation engine → MOD-journals ①. FTS5 → DB-8.
  Hard-delete cascade → deferred (no FK; service-driven cleanup, later).
- **Boot precondition (app-owned, not a ① rule):** every repository WRITE computes a keyless `_sync_hash` via
  `hashContent()`, which requires `initVault()` (libsodium WASM loaded) at app startup — independent of `[E]`. The
  ① service assumes it (its tests call `initVault()`); the consuming app must call it at boot (`apps/web/src/db/boot.ts`).
  `[FACT: docs/specs/fixes/vault-not-initialized-on-boot]`

## Status
2026-08-22 — MOD-notes ① + ②a + ②b + **②c** IMPLEMENTED (②c + both bug fixes uncommitted). `@vida/editor` 234 ·
`@vida/web` 218 green (prior run; Node 22 to re-run the jsdom suites locally). See `current-spec.md` +
`docs/specs/features/mod-notes/`. ⚠ ②b+②c real-browser Visual Gate + `/component-audit` owed — runs **locally in
Brave** (chrome-devtools MCP; live-verified 2026-08-22), not blocked on any host/CI upgrade.
