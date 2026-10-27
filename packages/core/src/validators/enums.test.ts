// ============================================================================
// DB-9 — canonical enum validators (BR-DB9-4: reject invalid, accept valid)
//
// Every validator is built identically — `z.enum(<canonical tuple>)` — so a
// representative spread across domains (incl. a shared enum) proves the
// mechanism uniformly. The tuple↔union↔schema
// structural equality is additionally guaranteed by `pnpm typecheck` (the
// schema is built FROM the tuple) and by enum-parity.test.ts for the DB side.
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  STATUS,
  PRIORITY,
  SYNC_OPERATION,
  ACCOUNT_TYPE,
  MASTERY_LEVEL,
  VAULT_STATE,
  ACHIEVEMENT_TIER,
  SESSION_SUB_TYPE,
  SESSION_PURPOSE,
  SCHEDULING_MODE,
  SESSION_STATUS,
  EFFECT_TYPE,
} from '@vida/types'
import { StatusSchema, PrioritySchema } from './common'
import { SyncOperationSchema } from './sync'
import { AccountTypeSchema } from './finance'
import { MasteryLevelSchema } from './learning'
import { VaultStateSchema } from './encryption'
import { AchievementTierSchema } from './user'
import {
  SessionSubTypeSchema,
  SessionPurposeSchema,
  SchedulingModeSchema,
  SessionStatusSchema,
  EffectTypeSchema,
} from './session'

// each pair: the z.enum validator and the canonical tuple it was built from
const PAIRS = [
  { name: 'Status', schema: StatusSchema, tuple: STATUS },
  { name: 'Priority', schema: PrioritySchema, tuple: PRIORITY },
  { name: 'SyncOperation', schema: SyncOperationSchema, tuple: SYNC_OPERATION },
  { name: 'AccountType', schema: AccountTypeSchema, tuple: ACCOUNT_TYPE },
  { name: 'MasteryLevel', schema: MasteryLevelSchema, tuple: MASTERY_LEVEL },
  { name: 'VaultState', schema: VaultStateSchema, tuple: VAULT_STATE },
  { name: 'AchievementTier', schema: AchievementTierSchema, tuple: ACHIEVEMENT_TIER },
  // AR-5 session enums (EFFECT_TYPE = the 12-member catalogue; covered here, not by the SQL parity test — BR-5b)
  { name: 'SessionSubType', schema: SessionSubTypeSchema, tuple: SESSION_SUB_TYPE },
  { name: 'SessionPurpose', schema: SessionPurposeSchema, tuple: SESSION_PURPOSE },
  { name: 'SchedulingMode', schema: SchedulingModeSchema, tuple: SCHEDULING_MODE },
  { name: 'SessionStatus', schema: SessionStatusSchema, tuple: SESSION_STATUS },
  { name: 'EffectType', schema: EffectTypeSchema, tuple: EFFECT_TYPE },
] as const

describe('canonical enum validators', () => {
  for (const { name, schema, tuple } of PAIRS) {
    it(`${name}: accepts every canonical member`, () => {
      for (const member of tuple) {
        expect(schema.parse(member)).toBe(member)
      }
    })

    it(`${name}: rejects a non-member`, () => {
      expect(schema.safeParse('__not_a_member__').success).toBe(false)
      expect(schema.safeParse('').success).toBe(false)
    })

    it(`${name}: the z.enum option set equals the canonical tuple (no drift)`, () => {
      const optionSet = [...schema.options].sort().join('|')
      const tupleSet = [...tuple].sort().join('|')
      expect(optionSet).toBe(tupleSet)
    })
  }
})
