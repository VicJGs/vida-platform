// ============================================================================
// services/learning-education — the Journal contribution (mod-learning-education #52 ① · S10)
//
// Education registers ONE JournalContribution into the Journals-owned registry — `summary(date)` feeds the daily recap
// with the day's class sessions + due assessments (the Journal `/summary` block, contract.md:57). This is the PULL path
// (ADR-004 §3.2.5 — the Journal is pull-aggregated at render); the class/assessment activity reaches the dashboard here,
// NOT via a rail push (the S10 effect fan-out is measurement-only, C-E2 — no Journal projection). A no-activity day
// returns a well-formed `state:'empty'` SectionData, never a throw (the per-section degrade is the dashboard's). Reuses
// the TerminalState canon BY TYPE (state from the live digest, not deriveTerminalState — the books/knowledge precedent).
// The registry dedups by `module`, so Education ('learning-education') coexists with books/knowledge under the shared
// `sectionKey:'summary'`.
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { LearningEducationService } from './types'

// The recap data points Education advertises (contract.md:57 — "today's class sessions + due assessments").
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'class_sessions', label: 'Class sessions' },
  { id: 'due_assessments', label: 'Due assessments' },
]

/** BR-LE-S10-4 — the Education Journal contribution (summary recap: class sessions + due assessments for the day). No
 *  `dueIn` agenda — the seam lists only the `/summary` digest (No-Guessing; the books summary-only precedent). */
export function createLearningEducationJournalContribution(
  svc: LearningEducationService,
): JournalContribution {
  return {
    module: 'learning-education',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayEducationDigest(date)
      // Any activity (a class session OR a due assessment) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState =
        digest.classSessions + digest.dueAssessments > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'learning-education',
        dataPoints: DATA_POINTS,
        state,
        items: [{ classSessions: digest.classSessions, dueAssessments: digest.dueAssessments }],
      }
    },
  }
}

/** Register the Education contribution into the Journals registry (the register-helper pattern, the books precedent). */
export function registerLearningEducationJournal(
  registry: JournalRegistry,
  svc: LearningEducationService,
): void {
  registry.register(createLearningEducationJournalContribution(svc))
}
