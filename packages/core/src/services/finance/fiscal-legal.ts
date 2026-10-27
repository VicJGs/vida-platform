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

import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  fiscalResidencies,
  legalEntities,
  fiscalObligations,
  type FiscalResidencyRow,
  type LegalEntityRow,
} from '../../db/schema/finance'
import {
  CreateResidencySchema,
  UpdateResidencySchema,
  CreateLegalEntitySchema,
  UpdateLegalEntitySchema,
  ObligationCandidateSchema,
  DeriveObligationsRangeSchema,
} from '../../validators/finance'
import type { CapabilityEnforcer, CapabilityAction } from '../../foundation/capability'
import { createPublicReferenceEngine, PublicRefDenied, type PublicReferenceEngine } from '../../foundation/ingestion'
import {
  AI_MODES,
  buildAiDisclosure,
  stampAiProvenance,
  AiDenied,
  type AiService,
  type AiRequest,
} from '../../foundation/ai'
import {
  denySafeObligationFanoutPort,
  denySafeFilingExportPort,
  denySafeContributionsPort,
  NOT_PROFESSIONAL_ADVICE,
  type RulePack,
  type ObligationCandidate,
  type ConfirmResult,
  type Advisement,
  type FilingSummary,
  type FilingHandoffRef,
  type ContributionInput,
  type WhatIfScenario,
  type ObligationFanoutPort,
  type FilingExportPort,
  type ContributionsPort,
} from './fiscal-ports'
import type { FinanceService } from './types'

// The fixed fiscal-legal capability id the external_in (rule-pack) grant runs under.
// Moot at M1 (no enforcer wired ⇒ ExternalGrantMissing before use); real def = M2.
const FISCAL_LEGAL_CAP_ID = 'fiscal-legal'
// A jurisdiction's rule-pack is a public dataset; the datasetId namespaces the whole-set fetch.
const rulePackDatasetId = (jurisdiction: string): string => `rulepack:${jurisdiction}`

// FL-06 — validate the fiscal-owned BASE of a what-if scenario at the service boundary (parity with the
// other S8 ops' `.parse`). The `cloud` egress triple (target/slice/userInitiation) is structurally typed +
// caller-supplied from the built egress guard (not re-validated here). Co-located (not in validators/) so
// validators stays a @vida/types leaf — this guard needs the foundation/ai AI_MODES set. `[FACT: PLAN §3.3]`
const WhatIfScenarioBaseSchema = z.object({
  defId: z.string().min(1),
  jurisdiction_code: z.string().min(1),
  mode: z.enum(AI_MODES),
  prompt: z.string(),
})

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
  // ── S8 guarded ports (all deny-safe/fail-closed by default; zero-signature-change swap at M2) ──
  publicRef?: PublicReferenceEngine // FL-04; default = createPublicReferenceEngine() (M1 deny-safe fetch)
  ai?: AiService // FL-06; absent ⇒ model() throws ModelUnavailable (no ambient AI, fail-closed)
  fanout?: ObligationFanoutPort // FL-05c; default = deny-safe (row stands, echo deferred)
  filingExport?: FilingExportPort // FL-07; default = deny-safe (format-export throws; summary unaffected)
  contributions?: ContributionsPort // FL-08; default = deny-safe (throws; never a silent no-op)
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

  // ── S8: guarded INFORM / DERIVE / ADVISE ──────────────────────────────────
  /** FL-04 INFORM — a jurisdiction's rule-pack via the ADR-014 public-reference layer (deny-safe M1).
   *  Grant-gated (external_in); a poisoned/unfetched pack → RulePackUnverified. */
  rulePack(jurisdiction: string): Promise<RulePack>
  /** FL-05 DERIVE — propose obligation candidates on-device from user data + a VERIFIED pack.
   *  NEVER persists, NEVER fans out. The per-jurisdiction rule-evaluation is an OWED M2 seam
   *  (rule-pack content format unspecified); refuses on an unverified pack (RulePackUnverified). */
  deriveObligations(range: { from: string; to: string }, pack: RulePack): Promise<ObligationCandidate[]>
  /** FL-05c — the ONLY persist path (NoAutoAction is structural): persist a fiscal_obligations row
   *  (from a derived OR hand-authored FL-11 candidate) + deny-safe fan-out; the deferral is surfaced. */
  confirmObligation(candidate: ObligationCandidate): Promise<ConfirmResult>
  /** FL-06 ADVISE — a what-if over the user's numbers via the ADR-015 AI layer (deny-safe M1).
   *  Requires a verified pack (else InsufficientRuleData); output carries source=ai + BOTH disclosures.
   *  An AI deny/failure → ModelUnavailable, isolated from the SITUATE/TRACK spine. */
  model(scenario: WhatIfScenario, pack: RulePack): Promise<Advisement>
  /** FL-07 — assemble + RETURN the organized filing summary (the deliverable; the OS never files). */
  prepareFilingSummary(jurisdiction: string): Promise<FilingSummary>
  /** FL-07 — OPTIONAL format-export (PDF/DOCX) of a summary; deny-safe M1 (FilingExportNotActive). */
  exportFiling(summary: FilingSummary, format: string): Promise<FilingHandoffRef>
  /** FL-08 — feed a modeled long-run fiscal impact into Purpose via the ADR-011 contributions rail (deny-safe M1). */
  feedLongRunImpact(impact: ContributionInput): Promise<void>
}

export function createFiscalLegalService(deps: FiscalLegalServiceDeps): FiscalLegalService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const residencyRepo = createRepository(db, fiscalResidencies, cfg)
  const legalEntityRepo = createRepository(db, legalEntities, cfg)
  const obligationRepo = createRepository(db, fiscalObligations, cfg)

  // S8 deny-safe port defaults — every guarded reach fails closed / defers explicitly; M2 swaps in place.
  const publicRef = deps.publicRef ?? createPublicReferenceEngine()
  const fanout = deps.fanout ?? denySafeObligationFanoutPort
  const filingExport = deps.filingExport ?? denySafeFilingExportPort
  const contributions = deps.contributions ?? denySafeContributionsPort

  // FL-09 grant-gate hoisted to a closure so rulePack (S8) can reuse it intra-service (no `this.`,
  // the factory-service rule); the interface `assertExternalGrant` method delegates to it.
  const assertExternalGrantImpl = async (defId: string, action: CapabilityAction): Promise<void> => {
    if (!deps.enforcer) {
      throw new ExternalGrantMissing(`no capability enforcer wired — ${action.type} denied (M1 fail-closed)`)
    }
    const decision = await deps.enforcer.checkAction(defId, action)
    if (!decision.allowed) {
      throw new ExternalGrantMissing(`grant denied for ${action.type} (capability ${defId})`)
    }
  }

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
    assertExternalGrant: assertExternalGrantImpl,

    // ── FL-04 INFORM — rule-pack via the ADR-014 public-reference layer (deny-safe M1) ──
    rulePack: async (jurisdiction) => {
      const datasetId = rulePackDatasetId(jurisdiction)
      // Grant-gate FIRST (external_in) — fail-closed with no enforcer; then the built engine.
      await assertExternalGrantImpl(FISCAL_LEGAL_CAP_ID, { type: 'external_in', source: datasetId })
      try {
        // fetchWholeSet verifies provenance/signature before returning ⇒ a returned pack IS verified.
        const ds = await publicRef.fetchWholeSet({ datasetId })
        return { jurisdiction_code: jurisdiction, version: ds.version, verified: true }
      } catch (e) {
        if (e instanceof PublicRefDenied) throw new RulePackUnverified(`${jurisdiction}: ${e.reason}`)
        throw e
      }
    },

    // ── FL-05 DERIVE — propose candidates (no persist/fanout); rule-evaluation OWED M2 ──
    deriveObligations: async (range, pack) => {
      DeriveObligationsRangeSchema.parse(range)
      if (!pack.verified) throw new RulePackUnverified(`${pack.jurisdiction_code}: rule-pack not verified`)
      // The per-jurisdiction evaluation (brackets/deadlines → candidates) lands with the OWED rule-pack
      // content format at M2 (parts/finance.md:123). A verified handle carries no content to evaluate yet
      // ⇒ no candidates. NEVER persists / fans out — NoAutoAction is structural (only confirm persists).
      return []
    },

    // ── FL-05c — the ONLY persist path: real fiscal_obligations write + deny-safe fan-out ──
    confirmObligation: async (candidate) => {
      const c = ObligationCandidateSchema.parse(candidate)
      const obligation = await obligationRepo.create({
        jurisdiction_code: c.jurisdiction_code,
        owner_type: c.owner_type,
        owner_id: c.owner_id,
        obligation_type: c.obligation_type,
        due_date: c.due_date,
        status: 'pending', // OPEN vocab (no CHECK) — the app default for a freshly confirmed obligation
        source_rulepack_version: c.source_rulepack_version,
        linked_task_id: c.linked_task_id ?? null, // M1: fan-out deferred ⇒ no task id yet (M2 writes it back)
        deleted_at: null,
      })
      // Fan-out AFTER the row is committed — the obligation is a valid local record on its own; the
      // Tasks/Notifications/Calendar echo is additive surfacing (FIN-31 reserved-emit, not S4-atomic).
      const fanoutResult = await fanout.onConfirm(obligation)
      return { obligation, fanout: fanoutResult }
    },

    // ── FL-06 ADVISE — what-if via ADR-015 AI (deny-safe M1); source=ai + BOTH disclosures ──
    model: async (scenario, pack) => {
      WhatIfScenarioBaseSchema.parse(scenario) // validate at the boundary (mode ∈ AI_MODES; base fields present)
      if (!pack.verified) throw new InsufficientRuleData(`${scenario.jurisdiction_code}: no verified rule-pack`)
      if (!deps.ai) throw new ModelUnavailable('no AI service wired (M1 fail-closed)')
      const req: AiRequest =
        scenario.mode === 'cloud'
          ? {
              defId: scenario.defId,
              mode: 'cloud',
              target: scenario.target,
              slice: scenario.slice,
              userInitiation: scenario.userInitiation,
            }
          : { defId: scenario.defId, mode: 'on_device' }
      let content: string
      try {
        const resp = await deps.ai.askModel(req)
        content = resp.content
      } catch (e) {
        if (e instanceof AiDenied) throw new ModelUnavailable(`${scenario.jurisdiction_code}: ${e.reason}`)
        throw e
      }
      // source=ai (stampAiProvenance) + BOTH disclosures: the FL-3 legal label + the AI mode/egress bound.
      return stampAiProvenance({
        content,
        disclaimer: NOT_PROFESSIONAL_ADVICE,
        modeDisclosure: buildAiDisclosure(scenario.mode),
      })
    },

    // ── FL-07 — assemble + RETURN the filing summary (the deliverable; the OS never files) ──
    prepareFilingSummary: async (jurisdiction) => {
      // `and()` returns `SQL | undefined` only when ALL args are undefined; both operands here are always
      // concrete, so it is never undefined — the `!` is safe (findWhere skips the soft-delete filter, so
      // isNull(deleted_at) is explicit — the repository-findwhere-skips-softdelete-filter seam).
      // All 8 reads are independent — one Promise.all, not 3 serial findWhere then a batch (findWhere skips
      // the soft-delete filter, so isNull(deleted_at) is explicit — the findwhere-skips-softdelete seam).
      const [residencies, entities, obligations, accounts, assets, investments, incomeStreams, transactions] =
        await Promise.all([
          residencyRepo.findWhere(
            and(eq(fiscalResidencies.jurisdiction_code, jurisdiction), isNull(fiscalResidencies.deleted_at))!,
          ),
          legalEntityRepo.findWhere(
            and(eq(legalEntities.jurisdiction_code, jurisdiction), isNull(legalEntities.deleted_at))!,
          ),
          obligationRepo.findWhere(
            and(eq(fiscalObligations.jurisdiction_code, jurisdiction), isNull(fiscalObligations.deleted_at))!,
          ),
          deps.finance.listAccounts(),
          deps.finance.listAssets(),
          deps.finance.listInvestments(),
          deps.finance.listIncomeStreams(),
          deps.finance.listTransactions(),
        ])
      const here = (jc: string | null): boolean => jc === jurisdiction
      const moneyTouch = [
        ...accounts
          .filter((a) => here(a.jurisdiction_code))
          .map((a) => ({ type: 'account', id: a.id, jurisdiction_code: jurisdiction })),
        ...transactions
          .filter((t) => here(t.jurisdiction_code))
          .map((t) => ({ type: 'transaction', id: t.id, jurisdiction_code: jurisdiction })),
        ...assets
          .filter((a) => here(a.jurisdiction_code))
          .map((a) => ({ type: 'asset', id: a.id, jurisdiction_code: jurisdiction })),
        ...investments
          .filter((i) => here(i.jurisdiction_code))
          .map((i) => ({ type: 'investment', id: i.id, jurisdiction_code: jurisdiction })),
        ...incomeStreams
          .filter((s) => here(s.jurisdiction_code))
          .map((s) => ({ type: 'income_stream', id: s.id, jurisdiction_code: jurisdiction })),
      ]
      return { jurisdiction_code: jurisdiction, residencies, legalEntities: entities, moneyTouch, obligations }
    },

    // ── FL-07 — optional format-export of a summary (deny-safe M1) ──
    exportFiling: async (summary, format) => filingExport.toFormat(summary, format),

    // ── FL-08 — long-run impact → Purpose contributions rail (deny-safe M1) ──
    feedLongRunImpact: async (impact) => {
      await contributions.feed(impact)
    },
  }
}
