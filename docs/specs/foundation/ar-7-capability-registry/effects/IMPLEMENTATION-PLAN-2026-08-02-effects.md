# IMPLEMENTATION-PLAN (§XXVI g2) — AR-7 Increment 1: `effects` rail

> Build steps for the gate-1 SPEC (`PLAN-2026-08-02-effects.md`, Approval 1). Author strictly from here.
> All shapes ratified in the PLAN; this is the file-by-file with exact signatures. Divergence → §XXVIII.

## Files (ordered — matches PLAN §5)

### 1. `packages/core/src/foundation/effects/types.ts`
```ts
import type { EffectType } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
export const EFFECT_CLASS = ['keyed', 'additive', 'projection', 'intra_realm'] as const
export type EffectClass = (typeof EFFECT_CLASS)[number]
// Exhaustive: Record<EffectType, …> → a missing/extra EFFECT_TYPE fails tsc (BR-5).
export const EFFECT_CLASS_OF: Record<EffectType, EffectClass> = {
  complete_habit_occurrence: 'keyed', emit_measurement_signal: 'keyed', contribute_purpose_metric: 'keyed',
  log_time: 'additive', award_xp: 'additive', grant_currency: 'additive', lock_currency: 'additive',
  move_money: 'additive', surface_notification: 'additive',
  surface_journal: 'projection', surface_calendar: 'projection',
  attach_pomodoro: 'intra_realm',
}
export interface EffectEvent {
  subjectNaturalKey: string; transition: string; effectType: EffectType; targetRef: string
  payload?: Record<string, unknown>
}
// The active transaction handle — byte-identical to the proven `Tx` derivation in repository.ts:56
// (there it's private; re-derived here to avoid coupling to a non-exported symbol).
export type EffectTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]
// Handler receives the ACTIVE tx and MUST co-write through it (F1 §3B:71 "same transaction") — never open its
// own db.transaction (nested BEGIN fails). This signature is locked now to avoid a breaking change to registrants.
export type EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>
export class UnknownEffectType extends Error { constructor(t: string){ super(`Unknown effect type: ${t}`); this.name='UnknownEffectType' } }
export class DuplicateEffectHandler extends Error { constructor(t: string){ super(`Handler already registered: ${t}`); this.name='DuplicateEffectHandler' } }
export class NoEffectHandler extends Error { constructor(t: string){ super(`No handler registered: ${t}`); this.name='NoEffectHandler' } }
```

### 2. `packages/core/src/foundation/effects/event-id.ts`
```ts
import type { EffectType } from '@vida/types'
/** Deterministic effect identity (BR-2). Canonical string; the derive() HASH is build-phase
 *  (ADR-011 §3.8). INVARIANT: `|` is the reserved separator — inputs (UUIDv7 ids, YYYY-MM-DD
 *  dates) never contain it. Same inputs → same id on any device. */
export function deriveEffectEventId(subjectNaturalKey: string, transition: string, effectType: EffectType): string {
  return `${subjectNaturalKey}|${transition}|${effectType}`
}
```

### 3. `packages/core/src/db/schema/foundation/effects.ts` (Drizzle query-mirror)
```ts
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'
import { EFFECT_TYPE } from '@vida/types'
import { enumText } from '../_shared'
// Local-only, NOT synced (like sync_queue): no baseColumns/syncColumns. Composite PK per F1 §3B.
export const appliedEffects = sqliteTable('applied_effects', {
  effect_event_id: text('effect_event_id').notNull(),
  effect_type: enumText('effect_type', EFFECT_TYPE).notNull(),
  target_ref: text('target_ref').notNull(),
  applied_at: integer('applied_at').notNull(),
}, (t) => [
  primaryKey({ columns: [t.effect_event_id, t.effect_type, t.target_ref] }),
  index('idx_applied_effects_event').on(t.effect_event_id),
])
export type AppliedEffectRow = typeof appliedEffects.$inferSelect
export type AppliedEffectInsert = typeof appliedEffects.$inferInsert
```
→ add `export * from './foundation/effects'` to `db/schema/index.ts`.

### 4. `packages/core/src/db/migrations/004_effects.ts` (hand-SQL, ADR-016 §3.2)
```ts
import type { Migration } from '../adapter'
// up() runs INSIDE the runner's BEGIN/COMMIT — no own transaction. CHECK list mirrors EFFECT_TYPE.
export const migration004Effects: Migration = {
  version: 4, name: 'effects',
  up: async (driver) => {
    await driver.run(`
      CREATE TABLE applied_effects (
        effect_event_id TEXT NOT NULL,
        effect_type     TEXT NOT NULL CHECK (effect_type IN (
          'complete_habit_occurrence','log_time','emit_measurement_signal','contribute_purpose_metric',
          'award_xp','surface_journal','surface_calendar','attach_pomodoro',
          'grant_currency','lock_currency','move_money','surface_notification')),
        target_ref      TEXT NOT NULL,
        applied_at      INTEGER NOT NULL,
        PRIMARY KEY (effect_event_id, effect_type, target_ref)
      )`)
    await driver.run(`CREATE INDEX idx_applied_effects_event ON applied_effects (effect_event_id)`)
  },
}
```
→ `runner.ts`: `import { migration004Effects } from './004_effects'` + append to `ALL_MIGRATIONS` (line 24).

### 4b. `packages/core/src/validators/enum-parity.test.ts` — WIRE the CHECK↔tuple parity (NOT auto-discovered)
This test is hand-maintained (its header: "each future slice APPENDS its (table,column,tuple) row — explicit, not
auto-discovered"). Without these edits acceptance #4 is a **false-PASS**. Three edits:
- `import { EFFECT_TYPE } from '@vida/types'` + `import { migration004Effects } from '../db/migrations/004_effects'`.
- inside `ddlFor()`: add `await migration004Effects.up(driver)` after the 003 line.
- append to `FIXTURE`: `{ table: 'applied_effects', column: 'effect_type', tuple: EFFECT_TYPE }`.

### 5. `packages/core/src/foundation/effects/registry.ts`
```ts
import type { EffectType } from '@vida/types'
import { type EffectHandler, DuplicateEffectHandler } from './types'
export interface EffectRegistry {
  register(effectType: EffectType, handler: EffectHandler): void   // dup → DuplicateEffectHandler (BR-4)
  resolve(effectType: EffectType): EffectHandler | undefined
}
export function createEffectRegistry(): EffectRegistry {
  const handlers = new Map<EffectType, EffectHandler>()
  return {
    register(t, h) { if (handlers.has(t)) throw new DuplicateEffectHandler(t); handlers.set(t, h) },
    resolve(t) { return handlers.get(t) },
  }
}
```

### 6. `packages/core/src/foundation/effects/service.ts`
```ts
import { and, eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { appliedEffects } from '../../db/schema/foundation/effects'
import { deriveEffectEventId } from './event-id'
import { EFFECT_CLASS_OF, type EffectEvent, NoEffectHandler, UnknownEffectType } from './types'
import type { EffectRegistry } from './registry'
// applyEffect: PLAN §3.4 + F1 §3B:71 "check-and-insert in the same local transaction". projection → rail no-op
// (BR-6). else: resolve → derive → in ONE tx: SELECT composite key → if present {applied:false} (BR-1); else insert
// ledger row + call handler (handler's write shares the tx, so a handler throw rolls BOTH back).
export function createEffectRail(db: DrizzleDb, registry: EffectRegistry) {
  return { async applyEffect(event: EffectEvent): Promise<{ applied: boolean }> {
    const cls = EFFECT_CLASS_OF[event.effectType]
    if (!cls) throw new UnknownEffectType(event.effectType)
    if (cls === 'projection') return { applied: true }                       // BR-6 no-op
    const handler = registry.resolve(event.effectType)
    if (!handler) throw new NoEffectHandler(event.effectType)                // BR-3 fail-loud, no write
    const id = deriveEffectEventId(event.subjectNaturalKey, event.transition, event.effectType)
    return db.transaction(async (tx) => {
      const existing = await tx.select().from(appliedEffects).where(and(
        eq(appliedEffects.effect_event_id, id),
        eq(appliedEffects.effect_type, event.effectType),
        eq(appliedEffects.target_ref, event.targetRef),
      )).all()
      if (existing.length > 0) return { applied: false }                     // BR-1 dedup
      await tx.insert(appliedEffects).values({
        effect_event_id: id, effect_type: event.effectType, target_ref: event.targetRef, applied_at: Date.now(),
      }).run()
      await handler(event, tx)                                               // co-writes through the SAME tx (F1); throw → both roll back
      return { applied: true }
    })
  } }
}
```
*(Uses only APIs proven in `repository.ts`: `db.transaction` (:332/392/456), `tx.insert(...).run()` (:334),
`.select().from().where(and(eq…))`. No dependency on an affected-rows return shape — the check-and-insert IS the F1
pattern. Single-user local DB: the in-tx SELECT-then-INSERT has no concurrent-writer race.)*

### 7. `packages/core/src/foundation/effects/index.ts` + `@vida/core` barrel
`export * from './types'; export * from './event-id'; export { createEffectRegistry, type EffectRegistry } from './registry'; export { createEffectRail } from './service'` — then add the effects barrel to `packages/core/src/index.ts`.

### 8. `packages/core/src/foundation/effects/__tests__/effects.test.ts`
Cases (acceptance #3): (a) same event twice → 1 ledger row + 2nd `{applied:false}`; (b) projection type → `{applied:true}`, 0 rows, handler never called; (c) `UnknownEffectType` on a bogus type; (d) `NoEffectHandler` when unregistered (and no ledger row written); (e) `DuplicateEffectHandler` on double register; (f) a **handler that writes via the passed `tx`** commits atomically with the ledger, and a **handler that throws** rolls back BOTH (0 ledger rows) — proving the tx co-write contract. Mock handlers use the `(event, tx) => …` signature. Use an in-memory better-sqlite3 harness (same as sessions/spaces tests) + migration 004. *(EFFECT_CLASS_OF exhaustiveness is already enforced by its `: Record<EffectType,EffectClass>` annotation at declaration — no separate test assert needed; a missing key fails `tsc`.)*

## Verification (run in order)
1. `pnpm --filter @vida/core typecheck` → 0 (exhaustive map compiles).
2. `pnpm --filter @vida/core test` → effects suite green + existing suites unbroken.
3. `enum-parity` green (effect_type CHECK ↔ EFFECT_TYPE).
4. root `pnpm typecheck` 10/10.

## §XXIX Currency (after green)
Create `docs/core/effects/current-spec.md` + `current-business-rules.md` (born from this PLAN + IMPL-PLAN; BR-1..7,
incl. the BR-2 canonical-string-now / hash-build-phase note). Commit docs WITH the code.

## Acceptance → PLAN §4 (1:1)
#1 table+migration → step 3/4 · #2 exhaustive map → step 1 (declaration annotation) · #3 tests → step 8 · #4 parity →
**step 4b** (wired into enum-parity.test.ts — else false-PASS) + verification 3 · #5 local-only (no `_sync_*`) → step 3 ·
#6 no hanging flag (§3.3 resolved) → PLAN grounded. Handler tx co-write contract (`(event, tx)`) → step 1 + 6 + test (f).
