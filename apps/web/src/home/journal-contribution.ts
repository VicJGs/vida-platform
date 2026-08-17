// Journal-contribution registry seam — UX-6 (LIF-95). The typed contract by which each module registers its
// Journal presence (summary + agenda), naming NO module (a `module` string field, not a hard reference — BR-2).
// SIGNATURE-ONLY: the runtime is the downstream engine (journal-service.ts → MOD-journals #33, M1.1; "0 lines
// INTENDED"). Mirrors ADR-004's registry pattern; the contract itself is journals/contract.md [INTENT]. Follows
// the AR-9 `SyncNotActivated` deferred-seam precedent (packages/core/src/sync/types.ts).
import type { TerminalState } from '../state-conventions/terminal-state'
import type { HomeSectionKey } from './section-model'

/** A single user-selectable data point a module advertises for the Journal. `[INTENT: journals/contract.md:12-14]` */
export interface DataPoint {
  readonly id: string
  readonly label: string
}

/** A calendar-date range (`YYYY-MM-DD`); the agenda uses a single-day range (today). `[FACT: conventions — dates YYYY-MM-DD]` */
export interface DateRange {
  readonly from: string
  readonly to: string
}

/** One section's aggregated result — its already-resolved terminal state + the data points shown. */
export interface SectionData {
  readonly sectionKey: HomeSectionKey
  readonly dataPoints: readonly DataPoint[]
  readonly state: TerminalState
}

/**
 * A module's registered Journal contribution. `module` is a STRING field, not a hard reference — the journal
 * names no module (BR-2). `summary(date)` feeds the recap; `dueIn(range)` feeds the agenda (a single-day range).
 * `[INTENT: journals/contract.md:12-18 (J2/J3)]`
 */
export interface JournalContribution {
  readonly module: string
  readonly sectionKey: HomeSectionKey
  readonly dataPoints: readonly DataPoint[]
  summary(date: string): SectionData
  dueIn(range: DateRange): SectionData
}

/**
 * Thrown by the inert registry seam until the engine activates it (MOD-journals #33, M1.1). Defined here (not
 * imported) following the AR-9 `SyncNotActivated` precedent — the milestone/message is journal-specific.
 */
export class JournalSeamNotActivated extends Error {
  constructor(seam: string) {
    super(`journal seam not activated until MOD-journals (M1.1): ${seam}`)
    this.name = 'JournalSeamNotActivated'
  }
}

/**
 * Register a module's Journal contribution. RESERVED SEAM — inert until the engine (MOD-journals #33) fills it;
 * throws `JournalSeamNotActivated`. The signature is the documented target (BR-2). `[INTENT: journals/contract.md:12-14]`
 */
export function registerJournalContribution(_def: JournalContribution): never {
  throw new JournalSeamNotActivated('registerJournalContribution')
}
