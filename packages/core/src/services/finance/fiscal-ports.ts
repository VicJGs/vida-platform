// ============================================================================
// services/finance — fiscal-legal S8 DTOs + deny-safe ports (mod-finance #47 ① · S8)
//
// The guarded INFORM/DERIVE/ADVISE surface's data shapes + the deferred-reach
// ports. Every S8 external/cross-module target is UNBUILT (Tasks/Notifications/
// Calendar write-paths · export format-render · Purpose `contributions` writer),
// so each is a deny-safe port that swaps for the real impl at M2 with NO signature
// change — the S4 `StoreLockPort` / S5 `config-seams` precedent.
//
// Fail-mode split (grounded):
//  · fan-out = NON-atomic surfacing (the obligation row is a valid local record
//    without it, FIN-31 reserved-emit precedent) → the deny-safe default RETURNS
//    `{deferred:[...]}` (surfaced, never swallowed, never a rollback). No throw —
//    so no `FanoutTargetsNotActive` error exists (a defined-but-unthrown error is
//    the manufacture pattern this build refuses).
//  · filing format-export + contributions feed = a required capability is absent →
//    fail loud with a typed error (never fabricate).
// ============================================================================

import type { FiscalOwnerType, ContributionGoalType, ContributionContributorType } from '@vida/types'
import type { AiModeDisclosure } from '../../foundation/ai'
import type { EgressTarget, EgressSlice, UserInitiationProof } from '../../foundation/egress'
import type { FiscalObligationRow, FiscalResidencyRow, LegalEntityRow } from '../../db/schema/finance'

// ─── FL-3 legal disclaimer (distinct from the AI MODE disclosure) ───────────
// The "not professional advice" label baked onto every advisement (FL-3/FL-13).
// NOT the same as `buildAiDisclosure(mode)` (the egress-honesty bound) — an
// Advisement carries BOTH. `[FACT: business-rules.md:18-21,58-60]`
export const NOT_PROFESSIONAL_ADVICE = 'This is informational only — not professional, legal, or tax advice.' as const

// ─── FL-04 INFORM — the rule-pack handle ────────────────────────────────────
// A MINIMAL handle: `version` is structurally required NOW (a confirmed obligation's
// `source_rulepack_version` is notNull); the CONTENT (brackets/entity-types/deadlines)
// is an OWED M2 field landing with the ADR-014 public-reference build (format not yet
// specified — parts/finance.md:123 BLOCKER). `verified` = fetched-and-provenance-checked.
export interface RulePack {
  jurisdiction_code: string
  version: string
  verified: boolean
  /** Owed M2 — the parsed rule content (format unspecified). Never authored at M1. */
  content?: unknown
}

// ─── FL-05 DERIVE — an obligation candidate (proposed, not persisted) ───────
// The `fiscal_obligations` insert minus baseColumns/status. Comes from a hand-authored
// entry (FL-11 manual fallback) or `deriveObligations` (owed evaluation). `status` +
// `linked_task_id` are set by the service on confirm.
export interface ObligationCandidate {
  jurisdiction_code: string
  owner_type: FiscalOwnerType
  owner_id: string
  obligation_type: string
  due_date: string
  source_rulepack_version: string
  linked_task_id?: string | null
}

// The confirm → Tasks/Notifications/Calendar fan-out result. `deferred` names the
// targets not yet surfaced (M1: all three); a wired M2 port fills the ids + empties it.
export interface ObligationFanoutResult {
  taskId?: string
  notificationId?: string
  calendarId?: string
  deferred: string[]
}
export interface ConfirmResult {
  obligation: FiscalObligationRow
  fanout: ObligationFanoutResult
}

// ─── FL-06 ADVISE — a what-if scenario (input) + its advisement (output) ────
// The scenario carries the ADR-015 request shape; a `cloud` run additionally carries
// the egress triple, CALLER-SUPPLIED (the tier has no vault access to build a slice
// from — BR-S8-7). Maps to an `AiRequest`. `[FACT: ai/types.ts:83-94]`
interface WhatIfScenarioBase {
  defId: string
  jurisdiction_code: string
  prompt: string
}
export type WhatIfScenario =
  | (WhatIfScenarioBase & { mode: 'on_device' })
  | (WhatIfScenarioBase & {
      mode: 'cloud'
      target: EgressTarget
      slice: EgressSlice
      userInitiation: UserInitiationProof
    })

// An informational advisement — ALL fields readonly + non-optional so the service is
// the only producer and a caller cannot obtain one stripped of provenance/disclaimer
// (mutating one's own returned copy is out of the ZK threat model). `source='ai'` via
// `stampAiProvenance`; `disclaimer` = the FL-3 label; `modeDisclosure` = the egress bound.
export interface Advisement {
  readonly content: string
  readonly source: 'ai'
  readonly disclaimer: typeof NOT_PROFESSIONAL_ADVICE
  readonly modeDisclosure: AiModeDisclosure
}

// ─── FL-07 filing hand-off — the summary (deliverable) + format-export port ─
// `prepareFilingSummary` RETURNS this (contract.md:22 — the summary IS the hand-off);
// the OS never files. Assembled locally from the user's own data.
export interface FilingSummary {
  jurisdiction_code: string
  residencies: FiscalResidencyRow[]
  legalEntities: LegalEntityRow[]
  moneyTouch: { type: string; id: string; jurisdiction_code: string }[]
  obligations: FiscalObligationRow[]
}
export interface FilingHandoffRef {
  format: string
  ref: string
}

// ─── FL-08 long-run impact — a Purpose contribution feed (mirrors the schema) ─
// Mirrors `contributions` verbatim (never a bespoke path, FL-10). `[FACT: schema/foundation/purpose.ts:33-49]`
export interface ContributionInput {
  goal_type: ContributionGoalType
  goal_id: string
  contributor_type: ContributionContributorType
  contributor_id: string
  contribution_percentage: number // 0–100
  contribution_notes?: string | null
}

// ─── Deny-safe ports ────────────────────────────────────────────────────────

/** FL-6 confirm → Tasks/Notifications/Calendar. M1 default: the row stands; the echo is
 *  explicitly DEFERRED (surfaced, not swallowed, not a rollback). Swapped at M2. */
export interface ObligationFanoutPort {
  onConfirm(obligation: FiscalObligationRow): Promise<ObligationFanoutResult>
}
export const denySafeObligationFanoutPort: ObligationFanoutPort = {
  async onConfirm() {
    return { deferred: ['tasks', 'notifications', 'calendar'] }
  },
}

/** FL-2 filing FORMAT-export (PDF/DOCX via the export module). OPTIONAL — the summary
 *  itself returns without it. M1 default: fail loud (never fabricates a hand-off). */
export interface FilingExportPort {
  toFormat(summary: FilingSummary, format: string): Promise<FilingHandoffRef>
}
export class FilingExportNotActive extends Error {
  constructor(detail: string) {
    super(`Filing format-export not active: ${detail}`)
    this.name = 'FilingExportNotActive'
  }
}
export const denySafeFilingExportPort: FilingExportPort = {
  async toFormat(_summary, format) {
    throw new FilingExportNotActive(`no export substrate wired (format '${format}' — M2)`)
  },
}

/** FL-10 long-run impact → Purpose `contributions` (Purpose-owned writer, unbuilt).
 *  M1 default: fail loud (typed) — never a silent no-op, never a bespoke path. */
export interface ContributionsPort {
  feed(contribution: ContributionInput): Promise<void>
}
export class ContributionsSinkNotActive extends Error {
  constructor(detail: string) {
    super(`Contributions sink not active: ${detail}`)
    this.name = 'ContributionsSinkNotActive'
  }
}
export const denySafeContributionsPort: ContributionsPort = {
  async feed() {
    throw new ContributionsSinkNotActive('Purpose contributions writer not built (M2)')
  },
}
