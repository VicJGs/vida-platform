// ============================================================================
// services/purposes — the Journal contribution + the SS-7 DueProvider registration (mod-purposes-and-goals #55 ① · S9)
//
// Purposes registers TWO provider lanes (PG-14, aggregator pattern — names no consumer):
//  · a `JournalContribution` into the Journals-owned registry — `summary(date)` feeds the daily recap with the day's
//    active purposes + targets whose review is due (the Journal `/summary` block). PULL path (ADR-004 §3.2.5 — the
//    Journal is pull-aggregated at render), NOT a rail push (the S9 completion fan-out is measurement-only, C-E2).
//  · a `DueProvider` into the sessions SS-7 due-work lane — `dueIn(range)` surfaces target reviews due in the window
//    as canonical `DueItem`s (purposes is the FIRST SS-7 consumer). The registry handles are PARAMS to these helpers
//    (not service deps — the projects precedent), so the service holds no unused `journal`/`sessions`-registry field.
//
// A no-activity day returns a well-formed `state:'empty'` SectionData, never a throw. Reuses the TerminalState canon
// BY TYPE (state from the live digest, not deriveTerminalState — the projects/learning-education precedent).
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { SessionsService } from '../sessions'
import type { PurposesService } from './types'

// The recap data points Purposes advertises (active purposes + reviews due that day).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'active_purposes', label: 'Active purposes' },
  { id: 'reviews_due', label: 'Reviews due' },
]

/** The Purposes Journal contribution (summary recap: active purposes + reviews due for the day). Summary-only — the
 *  review-due agenda is surfaced through the sessions DueProvider lane (below), not `JournalContribution.dueIn`. */
export function createPurposesJournalContribution(svc: PurposesService): JournalContribution {
  return {
    module: 'purposes',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayPurposesDigest(date)
      // Any activity (an active purpose OR a review due today) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState = digest.activePurposes + digest.reviewsDue > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'purposes',
        dataPoints: DATA_POINTS,
        state,
        items: [{ activePurposes: digest.activePurposes, reviewsDue: digest.reviewsDue }],
      }
    },
  }
}

/** Register the Purposes contribution into the Journals registry (the register-helper pattern). */
export function registerPurposesJournal(registry: JournalRegistry, svc: PurposesService): void {
  registry.register(createPurposesJournalContribution(svc))
}

/** Register the purposes review-due lane into the sessions SS-7 due-work seam (purposes = first consumer). */
export function registerPurposesDueProvider(sessions: SessionsService, svc: PurposesService): void {
  sessions.registerDueProvider({ module: 'purposes', fetch: (range) => svc.dueIn(range) })
}
