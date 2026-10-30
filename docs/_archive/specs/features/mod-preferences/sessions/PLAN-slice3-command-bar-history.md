# PLAN — mod-preferences Slice 3 · command_bar_history service (§XXVI gate-1)

> Unit: mod-preferences #37 (LIF-133) · Slice 3 of 3. The many-row slice — DIFFERENT mechanics from Slices 1-2
> (upsert-by-key + in-service ordering; no singleton, no merge-with-defaults, no MergedX view type). Every claim
> `[FACT: path:line]`.

## §1. Executive summary

Add the `command_bar_history` (Cmd+K palette frecency + pinning) surface to `@vida/core/services/preferences`. No
schema work; the table + interface exist. Grounding call — **no `@vida/types` change**: `CommandBarHistory` already
exists (entities/user.ts) and its missing `created_at`/`updated_at` is the **DB-11 interface reconcile, explicitly NOT
this issue** (`schema/preferences.ts:19-21`). Two edits:

1. **`@vida/core/src/validators/user.ts`** — add `RecordCommandSchema` (validates the record input; fail-loud on an
   empty `command_key`).
2. **`services/preferences/service.ts`** — add a `commandRepo` + `recordCommand`/`pinCommand`/`getCommandHistory`
   to the existing factory.

## §2. Business rules enforced

- **PR-6 / BR-P3** — `command_key` is UNIQUE (SQL-migration, `preferences.ts:106`); `recordCommand` **upserts by key**
  (increment `use_count`, set `last_used_at`), never duplicates; `getCommandHistory` ranks **pinned-first, then
  frecency** (`use_count` desc, `last_used_at` desc). `[FACT: business-rules.md:14 PR-6; ADR-002 L3560]`
- **PR-1** — plaintext (`encryptedFields: []`). **PR-9** — co-tx `sync_queue`. **IR-a** — vault. No `deleted_at` on the
  table → `softDelete: false`. `[FACT: preferences.ts:104-112 (no deleted_at)]`

## §3. What changes

### 3.1 `RecordCommandSchema` (@vida/core validators)

`z.object({ command_key: z.string().min(1), command_label: z.string(), command_category: z.string().nullable().optional() })`.
`command_key.min(1)` is the fail-loud guard (an empty key can't index the palette). `[FACT: schema command_key notNull]`

### 3.2 Service ops (added to the factory)

- `commandRepo = createRepository(db, commandBarHistory, { deviceId, encryptedFields: [], softDelete: false })`.
- `recordCommand(command_key, command_label, command_category?): Promise<void>` — validate via `RecordCommandSchema`;
  `const found = (await commandRepo.findWhere(eq(commandBarHistory.command_key, command_key)))[0]`; if found →
  `commandRepo.update(found.id, { use_count: found.use_count + 1, last_used_at: Date.now() })`; else
  `commandRepo.create({ command_key, command_label, command_category: command_category ?? null, use_count: 1,
last_used_at: Date.now(), is_pinned: false })`. Idempotent-by-key (PR-6). `findWhere` is safe here — no `deleted_at`
  on this table, so the memory-noted findWhere-skips-soft-delete caveat doesn't apply. `[FACT: repository.ts:379; memory repository-findwhere-skips-softdelete-filter]`
- `pinCommand(command_key, pinned): Promise<void>` — lookup by key; if found → `update(id, { is_pinned: pinned })`.
  **DECIDE (docs silent):** if the key was never recorded → **no-op** (simplest-correct: the Cmd+K UI only pins commands
  already in the history; single-user local). Not fail-loud-throw — pinning an unseen command is not a user-caused
  error state the docs enumerate. Flagged for the gate.
- `getCommandHistory(): Promise<CommandBarHistoryRow[]>` — `commandRepo.findAll()` then in-service sort: `is_pinned`
  desc → `use_count` desc → `last_used_at` desc (nulls last).
  **§XXVIII deviation (impl):** returns the **Drizzle `CommandBarHistoryRow`**, NOT the `@vida/types` `CommandBarHistory`.
  My gate claim "row assignable to the interface" was WRONG — the row types `_sync_status` as `string` (plain `text()`
  column, `_shared.ts:29`) while `SyncMetadata._sync_status` is the `SyncStatus` union → not assignable (a whole-repo
  boundary). The house convention for raw list readers is exactly this — `search/backlink-resolver.ts:25` returns
  `EntityLinkRow[]`. No cast, no map; interface reconcile is DB-11. `[FACT: _shared.ts:29; backlink-resolver.ts:25]`

## §4. Acceptance (Verification Gate — extend the same test file)

1. `recordCommand('open.tasks','Open Tasks')` → creates a row (`use_count:1`, `is_pinned:false`).
2. Re-`recordCommand('open.tasks', …)` → **same row**, `use_count:2`, `last_used_at` advanced, `findAll().length===1` (PR-6 upsert, no dup).
3. `getCommandHistory` orders pinned-first: pin one low-use command → it sorts above a higher-use unpinned one (PR-6).
4. Unpinned ordering is frecency: higher `use_count` first (PR-6).
5. `pinCommand('open.tasks', true)` → `is_pinned` set; `pinCommand` on an unrecorded key → no-op, no throw, no row created (DECIDE).
6. `recordCommand('', 'x')` → Zod rejects (empty key, fail-loud).
7. `sync_queue` gets a `command_bar_history` row per write (PR-9).
8. commands are independent of the user/nav singletons (no cross-contamination).

- typecheck 0 · @vida/core test green · eslint 0.

## §5. Out of scope

Slices 1-2 (done) · the DB-11 `CommandBarHistory` interface reconcile (created_at/updated_at) · ② Cmd+K UI + the
`searchSettings` index (fe-preferences) · `command_category` taxonomy (free TEXT, no vocab).

## §6. Ratify vs Decide

RATIFY: table shape, UNIQUE-by-key upsert, pinned-then-frecency order, plaintext, no-soft-delete, no interface change
(DB-11 boundary). DECIDE: (D-S3) `pinCommand` on an absent key → no-op (docs silent → simplest-correct, single-user).
