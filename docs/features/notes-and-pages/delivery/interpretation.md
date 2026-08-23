<!-- delivery/interpretation.md — Entity Delivery Flow · Phase 1.5 (INTERPRETATION LAYER), recovery variant.
     Reads the ░Documentation-Gate-PASSED░ corpus + the BUILT code adversarially and writes down what they leave
     IMPLICIT, so reconciliation rests on stated facts. Four sections. Feeds ░Interpretation Gate░ (Step 3).
     Born 2026-08-22. No-Guessing: FACT / INTERPRETATION / UNKNOWN on every material claim. -->

# Interpretation — Notes & Pages (make the implicit explicit)

Source is trusted (Documentation Gate PASS, `baseline.md` §3 resolution). This layer surfaces the hidden
dependencies/needs/ownership/invariants across BOTH planes so the cross-plane reconciliation (Step 4) can tag
and route without guessing.

## DEPENDENCIES — every upstream

### ① backend (`@vida/core` NotesService)
- `createRepository(db, table, {deviceId, encryptedFields:[], softDelete:true})` — the encrypting repo the 4
  Notes repos wrap. `[FACT: current-business-rules.md:8; packages/core/src/db/repository.ts]`
- **AR-6 `SpacesService`** (entity-link/tag WRITES) + **AR-8 `BacklinkResolver`** (entity-link READS) + a
  **`TaggableTypeRegistry`** — all three INJECTED, not self-constructed. `[FACT: current-spec.md:15,26-28]`
- **DB-4 schema:** `pages`/`page_links`/`note_attachments` (`schema/notes.ts`); `entity_links`/`entity_tags`
  live in the **AR-6 Spaces substrate** (`schema/foundation/spaces.ts`), NOT `notes.ts`. `[FACT: mod-notes.md:152]`
- `@vida/types` validators (`validators/note.ts`: `createPageSchema`/`updatePageSchema`). `[FACT: current-spec.md:30]`

### ②a data plane (`apps/web`)
- **wa-sqlite worker + `drizzle-orm/sqlite-proxy`** — the off-main-thread SQLite engine; `WorkerDbClient`
  (AR-4) is the main↔worker RPC. `[FACT: apps/web/src/db/{worker,client}.ts]`
- **`initVault()` / libsodium** (`@vida/core encryption/vault.ts`) — see NEEDS. `[FACT: db/boot.ts:58]`
- **`app_state` table (DB-7)** — device-id + first-run KV; never-synced (no `_sync_*`). `[FACT: db/device-id.ts]`

### ②b/②c surface
- **UI-2 views** (`@vida/ui` `ListView`/`GalleryView`/`NeuralGraph`) · **UI-1** `Card`/`Input` · **UI-3**
  `@vida/editor` `VidaEditor` + `@tiptap/suggestion@3.30.0` · **UX-4** `deriveTerminalState` · Zustand
  `notes-ui-store` · TanStack Router · the shell command-bar. `[FACT: current-spec.md:59-101]`

## NEEDS — every precondition to function (the vault-bug class lives here)

1. **libsodium WASM loaded at boot** — every repository WRITE computes a **keyless** `_sync_hash` via
   `hashContent()` → `assertReady()`; **independent of `[E]`**. Skipping `initVault()` → every write throws
   `Vault not initialized`. This was THE implicit dependency that crashed the browser. Now explicit.
   `[FACT: current-business-rules.md:67-70; db/boot.ts:58; docs/specs/fixes/vault-not-initialized-on-boot]`
2. **device-id resolved before any write** — `getOrCreateDeviceId` runs in `ensureDbReady()`; `getDeviceId()`
   throws pre-boot (fail-loud), and writes stamp `_sync_device_id`. `[FACT: db/boot.ts:59; db/device-id.ts:56-61]`
3. **boot ordering is a hard gate** — `ensureDbReady()` (initVault ∥ open, then device-id) MUST resolve before
   any hook fires; `App.tsx` gates render on it. A hook that runs pre-boot hits an unopened DB / unloaded WASM.
   `[FACT: current-spec.md:47; mod-notes.md:142 (App.tsx gates render on ensureDbReady())]`
4. **`entity_type` registered** — a `*_note` page or `createEntityLink` validates the type against the injected
   registry (SP2); unregistered → `UnregisteredEntityTypeError`. So the registry must carry every type Notes
   links. `[FACT: current-business-rules.md:16-18]`
5. **the `[[` picker needs its config INJECTED** — no `wikiLink` config → the Suggestion returns `[]` (zero
   cost, no crash); with it, `query`/`onCreate`/`onSelect` are the app's. The editor imports **no** `@vida/core`.
   `[FACT: current-business-rules.md:58-59 (WL-4); packages/editor/src/extensions/wiki-link.ts]`
6. **a new note seeds an empty doc `{type:'doc'}`** — ProseMirror omits `content` when empty; the editor's
   `assertEditorDocument` MUST accept the missing key or every new note crashes on mount.
   `[FACT: docs/specs/fixes/editor-empty-doc-assert-crash]`
7. **Node 22 to reproduce the jsdom suites locally** — a *verification-environment* need, not a runtime one
   (Vite dev + the Brave Visual Gate run on 20). `[FACT: baseline.md §7; TASKS.md:9]`

## ORGANIZATION — owns vs consumes vs delegates

| | Notes & Pages |
|--|--|
| **OWNS** | `pages`/`page_links`/`note_attachments` + their CRUD · `resolveWikiLink` · `ensureEntityNote` (NP-8) · the `/notes` surface + `note/$id` editor + autosave · the `@vida/editor` `wikiLink` mark + `[[` picker |
| **CONSUMES** | DB-4 schema · AR-4 data plane · UI-1/UI-2/UI-3 components · UX-4 terminal-state canon · the injected registry |
| **DELEGATES** | entity-link/tag **WRITES** → AR-6 `SpacesService` · entity-link **READS** → AR-8 `BacklinkResolver` · `/summary` aggregation ENGINE → MOD-journals · FTS5 → DB-8 · `[E]` encryption → M3/DB-5 · saved-view selection → design-pass |

`[FACT: current-spec.md:103-108; current-business-rules.md:29-30,63-66]`

**Cross-plane ownership tension (INTERPRETATION):** NEED #1 (libsodium-at-boot) is today satisfied **app-side**
(`apps/web/db/boot.ts`). But the need belongs to *every* repository write on *every* platform → it SHOULD be
`@vida/core`-owned (DB-open path), or mobile/desktop re-hit the identical crash. This is exactly the spun-out
`core-vault-init-on-db-open` task — **a backend slice**, the cross-plane row a UI-only sweep would strand.
`[FACT: TASKS.md:11; .claude/tasks/core-vault-init-on-db-open.md]`

## IMPLICIT RULES — invariants a doc implies but never states

- **IR-1 · keyless-hash gate** — "M1.0 is `[E]` pass-through" reads as "no crypto needed"; FALSE. `_sync_hash`
  is keyless BLAKE2b and still needs libsodium. (Now explicit — NEED #1.) `[FACT: current-business-rules.md:67]`
- **IR-2 · empty-doc shape** — a doc doc says "seed empty content"; it never says ProseMirror emits `{type:'doc'}`
  (no `content` key), which a strict assert rejects. (Now explicit — NEED #6.) `[FACT: editor-empty-doc-assert-crash]`
- **IR-3 · plaintext title search is M1.0-only** — `resolveWikiLink` LIKE-searches titles; works ONLY because
  titles are plaintext at M1.0. When `[E]` lands (M3) it must move client-side. A latent forward constraint.
  `[FACT: current-spec.md:24 ("M1.0 plaintext; M3 client-side")]`
- **IR-4 · out-of-React invalidation** — the command-bar "New note" runs OUTSIDE React, so it must MANUALLY
  invalidate the query cache (a mutation hook would auto-invalidate). `[FACT: current-spec.md:67-69; commands.ts:31-32 (:34 = catch)]`
- **IR-5 · mount-echo skip** — TipTap re-normalizes the seed doc on mount → a spurious `onChange`; autosave must
  skip the FIRST (a skip-once flag, NOT string-equality). `[FACT: current-business-rules.md:47-49 (EM-3)]`
- **IR-6 · whole-transaction serialization** — the worker RPC is per-statement, so without the DP-8 mutex two
  txns' `BEGIN…BEGIN` interleave; the mutex's unit is the WHOLE txn, not the RPC. `[FACT: current-business-rules.md:38]`
- **IR-7 · positional rows** — Drizzle's `mapResultRow` reads by index; the worker must return positional arrays
  (`values` op), or object rows silently mis-index columns. `[FACT: current-business-rules.md:37 (DP-5)]`
- **IR-8 · two-write ordering** — the `[[` picker writes the `page_links` row FIRST, applies the mark SECOND;
  a rejected write → no mark (no content↔relation divergence); NP-5 idempotence makes retry safe.
  `[FACT: current-business-rules.md:55-57 (WL-2b)]`

## UNKNOWNs (flagged, not guessed)

- **U-1** — `getBacklinks` ships **entity-links only**; the G6 page-links+entity-links MERGE is marked
  *tentative → ②* (aspect `contract.md:15` says "merged"). Whether ②d builds the merge or keeps entity-only is
  an OPEN ②d-scope question — do NOT let reconciliation mark the entity-only ship "❌ wrong"; it is a recorded
  tentative subset. `[FACT: current-business-rules.md:64-65; contract.md:15]`
- **U-2** — the 6th page type `task_group_note` (identity/business-rules enumerate 6) — spot-check it against
  `note.ts PageType` during the sweep (Doc-Gate nit N3). Non-blocking. `[FACT: identity.md:10]`
