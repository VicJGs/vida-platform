# IMPLEMENTATION-PLAN (§XXVI g2) — AR-7 Increment 2: `capability` registry

> Build steps for the gate-1 SPEC (`PLAN-2026-08-02-capability.md`, Approval 1 + the 3 fold-ins). Author strictly
> from here. 3 syncable tables + thin registry, migration 005. Divergence → §XXVIII.

## 1. `@vida/types/src/capability.ts` (+ barrel in `index.ts`)

```ts
export const RENDER_TARGET = ['inline', 'standalone'] as const
export type RenderTarget = (typeof RENDER_TARGET)[number]
```

→ add `export * from './capability'` to `@vida/types/src/index.ts`.

## 2. `packages/core/src/validators/capability.ts` (+ barrel)

```ts
import { z } from 'zod'
import { RENDER_TARGET } from '@vida/types'
export const renderTargetSchema = z.enum(RENDER_TARGET)
```

→ export from the validators barrel (match `validators/` existing style). **No enum-parity row** — `render_targets`
is a JSON array, not a scalar CHECK column (like `session_type_registry.effects`; PLAN §3.3).

## 3. `packages/core/src/foundation/capability/types.ts`

```ts
import type { EffectType } from '@vida/types'
import type { RenderTarget } from '@vida/types'
export const TERMINAL_STATE = ['loading', 'empty', 'error', 'success'] as const
export type TerminalState = (typeof TERMINAL_STATE)[number]
export interface CapabilityDefinition {
  id: string
  kind: string // OPEN vocab (no CHECK) — carries study_method
  render_targets: RenderTarget[] // ⊆ RENDER_TARGET (BR-2)
  bindings: string[] // entity-type strings (BR-5 subset dim)
  effects: EffectType[] // ⊆ EFFECT_TYPE (BR-3)
  config_schema?: Record<string, unknown>
  terminal_states: Record<string, TerminalState[]> // per render target (BR-4)
  is_user_type?: boolean
}
export class InvalidRenderTarget extends Error {
  constructor(t: string) {
    super(`Invalid render target: ${t}`)
    this.name = 'InvalidRenderTarget'
  }
}
export class UnknownDeclaredEffect extends Error {
  constructor(e: string) {
    super(`Unknown declared effect: ${e}`)
    this.name = 'UnknownDeclaredEffect'
  }
}
export class MissingTerminalStates extends Error {
  constructor(rt: string) {
    super(`Missing terminal states for render target: ${rt}`)
    this.name = 'MissingTerminalStates'
  }
}
export class CapabilityEnvelopeExceeded extends Error {
  constructor(x: string) {
    super(`User capability exceeds shipped envelope: ${x}`)
    this.name = 'CapabilityEnvelopeExceeded'
  }
}
export class DuplicateCapabilityId extends Error {
  constructor(id: string) {
    super(`Capability id already registered: ${id}`)
    this.name = 'DuplicateCapabilityId'
  }
}
export class CapabilityNotFound extends Error {
  constructor(id: string) {
    super(`Capability not found: ${id}`)
    this.name = 'CapabilityNotFound'
  }
}
```

## 4. `packages/core/src/db/schema/foundation/capability.ts` (+ schema barrel)

```ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { baseColumns, boolInt } from '../_shared'
// All three are SYNCABLE (…baseColumns = id+timestamps+_sync_*); no cross-table FK (live convention).
// JSON dims are PLAIN text() — the registry JSON.stringify's on write / parse on read (sessions.ts:59-65
// precedent). NEVER json<T>() — it only casts the TS type and binds a raw array to SQLite (sessions.ts:59 warning).
export const capabilityDefinitions = sqliteTable('capability_definitions', {
  ...baseColumns, // id = UUIDv7 PK (repo-generated)
  def_id: text('def_id').notNull().unique(), // the capability's SEMANTIC identity (BR-1) — UNIQUE business key
  //   (mirrors session_type_registry.sub_type; repo.create() always
  //   generates the PK id, so identity lives here — §XXVIII deviation, 2026-08-03)
  kind: text('kind').notNull(), // OPEN, no CHECK
  render_targets: text('render_targets').notNull(), // JSON TEXT (string[])
  bindings: text('bindings').notNull(), // JSON TEXT (string[])
  effects: text('effects').notNull(), // JSON TEXT (EffectType[])
  config_schema: text('config_schema'), // JSON TEXT, nullable
  terminal_states: text('terminal_states').notNull(), // JSON TEXT (Record<rt, TerminalState[]>)
  is_user_type: boolInt('is_user_type').notNull().default(false),
  deleted_at: integer('deleted_at'),
})
export const blockInstances = sqliteTable(
  'block_instances',
  {
    ...baseColumns,
    capability_def_id: text('capability_def_id').notNull(), // → registry, no FK
    space_id: text('space_id').notNull(), // → spaces, no FK
    /** @encrypted [E] — user-literal instance config; field-level libsodium (EN-2) */
    config: text('config'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_block_instances_space').on(t.space_id)],
)
export const capabilityGrants = sqliteTable(
  'capability_grants',
  {
    ...baseColumns,
    capability_def_id: text('capability_def_id').notNull(),
    granted_bindings: text('granted_bindings').notNull(), // JSON TEXT
    granted_effects: text('granted_effects').notNull(), // JSON TEXT
    media_ok: boolInt('media_ok').notNull().default(false),
    external_in_ok: boolInt('external_in_ok').notNull().default(false),
    external_out_ok: boolInt('external_out_ok').notNull().default(false),
    consented_sensitive_modules: text('consented_sensitive_modules').notNull(), // JSON TEXT
    granted_envelope_hash: text('granted_envelope_hash').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_capability_grants_def').on(t.capability_def_id)],
)
// + $inferSelect/$inferInsert type exports per table (sessions.ts precedent).
// rowToDef (step 6) JSON.parse(row.x ?? '[]'/'{}') on read — mirrors sessions/registry.ts:65-68.
```

→ `export * from './foundation/capability'` in `db/schema/index.ts`.

## 5. `packages/core/src/db/migrations/005_capability.ts` (+ runner)

Hand-SQL, `version: 5`, name `'capability'`. Three CREATE TABLEs. Each syncable table repeats the **baseColumns
SQL block** exactly as migration 003 does (`id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER
NOT NULL, _sync_id TEXT NOT NULL UNIQUE, _sync_version INTEGER NOT NULL DEFAULT 1, _sync_device_id TEXT NOT NULL,
_sync_lww_ts INTEGER NOT NULL, _sync_status TEXT NOT NULL DEFAULT 'pending', _sync_hash TEXT`). Domain columns per
§4; **no CHECK** (kind OPEN; render_targets/effects are JSON). `is_user_type`/`media_ok`/… `INTEGER NOT NULL
DEFAULT 0`. Indexes: `idx_block_instances_space`, `idx_capability_grants_def`. up() opens no own tx.
→ `runner.ts`: import `migration005Capability` + append to `ALL_MIGRATIONS`.
**No enum-parity edit** (no scalar CHECK column added).

## 6. `packages/core/src/foundation/capability/registry.ts`

```ts
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { capabilityDefinitions, type ... } from '../../db/schema/foundation/capability'
import { EFFECT_TYPE, RENDER_TARGET } from '@vida/types'
import { TERMINAL_STATE, type CapabilityDefinition, Invalid.../* errors */ } from './types'

// Shipped roster (code-registered, in-memory; NOT persisted — SS-4 precedent). ≥1 def with a NON-EMPTY
// bindings+effects envelope so BR-5 is a real check (F2 fold-in).
export const SHIPPED_CAPABILITIES: CapabilityDefinition[] = [
  { id: 'habit_logger', kind: 'logger', render_targets: ['inline','standalone'],
    bindings: ['habit'], effects: ['complete_habit_occurrence','award_xp'],
    terminal_states: { inline: [...TERMINAL_STATE], standalone: [...TERMINAL_STATE] } },
]
export interface CapabilityRegistry {
  register(def: CapabilityDefinition): Promise<void>
  get(id: string): Promise<CapabilityDefinition>
  list(): Promise<CapabilityDefinition[]>
}
export function createCapabilityRegistry(db: DrizzleDb, deviceId: string): CapabilityRegistry { ... }
```

Validation in `register` (order): **BR-2** every `render_targets[i] ∈ RENDER_TARGET` else `InvalidRenderTarget`;
**BR-3** every `effects[i] ∈ EFFECT_TYPE` else `UnknownDeclaredEffect`; **BR-4** for each declared render target,
`terminal_states[rt]` contains all 4 `TERMINAL_STATE` else `MissingTerminalStates`; **BR-5** (only when
`is_user_type`) `effects ∪ bindings ⊆ shippedUnion` (union of all SHIPPED effects+bindings) else
`CapabilityEnvelopeExceeded`; **BR-6** `id` not in shipped ids AND not already persisted else `DuplicateCapabilityId`.
Persist user defs via `createRepository(db, capabilityDefinitions, { deviceId, encryptedFields: [] })` → sync_queue
(AR-5 precedent; **`create({ def_id: def.id, ... })`** — the semantic id goes to `def_id`, the repo generates the row
PK; JSON.stringify the array/record fields on write, JSON.parse on read via `rowToDef` which maps `row.def_id → id`).
`get(id)`: shipped Map first, then `userRepo.findWhere(eq(capabilityDefinitions.def_id, id))`, else `CapabilityNotFound`.
BR-6 dup check uses `def_id`. `list`: shipped ∪ persisted.

- shippedUnion computed once: `new Set([...SHIPPED.flatMap(d=>d.effects), ...SHIPPED.flatMap(d=>d.bindings)])`.

## 7. Barrels

`foundation/capability/index.ts`: `export * from './types'; export { createCapabilityRegistry, SHIPPED_CAPABILITIES, type CapabilityRegistry } from './registry'`. Add `export * from './foundation/capability'` to `@vida/core` `index.ts`.

## 8. `packages/core/src/foundation/capability/__tests__/capability.test.ts`

Harness = the spaces/effects better-sqlite3 + `migrate` pattern. Cases:

- migration wiring: 3 tables exist, `currentVersion → 5`.
- register a valid USER def → persists + **one sync_queue row** (assert, db-6 seam, AR-6 precedent).
- get shipped `habit_logger`; get persisted user def; get missing → `CapabilityNotFound`.
- BR-2 bad render target → `InvalidRenderTarget`; BR-3 unknown effect → `UnknownDeclaredEffect`; BR-4 missing a terminal state → `MissingTerminalStates`.
- BR-5 user def with an effect not in shipped union → `CapabilityEnvelopeExceeded` (real because `habit_logger` seeds a non-empty union).
- BR-6 register a shipped id / a dup user id → `DuplicateCapabilityId`.

## Verification

`pnpm --filter @vida/core typecheck` 0 → `pnpm --filter @vida/core test` green (existing suites unbroken; version assertions are `>=`) → root `pnpm typecheck` 10/10.

## §XXIX Currency (after green)

`docs/core/capability/current-{spec,business-rules}.md` (BR-1..8) + layer-doc `foundation/capability/CLAUDE.md`.

## Acceptance → PLAN §4 (1:1)

#1 tables+migration → 4/5 · #2 RENDER_TARGET → 1 · #3 tests → 8 · #4 suite green → verification · #5 no-FK/[E]/grants-fieldset → 4 · #6 cited + grain accepted → PLAN.
