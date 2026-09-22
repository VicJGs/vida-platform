// ============================================================================
// services/finance — fiscal-legal SITUATE (mod-finance #47 ① · S7)
//
// createFiscalLegalService — a Finance SUB-CONTEXT (FL-1): the always-available,
// no-external-dep spine (FL-4/FL-11). Residency + legal-entity CRUD + a money-touch
// jurisdiction link (FL-01/02/03), the fail-closed external-grant gate (FL-09), and
// the full typed-error contract (FL-10; S8 throws the INFORM/DERIVE/ADVISE ones).
//
// Returns Row types directly — @vida/types has no fiscal-legal interface (DB-11, the
// raw-reader precedent), so no _sync_status cast. Factory-object, hoisted closures,
// no `this.`. encryptedFields:[] M1.0 pass-through for the [E] notNull fields
// (notes/name/registration_ref). softDelete:true on both tables. No schema (020_finance).
// ============================================================================

import type { z } from 'zod'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  fiscalResidencies,
  legalEntities,
  type FiscalResidencyRow,
  type LegalEntityRow,
} from '../../db/schema/finance'
import {
  CreateResidencySchema,
  UpdateResidencySchema,
  CreateLegalEntitySchema,
  UpdateLegalEntitySchema,
} from '../../validators/finance'
import type { CapabilityEnforcer, CapabilityAction } from '../../foundation/capability'
import type { FinanceService } from './types'

// --- FL-10 typed-error contract (names ARE the contract; messages ← business-rules.md:88-96) -----
/** X3 signature/version fail → rule-pack not applied; derivation flags "unverified" (S8). */
export class RulePackUnverified extends Error {
  constructor(detail: string) {
    super(`Rule-pack unverified: ${detail}`)
    this.name = 'RulePackUnverified'
  }
}
/** Fail-closed: no external grant → no fetch/egress (S7 gate + S8). */
export class ExternalGrantMissing extends Error {
  constructor(detail: string) {
    super(`External grant missing: ${detail}`)
    this.name = 'ExternalGrantMissing'
  }
}
/** A what-if with a missing rule-pack → "insufficient rule data", never fabricates (S8). */
export class InsufficientRuleData extends Error {
  constructor(detail: string) {
    super(`Insufficient rule data: ${detail}`)
    this.name = 'InsufficientRuleData'
  }
}
/** Every advisement is "not professional advice" + source=ai, unstrippable (S8). */
export class AdviceIsInformational extends Error {
  constructor(detail: string) {
    super(`Advice is informational, not professional/legal/tax advice: ${detail}`)
    this.name = 'AdviceIsInformational'
  }
}
/** Never auto-applied on legal/tax — the user confirms every derived obligation/filing (S8). */
export class NoAutoAction extends Error {
  constructor(detail: string) {
    super(`No auto-action on legal/tax matters: ${detail}`)
    this.name = 'NoAutoAction'
  }
}
/** Filing produces an organized summary and HANDS OFF — the OS never files (S8). */
export class FilingHandsOff extends Error {
  constructor(detail: string) {
    super(`Filing hands off (summary, not filing): ${detail}`)
    this.name = 'FilingHandsOff'
  }
}
/** A cloud-AI advisement failure is isolated; the local SITUATE/TRACK spine is unaffected (S8). */
export class ModelUnavailable extends Error {
  constructor(detail: string) {
    super(`Model unavailable: ${detail}`)
    this.name = 'ModelUnavailable'
  }
}

// The FL-9 money-touch entity types (a jurisdiction link on existing Finance entities; liability EXCLUDED).
export const MONEY_TOUCH_TYPES = ['account', 'transaction', 'asset', 'investment', 'income_stream'] as const
export type MoneyTouchType = (typeof MONEY_TOUCH_TYPES)[number]

export type CreateResidencyInput = z.infer<typeof CreateResidencySchema>
export type UpdateResidencyInput = z.infer<typeof UpdateResidencySchema>
export type CreateLegalEntityInput = z.infer<typeof CreateLegalEntitySchema>
export type UpdateLegalEntityInput = z.infer<typeof UpdateLegalEntitySchema>

export interface FiscalLegalServiceDeps {
  db: DrizzleDb
  deviceId: string
  finance: FinanceService // FL-02 linkMoneyTouch delegates to its validated update path (sub-context composes parent)
  enforcer?: CapabilityEnforcer // FL-09 grant-gate; absent ⇒ ExternalGrantMissing (fail-closed, M1)
}

export interface FiscalLegalService {
  // FL-01 — residency CRUD (the SITUATE spine)
  setResidency(input: CreateResidencyInput): Promise<FiscalResidencyRow>
  updateResidency(id: string, patch: UpdateResidencyInput): Promise<FiscalResidencyRow>
  softDeleteResidency(id: string): Promise<void>
  listResidencies(): Promise<FiscalResidencyRow[]>
  // FL-03 — legal-entity CRUD (composes Projects via project_id, no-FK)
  registerLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntityRow>
  updateLegalEntity(id: string, patch: UpdateLegalEntityInput): Promise<LegalEntityRow>
  softDeleteLegalEntity(id: string): Promise<void>
  listLegalEntities(): Promise<LegalEntityRow[]>
  // FL-02 — money-touch = set jurisdiction_code on a Finance entity (delegates to finance; Finance untouched)
  linkMoneyTouch(entityType: MoneyTouchType, entityId: string, jurisdictionCode: string): Promise<void>
  // FL-09 — external-access grant-gate (fail-closed)
  assertExternalGrant(defId: string, action: CapabilityAction): Promise<void>
}

export function createFiscalLegalService(deps: FiscalLegalServiceDeps): FiscalLegalService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const residencyRepo = createRepository(db, fiscalResidencies, cfg)
  const legalEntityRepo = createRepository(db, legalEntities, cfg)

  // serialize create: backfill nullables → null (faithful echo; the finance-service precedent).
  const serializeResidency = (p: CreateResidencyInput): CreateInput<typeof fiscalResidencies> => ({
    owner_type: p.owner_type,
    owner_id: p.owner_id,
    jurisdiction_code: p.jurisdiction_code,
    residency_type: p.residency_type,
    start_date: p.start_date,
    end_date: p.end_date ?? null,
    notes: p.notes,
    deleted_at: null,
  })
  const serializeLegalEntity = (p: CreateLegalEntityInput): CreateInput<typeof legalEntities> => ({
    project_id: p.project_id ?? null,
    name: p.name,
    entity_type: p.entity_type,
    jurisdiction_code: p.jurisdiction_code,
    registration_ref: p.registration_ref,
    deleted_at: null,
  })

  return {
    // ── FL-01 residencies ───────────────────────────────────────────
    setResidency: async (input) => residencyRepo.create(serializeResidency(CreateResidencySchema.parse(input))),
    updateResidency: async (id, patch) => residencyRepo.update(id, UpdateResidencySchema.parse(patch)),
    softDeleteResidency: async (id) => {
      await residencyRepo.delete(id)
    },
    listResidencies: async () => residencyRepo.findAll(),

    // ── FL-03 legal entities ────────────────────────────────────────
    registerLegalEntity: async (input) =>
      legalEntityRepo.create(serializeLegalEntity(CreateLegalEntitySchema.parse(input))),
    updateLegalEntity: async (id, patch) => legalEntityRepo.update(id, UpdateLegalEntitySchema.parse(patch)),
    softDeleteLegalEntity: async (id) => {
      await legalEntityRepo.delete(id)
    },
    listLegalEntities: async () => legalEntityRepo.findAll(),

    // ── FL-02 money-touch (jurisdiction link on existing Finance entities; Finance untouched) ──
    linkMoneyTouch: async (entityType, entityId, jurisdictionCode) => {
      const patch = { jurisdiction_code: jurisdictionCode }
      switch (entityType) {
        case 'account':
          await deps.finance.updateAccount(entityId, patch)
          return
        case 'transaction':
          await deps.finance.updateTransaction(entityId, patch)
          return
        case 'asset':
          await deps.finance.updateAsset(entityId, patch)
          return
        case 'investment':
          await deps.finance.updateInvestment(entityId, patch)
          return
        case 'income_stream':
          await deps.finance.updateIncomeStream(entityId, patch)
          return
        default: {
          // Exhaustive over MoneyTouchType at compile time; guards a runtime cast to an unsupported type.
          const bad: never = entityType
          throw new Error(`not a money-touch entity type: ${String(bad)}`)
        }
      }
    },

    // ── FL-09 external-access grant-gate (fail-closed) ───────────────
    assertExternalGrant: async (defId, action) => {
      if (!deps.enforcer) {
        throw new ExternalGrantMissing(`no capability enforcer wired — ${action.type} denied (M1 fail-closed)`)
      }
      const decision = await deps.enforcer.checkAction(defId, action)
      if (!decision.allowed) {
        throw new ExternalGrantMissing(`grant denied for ${action.type} (capability ${defId})`)
      }
    },
  }
}
