<!-- Entity Delivery Flow · Step 1.5 (INTERPRETATION LAYER) · Notes & Pages · base flow (§3).
     Reads the GATED yardstick (5 aspect docs + baseline + intake, cleared at the Step 1.25 Documentation Gate)
     ADVERSARIALLY and writes down everything they leave IMPLICIT, so Decomposition rests on stated facts.
     Four sections (EDF §4): DEPENDENCIES · NEEDS · ORGANIZATION · IMPLICIT RULES.
     No-Guessing: [FACT: path:line] / [INTERP] / [UNKNOWN]. Feeds the ░Interpretation Gate░ (Step 1.75). -->

# Interpretation — Notes & Pages

> The baseline *organizes* the docs; this layer *reads them adversarially* and states what they leave implicit.
> Its teeth: the **NEEDS** section is where the `vault-not-initialized-on-boot` dependency class is written down
> *before* build. Source docs were cleared at the Documentation Gate (2026-08-23, REVISE→resolved).

---

## 1. DEPENDENCIES — every upstream (services · schema · packages · seams · modules)

### 1.1 Schema (the persistence substrate)
- **OWNED tables** `pages` · `page_links` · `note_attachments` — `[FACT: packages/core/src/db/schema/notes.ts:36,70,85]`; migration `012_notes.ts`.
- **CONSUMED tables** `entity_links` · `entity_tags` — AR-6 substrate, **not** notes-owned `[FACT: schema/foundation/spaces.ts:51,67; notes.ts:6-8]`.
- **entity_type registry** `ENTITY_TYPES` — the polymorphic-target source; `page`/`note`/`journal` are seeded, domain types appended at DB-4 `[FACT: schema/_registry.ts:6-8, …]`.

### 1.2 Persistence engine (`@vida/core` db layer)
- **`createRepository(db, table, { deviceId, encryptedFields, softDelete })`** — the table-agnostic CRUD `[FACT: repository.ts:180-241]`.
- **`encryptRow`/`decryptRow`** — field-crypt seam; M1.0 registers an **empty `[E]` set → pass-through** `[FACT: repository.ts:118,140; notes.ts:27-29]`.
- **`computeSyncHash` → `hashContent`** — every insert/update stamps `_sync_hash` `[FACT: repository.ts:169,340,432]`.
- **soft-delete** — `delete()` sets `deleted_at` + enqueues `operation:'update'` co-transactionally `[FACT: repository.ts:456-463]`.

### 1.3 Encryption / vault
- **`hashContent` + `initVault`** (`libsodium-wrappers-sumo`) — `initVault()` awaits `sodium.ready`; a guard throws `"Vault not initialized"` if a crypto op runs first `[FACT: encryption/vault.ts:13,22-31]`. → drives **NEEDS N1**.
- **`getVaultKey()`** — the repository's `key()` calls it **only when `encryptedFieldSet.size > 0`**; it throws `"Vault is locked"` while `_state !== 'unlocked'` `[FACT: repository.ts:250-253; key-management.ts:124]`. → drives **NEEDS N9** (a DISTINCT boot path from N1).

### 1.4 Types & validators (`@vida/types` / `@vida/core`)
- **`@vida/types/note.ts`** — `PAGE_TYPE`, `Page`, `PageLink`, `EntityLink`, `NoteAttachment`, `JournalSummaryConfig` `[FACT: note.ts]`.
- **`validators/note.ts`** — `createPageSchema` / `updatePageSchema` (kept, DB-9) `[FACT: validators/note.ts]`.
  - ⚠ **`EntityLinkTargetSchema` = closed 33-value enum** `[FACT: validators/note.ts:11]` — **do NOT use as the NP-6 guard** (→ IMPLICIT RULE IR-2 / baseline C5).

### 1.5 Consumed seams (built services — compose, do not rebuild)
- **AR-6 `SpacesService`** — entity-link + tag **WRITES** only: `createLink`/`removeLink`/`tagEntity`/`untagEntity` (+ tag/space CRUD); **no tag-READ method** AND **no `*InTx` variant** `[FACT: foundation/spaces/service.ts:40-60]`. Factory `(db, deviceId, registry)` — builds its own empty-`[E]` `cfg` internally `[FACT: spaces/service.ts:63-73]`; `BacklinkResolver` factory `(db, deviceId)`.
- **AR-8 `BacklinkResolver`** — entity-link **READS**: `getBacklinksTo`/`getLinksFrom`/`resolveLink`; `page_links` reads DEFERRED → M1.1 `[FACT: services/search/backlink-resolver.ts:11-30]`.
- **`TaggableTypeRegistry`** — `assertRegistered(entityType)` throws `UnknownEntityType` `[FACT: spaces/service.ts:66,76]`.

### 1.6 Frontend deps (② track)
- **`@vida/editor`** (UI-3 ✅) — TipTap mount + inline blocks; `entityLink`/`backlink` are E5 placeholders → ② wires the ADR-008 registry.
- **`@vida/ui`** (UI-2 ✅) — `ListView`/`GalleryView`/`CalendarView`/`NeuralGraph`/`ExportDialog` `[FACT: ui/src/index.ts:40-46]`.
- **`apps/web`** — `routes.tsx` (`notesRoute`/`graphRoute`), `nav/module-map.ts:24`, AR-4 `<h2>` stubs to replace.

### 1.7 Cross-module seams
- **MOD-journals** — owns the `summary(date)` registry engine; Notes provides `summary_config` storage + the `/summary` block surface, and consumes the engine `[FACT: m1.1-delivery-plan §5 L132-133]`.
- **DB-8** — FTS5 `fts_pages` engine (② search UI seam, later).

### 1.8 Anti-dependency (do NOT consume)
- The removed ① `current-spec.md`/`current-business-rules.md` + old `mod-notes/_index.md` = **residue** (`intake.md §F`). Derive from the 5 aspects + schema + §9 only.

---

## 2. NEEDS — preconditions to function (boot order · injection · registry)

| # | Need | Why (grounded) | Consequence if unmet |
|---|------|----------------|----------------------|
| **N1** | **libsodium ready before the FIRST write** — `initVault()` (`sodium.ready`) must run before any Notes repository write | every write computes a **keyless `_sync_hash` via `hashContent` (libsodium `crypto_generichash`)**, **independent of the `[E]` set** — M1.0 pass-through is NOT crypto-free `[FACT: repository.ts:169,340,432; vault.ts:22-31]` | `"Vault not initialized"` throw on first note create — the `vault-not-initialized-on-boot` bug class the NEEDS section exists to prevent |
| **N2** | **`deviceId` injected** into the service + every repository | written to `_sync_device_id` on every insert/update `[FACT: repository.ts:299,426]` | HLC tie-break / sync identity broken |
| **N3** | **`entity_type` registry populated** with every type Notes links against | `assertRegistered` fires on the entity-link/tag **WRITE path (via AR-6) only** — NOT on the `pages` insert (`entity_type` is plain TEXT, no CHECK — `notes.ts:46`), so **do NOT wire a redundant guard on `createPage`/`ensureEntityNote`'s page write** `[FACT: spaces/service.ts:76; notes.ts:46]`; `page`/`note`/`journal` seeded, domain types appended at DB-4 | `UnknownEntityType` throw on a valid `createEntityLink` |
| **N4** | **injected deps** — the factory receives `{ db, deviceId, spaces: SpacesService, backlinks: BacklinkResolver, registry: TaggableTypeRegistry }` | Notes **composes** the seams (ORGANIZATION §3); it constructs none of them | facade methods unresolvable |
| **N5** | **DB migrated** (`012_notes` + spaces migration) before use | `migrate()` applies the registry; tables must exist `[FACT: db/CLAUDE.md runner]` | missing-table error |
| **N6** | **React-Query provider + Zustand store** present (② UI) | async keys (page/list/backlink/summary) + ephemeral UI state `[FACT: structure-data.md:34-37]` | UI cannot bind |
| **N7** | **soft-delete predicate discipline** — every read appends `isNull(deleted_at)` | `findWhere` runs predicates **verbatim** (no auto-notDeleted) — AR-6 mirror | soft-deleted rows leak into reads |
| **N8** | **cross-table cascade atomicity is UNACHIEVABLE via the current seams** — a page-delete cleanup (page → `page_links` → `entity_links` via `spaces.removeLink` → `entity_tags` via `spaces.untagEntity` → `note_attachments`) is **N separate top-level `db.transaction`s** | `createInTx` exists only for `create` on the raw Repository (`repository.ts:326,351`); `update`/`delete` open their own tx (`:405,:469`); `SpacesService` exposes **no `*InTx`** `[FACT: repository.ts:326,405,469; spaces/service.ts (no InTx)]` | **partial-failure orphans satellites** (dangling `entity_links`/live `entity_tags` on a dead page). **Forces a Decomposition decision:** accept best-effort/eventually-consistent cleanup (state it as IR-13) **OR** schedule an AR-6 `*InTx` surface as an upstream dep. Pairs with **IR-13**. |
| **N9** | **Notes repos constructed with EMPTY `[E]` in M1.0** (matching AR-6's `cfg`) | a non-empty `[E]` set makes `key()` eagerly call `getVaultKey()`, which throws `"Vault is locked"` pre-`unlock()` — a boot path DISTINCT from N1's `hashContent` throw `[FACT: repository.ts:250-253; key-management.ts:124]` | every Notes read/write throws until vault unlock (M3 concern; in M1.0 the empty set keeps the field-key path dormant) |

---

## 3. ORGANIZATION — ownership boundaries (OWNS / CONSUMES / DELEGATES / PROVIDES)

- **OWNS** — `pages`·`page_links`·`note_attachments` schema · the Notes service (page CRUD · `page_links` create+read · `resolveWikiLink` · `ensureEntityNote` · today `/summary` · attachments) · the **`entity_tags` read query** (net-new; AR-6 has no tag-read) · the `/notes` UI surface.
- **CONSUMES (read)** — AR-8 `BacklinkResolver` (entity-link reads) · `@vida/editor` · `@vida/ui` · `@vida/core` Repository · MOD-journals `summary(date)` engine.
- **DELEGATES (write)** — entity-link + tag **WRITES** → AR-6 `SpacesService` (Notes never writes `entity_links`/`entity_tags` directly).
- **PROVIDES (seam out)** — `summary_config` storage + `/summary` block surface → MOD-journals · the journal `entry` editor mount → Home.
- **NEVER** — own a tag junction (NP consumer) · re-implement backlink reads (AR-8) · author `entity_links`/`entity_tags` schema (AR-6) · generate the NP-8 seed or any summary server-side (ZK-1).

---

## 4. IMPLICIT RULES — hidden invariants the docs imply but never state

| # | Rule | Implied by / grounded |
|---|------|-----------------------|
| **IR-1** | **Cascade is SERVICE-authored, not DB.** Soft-deleting a page must service-drive cleanup of its `page_links`/`entity_links`/`note_attachments` (+ `entity_tags`); the DB enforces nothing | NP-9 reads like FK cascade, but schema has **NO FK** `[FACT: notes.ts:45,74-75,89; business-rules.md:17]` (baseline C6) |
| **IR-2** | **Validate `entity_type` against the RUNTIME registry, not `EntityLinkTargetSchema`.** The Zod enum is the closed 33-value union; using it silently re-closes the OPEN registry (SP2) | `[FACT: validators/note.ts:11 vs spaces/service.ts:76]` (baseline C5) |
| **IR-3** | **Pass-through ≠ crypto-free.** libsodium is a HARD boot dep even with zero field encryption, because `_sync_hash` is keyless-but-libsodium | implied by "M1.0 empty `[E]`" but never stated (see N1) |
| **IR-4** | **`resolveWikiLink` does NOT create.** Create-on-miss is an explicit caller compose (`createPage` stub `note` → `createPageLink`), never silent | conventions.md:8 + NP-7 ("+ Create", never title-match at render) |
| **IR-5** | **`ensureEntityNote` seed = pure function of parent LOCAL fields** (stable key order, no `Date.now`/random); idempotent (returns the existing `*_note`) | NP-8 says "client-deterministic" — the determinism/idempotence constraint is implicit |
| **IR-6** | **`findWhere` runs predicates verbatim** → every read explicitly appends `isNull(deleted_at)` | AR-6 mirror; not auto-applied |
| **IR-7** | **`pages.content` writes route through the Yjs doc, never a plain LWW column write** | NP-4 + conventions.md:25 ("never write content through LWW") |
| **IR-8** | **`summary_config` is plain `text()` app-stringified, NOT `json<T>()`** — the service stringifies/parses `JournalSummaryConfig` itself | `[FACT: notes.ts:54]` |
| **IR-9** | **Journal identity is immutable** — `updatePage` (`.strict()`) excludes `type`/`journal_date` (can't convert a note↔journal or move a journal's date) | NP-2 + contract.md error cases |
| **IR-10** | **`has_pomodoro` is a plaintext filter flag only.** The timer runtime is Sessions-realm (`focus_sessions`); the `/pomodoro` block is a consuming lens; Notes stores the flag + links analytics by `session_id` | `[FACT: notes.ts:56; structure-data.md:30]` |
| **IR-11** | **entity-link/tag create is REVIVE-or-noop, not fresh-insert.** AR-6 `findWhere`s the business key; a **soft-deleted** row is revived (`update deleted_at:null`), so re-linking after unlink **resurrects the prior row's `id` + `context`** — not a new row. Code caching link ids, or expecting link→unlink→link to yield a new id, is wrong | `[FACT: spaces/service.ts:130-139,146-154,160-173]` (gate F6) |
| **IR-12** | **each mutation co-enqueues a `sync_queue` row, UPSERT-COALESCED by `(table_name,row_id,operation)`** to the latest snapshot — the ZK sync unit. Repeated pre-flush writes of the same row+op collapse to one; different ops (`create` vs `update`) stay distinct (soft-delete = `update`) | `[FACT: repository.ts:261-289]` (gate F7) |
| **IR-13** | **a multi-table user action is NOT one transaction.** Page + its links/tags/attachments, or a cascade delete, span N independent `db.transaction`s (N8) → **partial failure is possible**; the service layer must handle it (re-drive / mark-orphan / accept eventual consistency). The DB guarantees neither cascade (no FK, IR-1) nor atomicity | `[FACT: repository.ts:405,469; N8]` (gate F8) |

---

## 5. UNKNOWNs (flagged, not guessed)
- **[UNKNOWN — Sessions realm, not Notes]** the `focus_sessions.sub_type` discriminator value (ADR-004 names the table+column, not the value) — irrelevant to this entity (the `/pomodoro` block only consumes by `session_id`). `[FACT: structure-data.md:30]`
- **[HOMED, not open]** the `getBacklinks` page_links+entity_links **merge shape** (G6 tentative) → resolved at the ① service spec, not here.

> Everything above is `[FACT]`/`[INTERP]` or an explicitly-flagged `[UNKNOWN]`. No claim guesses past an UNKNOWN.
>
> **░Interpretation Gate░ (Step 1.75) — RAN 2026-08-23, RETHINK→resolved.** An independent critic verified every
> citation against code and hunted for missed latent bombs. Caught + folded: **N8/IR-13** (cross-table cascade
> non-atomic — no `*InTx` on AR-6; the highest-value miss, the exact bug class this layer exists for) · **IR-11**
> (link create = revive-or-noop) · **IR-12** (`sync_queue` `(table,row,op)` coalescing) · **N9** (`getVaultKey`-locked
> path, distinct from N1) · **F1** (`SpacesService` signature `(db,deviceId,registry)`) · **N3 tighten** (no registry
> guard on the `pages` insert) · line-cite fixes. N1 (libsodium boot dep), ORGANIZATION, and No-Guessing passed clean.
> Re-gate = SHIP-ready. The cascade-atomicity decision (N8) is now a **Decomposition line-item**, not a latent bomb.
