// ============================================================================
// buildJournalSummary — MOD-notes ② · B7 (LIF-131). B7's OWN `/summary` block
// surface (NOT an ① method — intent authority contract.md:20 · identity.md:19 ·
// current-spec.md:62 · seam-contract.md:43). It consumes MOD-journals' aggregation
// engine directly. The engine (journal-service.ts buildDashboard) is 0 lines,
// fenced to MOD-journals #33, and mod-journals is `blocked-by mod-notes` — so this
// CANNOT consume a live engine yet. Each enabled row degrades to state 'empty'
// ("available when Journals ships" — NOT an error; business-rules.md:30), never
// blanking. #33 later swaps this body for a real buildDashboard call — the
// signature is the freeze point (BR-B7-2/3/7). Authors ZERO @vida/core journal
// code; the AR-9 JournalSeamNotActivated is the PRECEDENT (not thrown here —
// B7 never calls registerJournalContribution). Pure — unit-tested.
// ============================================================================

import type { TerminalState } from '../../state-conventions/terminal-state' // the 4-literal canon, by TYPE
import type { DataPoint } from '../../home/journal-contribution'
import type { DailySummarySectionType, JournalSummaryConfig } from '@vida/types'

/** The copy shown for an inert row until MOD-journals #33 activates the engine (the E5 placeholder ethos). */
export const SUMMARY_INERT_MESSAGE = 'available when Journals ships'

/**
 * A B7-LOCAL per-row result — keyed by the summary ROW (`DailySummarySectionType`), NOT `home/`'s `SectionData`
 * (which is `HomeSectionKey`-keyed = the 3 Home lanes summary|agenda|entry, a DIFFERENT granularity, and has no
 * message field). `[FACT: home/journal-contribution.ts:22-26; home/section-model.ts:8; Doc-Gate B1/B2]`
 */
export interface SummaryRow {
  readonly section: DailySummarySectionType
  /** Inert engine → 'empty'; 'error' is reserved for a #33-era provider that actually threw (ContributionFailed). */
  readonly state: TerminalState
  readonly dataPoints: readonly DataPoint[]
  readonly message?: string
}

/**
 * Assemble the day's summary per enabled row. Engine inert (wave order) → every row degrades to `'empty'` with the
 * inert message; never throws, never blanks. `date` is part of the frozen signature #33 will consume (unused today).
 * `[FACT: b7-summary-block.md §3, BR-B7-2/3; business-rules.md:30,38; contract.md:33]`
 */
export function buildJournalSummary(
  // The frozen date slot #33 consumes (which day to aggregate). Unused by the inert impl → `_`-prefixed per
  // noUnusedParameters; #33 rewrites this body to a real buildDashboard(date, …) call. `[FACT: contract.md:20; BR-B7-7]`
  _date: string | null,
  sections: readonly DailySummarySectionType[],
): readonly SummaryRow[] {
  return sections.map((section) => ({
    section,
    state: 'empty' as TerminalState,
    dataPoints: [],
    message: SUMMARY_INERT_MESSAGE,
  }))
}

/**
 * The A7 persisted-default fallback (BR-B7-4): map the 5 `JournalSummaryConfig` show-flags → their summary rows.
 * `routines` has NO flag (the G5 delta → M1.4), so it is never produced here. Used ONLY when the block's own
 * `sections` attr is empty. `[FACT: note.ts:83-89 (5 flags); editor.ts:56-63 (6 rows); business-rules.md:43 (G5)]`
 */
export function sectionsFromConfig(config: JournalSummaryConfig): DailySummarySectionType[] {
  const rows: DailySummarySectionType[] = []
  if (config.showHabits) rows.push('habits')
  if (config.showTasks) rows.push('tasks')
  if (config.showStudySessions) rows.push('study')
  if (config.showTransactions) rows.push('transactions')
  if (config.showInteractions) rows.push('interactions')
  return rows
}
