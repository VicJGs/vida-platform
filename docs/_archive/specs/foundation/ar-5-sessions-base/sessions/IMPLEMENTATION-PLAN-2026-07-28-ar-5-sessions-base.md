# IMPLEMENTATION-PLAN — ar-5-sessions-base (gate 2)

Session: 2026-07-28-ar-5-sessions-base · Unit spec: ../\_index.md (§1–§4 = the approved description)
Status: draft → (Approval 2) → implementing
No-Guessing: every step traces to a [FACT] in the spec §1–§4 or a cited source; nothing invented at build time.

This is the exhaustive, self-sufficient build prompt. It RESOLVES the three preflight gaps (G1/G2/G3) and
orders the work per the established db-6/db-9 4-artifact foundation pattern. Cite the spec; do not restate it.

## Preflight-gap resolutions (build decisions — ratified here, checked by the 2nd critique)

- **G1 — registry persistence path.** USER types persist via the **db-6 `Repository`**:
  `createRepository(db, sessionTypeRegistry, { deviceId, encryptedFields: [] })` → `.create()` — which enqueues a
  `sync_queue` row **co-transactionally** (`repository.ts:258,332-335`). Empty `[E]` set ⇒ encryption is
  pass-through, lazy vault key (db-6 M1.0 stance; `getVaultKey` unused because no field encrypts). `[FACT: repository.ts:227,258,315-341]`
- **G2 — FK + indexes.** **No hard cross-table FK** (live convention: 0 `references()` in `db/schema/`; ADR-004
  §3.4 base+extension travel as separate blobs, out-of-order → a DB FK would spuriously reject). `session_id` is
  plain TEXT. Indexes (Drizzle `(t)=>[...]` + `CREATE INDEX` in the migration, sync-queue pattern):
  `idx_session_attachments_session` on `session_attachments(session_id)`, `idx_sessions_status` on
  `sessions(status)`, `idx_sessions_sub_type` on `sessions(sub_type)`. `[FACT: sync-queue.ts:37-42; grep ref-free]`
- **G3 — shipped vs user registration.** SHIPPED types = an in-memory registry seeded from a code constant
  `SHIPPED_SESSION_TYPES: SessionTypeDef[]` at construction (SS-4 "configured by us" = code; not persisted, not
  synced). USER types = `register()` → validate → persist (is_user_type=1) via Repository → synced. `get()`/`list()`
  merge in-memory-shipped ∪ persisted-user. Shipped-type EDITING defers (not M1.0). `[FACT: business-rules.md:78 SS-4; _registry.ts precedent]`

## Build Steps (ordered; each cites the spec rule it satisfies)

**0. Pre-flight grep (collision guard).** `grep -rn "EffectType\|EFFECT_TYPE" packages/types/src` — VERIFIED
empty 2026-07-28 (no existing symbol), so the barrel `export *` in step 1 won't collide. Re-run if stale.

**1. Enums — `packages/types/src/session.ts`** (new file) `→ spec §3.1, BR-2/BR-5a/BR-5b/BR-6`

- 5 tuples, C2 `as const` + derived union `type X = (typeof X)[number]`:
  `SESSION_SUB_TYPE` (9, open), `SESSION_PURPOSE` (6, open), `SCHEDULING_MODE` (3, fixed),
  `SESSION_STATUS` (7, fixed, S5), `EFFECT_TYPE` (**12** — 8 base + 4 ADR-012). Add a one-line comment on
  `SCHEDULING_MODE` that `'ad_hoc'` is intentional snake_case (D-2, so no codemod "fixes" it to the doc's 'ad-hoc').
- **Explicit barrel edit:** add `export * from './session'` to `packages/types/src/index.ts` (the per-domain
  `export *` precedent). Acceptance §4.1 gates this.

**2. Validators — `packages/core/src/validators/session.ts`** (new file) `→ spec §3.1`

- `import { SESSION_SUB_TYPE, ... } from '@vida/types'`; `export const SessionSubTypeSchema = z.enum(SESSION_SUB_TYPE)`
  ×5 (the sync.ts validator pattern — `z.enum(tuple)`, no cast).
- **Explicit barrel edit:** add `export * from './session'` to `packages/core/src/validators/index.ts`
  (mirrors `export * from './sync'`). Acceptance §4.2 gates this.

**3. Schema slice — `packages/core/src/db/schema/foundation/sessions.ts`** (new file) `→ spec §3.2, BR-1/BR-7`

- Header comment: cite ADR-004 (§3.1 spine, §3.2.1 attach, §3.2.4 perms) + "DDL lives in migration 002; this is
  the type-safe QUERY mirror" (the sync-queue.ts header pattern).
- 3 `sqliteTable`s composing `_shared.ts` helpers:
  - `sessions`: `...baseColumns`, `enumText('scheduling_mode', SCHEDULING_MODE).notNull()`,
    `enumText('status', SESSION_STATUS).notNull()` (no `.default()` — G/spec: caller-supplied),
    `sub_type text().notNull()` (plain, open), `purpose text()`, `planned_block_id text()`,
    `started_at/ended_at/focus_rating/energy_level/distraction_count` integer, `key_learnings text()` /_ [E] _/,
    `deleted_at integer()`, `...syncColumns`. Indexes: `idx_sessions_status`, `idx_sessions_sub_type`.
    (The 1..5 + status/mode CHECKs are SQL-only — authored in the migration, not here; `enumText` gives only the TS union.)
  - `session_type_registry`: **`...baseColumns`** (id PK + timestamps + `_sync_*` — REQUIRED for the db-6
    Repository, which generates + queries `id`), `sub_type text().notNull().unique()` (business key, NOT the
    PK — critique #2), `owner_module text().notNull()`, `boolInt('is_user_type').notNull().default(false)`
    (use the `_shared.ts:18` helper), `default_purpose text()`, `attachment_defaults/effects/lifecycle/
permissions` = `json<...>('...')` (JSON-as-TEXT). (No standalone `...syncColumns` — baseColumns includes it.)
  - `session_attachments`: `...baseColumns`, `session_id text().notNull()`, `entity_type text().notNull()`,
    `entity_id text().notNull()`, `enumText('level', ['type','instance'] as const).notNull()`.
    Index: `idx_session_attachments_session` on `session_id`.
- Export `$inferSelect`/`$inferInsert` types per table (sync-queue.ts:45-46 pattern).
- **Explicit barrel edit (critique #3):** add `export * from './foundation/sessions'` to
  `packages/core/src/db/schema/index.ts` — required so `DrizzleDb = SqliteRemoteDatabase<typeof schema>`
  (adapter.ts:30) types the new tables and the Repository/tests can `db.select().from(sessions)`.

**4. Migration — `packages/core/src/db/migrations/002_sessions.ts`** (new file) `→ spec §3.2, BR-5a`

- `export const migration002Sessions: Migration = { version: 2, name: 'sessions', up: async (driver) => {...} }`
  (the 001 shape). `up()` opens NO transaction (runner wraps it — `001_sync_queue.ts:5-7`).
- 3 `CREATE TABLE` with hand-written SQL: `session_type_registry` has `id TEXT PRIMARY KEY` +
  `sub_type TEXT NOT NULL UNIQUE` (critique #2). Hard `CHECK (scheduling_mode IN (...))`, `CHECK (status IN
(...))` (the 7 S5 members), `CHECK (focus_rating BETWEEN 1 AND 5)`, `CHECK (energy_level BETWEEN 1 AND 5)`,
  `CHECK (level IN ('type','instance'))`. NO FK clauses (G2). Mirror `_shared` column types + the `_sync_*`
  columns + defaults exactly (`is_user_type DEFAULT 0` ↔ Drizzle `.default(false)`, per sync-queue.ts:11-12).
  No default on `sessions.status`.
- 3 `CREATE INDEX` per G2.
- Register: add `migration002Sessions` to `ALL_MIGRATIONS` in `runner.ts:22` (one line, in order).

**5. Contract types — `packages/core/src/foundation/sessions/types.ts`** (new file) `→ spec §3.3, SS-3`

- `SessionTypeDef` (`sub_type, owner_module, extension_schema?, attachment_defaults, effects: EffectType[],
lifecycle: { transitions: SessionTransition[]; hooks?: Record<string,string> }, permissions:
CapabilityEnvelope, default_purpose? }`), `CapabilityEnvelope` (`{ allowed_effects: EffectType[];
sensitive_optins?: string[] }`), `SessionTransition` (`{ from: SessionStatus; to: SessionStatus; event: string }`).
- Deep JSON shapes are typed but the registry validates PRESENCE (BR-3), not deep legality (G4 accepted; the
  transition ENGINE is deferred).
- Typed error classes: `InvalidSessionTypeDef`, `CapabilityEnvelopeExceeded`, `DuplicateSubType`,
  `SessionTypeNotFound` (spec §3.4 error cases).

**6. Thin registry — `packages/core/src/foundation/sessions/registry.ts`** (new file) `→ spec §3.4, BR-3/BR-4/BR-1; G1/G3`

- `SHIPPED_SESSION_TYPES: SessionTypeDef[]` — **seed at least ONE real, complete 4-dimension def** (critique
  #14 — an empty array makes the BR-4 subset test a no-op and voids the "real seam" claim). Ship `focus`
  minimally-but-completely: `{ sub_type:'focus', owner_module:'sessions', attachment_defaults:{...},
effects:['attach_pomodoro','log_time'], lifecycle:{ transitions:[scheduled→in_progress→completed], hooks:{} },
permissions:{ allowed_effects:['attach_pomodoro','log_time'] }, default_purpose:'maintenance' }`. Additional
  shipped types (study/class/…) MAY be added but ONE complete def satisfies the seam + the BR-4 test.
- `createSessionRegistry(db, deviceId)`:
  - in-memory `Map<string, SessionTypeDef>` seeded from `SHIPPED_SESSION_TYPES`.
  - `userRepo = createRepository(db, sessionTypeRegistry, { deviceId, encryptedFields: [] })` (G1 — verified
    RepositoryConfig = `{ encryptedFields, deviceId, softDelete? }`, repository.ts:175-182).
  - `register(def)`: validate in order — BR-3 (all 4 dims present → else `InvalidSessionTypeDef`); BR-4 (if
    user type, `def.permissions.allowed_effects ⊆ union-of-shipped-allowed_effects` → else
    `CapabilityEnvelopeExceeded`); BR-1 (sub_type not in the shipped Map **and** not in the user table via
    `await userRepo.findWhere(eq(cols.sub_type, def.sub_type))` → else throw typed `DuplicateSubType` **before**
    the insert, so the raw SQLite UNIQUE error is never the surfaced failure — critique #2/#12); then
    `userRepo.create({ sub_type, owner_module, is_user_type:true, default_purpose, attachment_defaults:
JSON.stringify(...), effects: JSON.stringify(...), lifecycle: JSON.stringify(...), permissions:
JSON.stringify(...) })` — the Repository generates `id` + enqueues the `sync_queue` row co-transactionally.
  - `get(sub_type)`: shipped Map first → else `userRepo.findWhere(eq(cols.sub_type, x))` (NOT `findById` —
    the PK is `id`, critique #2); deserialize JSON cols → `SessionTypeDef`; `SessionTypeNotFound` if neither.
  - `list()`: shipped defs ∪ deserialized user rows (`userRepo.findAll()`).
  - NO `transition()`, NO effect firing, NO `attach()` runtime (deferred — grep-verifiable).
- `packages/core/src/foundation/sessions/index.ts`: barrel (types + registry). Re-export from `core/src/index.ts`.

**7. Tests** `→ spec §4`

- `validators/enum-parity.test.ts` — EXTEND the `FIXTURE` array (`{table,column,tuple}`) with EXACTLY
  `{table:'sessions',column:'scheduling_mode',tuple:SCHEDULING_MODE}` + `{...,column:'status',tuple:
SESSION_STATUS}`. Do NOT add sub_type/purpose (no CHECK → `extractCheckSet` returns null → `.not.toBeNull()`
  hard-fails) or EFFECT_TYPE (JSON). **Also patch `ddlFor` (critique #10):** it currently runs ONLY
  `migration001SyncQueue.up(driver)` and will `throw 'no DDL found for table sessions'` — change it to apply
  `migration002Sessions.up(driver)` too (or call the runner's `migrate()`), so the `sessions` CHECK DDL exists
  to extract. `[FACT: enum-parity.test.ts:58-60,77-87,95]`
- `validators/__tests__` (Zod) — accept/reject for the 12-member `EFFECT_TYPE` + the 5 enums (accept a member,
  reject a non-member) — this is where EFFECT_TYPE is covered (it has no parity row, BR-5b).
- `foundation/sessions/__tests__/registry.test.ts` — real better-sqlite3 driver + `migrate()` (db-6
  `repository.test.ts` harness; `migrate()` now creates the session tables because step 4 registered 002 —
  do NOT hand-copy CREATE, critique #11): register-ok (user type persists + a `sync_queue` row appears, the
  repository.test.ts:131-137 assertion pattern) · reject-missing-dimension (BR-3) · reject-envelope-superset
  (BR-4) · duplicate against BOTH the shipped Map and a persisted user row → typed `DuplicateSubType` (BR-1,
  critique #12) · get shipped/user/not-found. ≥ success + 2 errors.

**8. Verify** `→ spec §4 done-check`

- Root `pnpm typecheck` (turbo `^build` — NOT `--filter` stale-dist; db-9 MF-1) → 10/10 zero errors.
- Root `pnpm test` → green (new suites + no regressions).
- Grep-verify deferrals ABSENT: no `applied_effects`, no `effect_event_id`, no `transition(`, no `dueIn`,
  no `planned_blocks` table. Confirms the Option-1 boundary held.

## Acceptance (= spec §4 — the done-check)

Implementation is done when every spec §4 checkbox passes. Divergence from this plan → §XXVIII Deviation Protocol.

## Deferred (grep-verifiable NOT-present — spec §1 "What it is NOT")

effect-firing rail (applied_effects, effect_event_id, handlers, routing) → AR-7 · transition engine → later ·
scheduler (planned_blocks, availability, dueIn, generatePlan) → G5 · per-sub-type extension tables → DB-4/M1.1+ ·
view layer → G9 · shipped-type editing → later.
