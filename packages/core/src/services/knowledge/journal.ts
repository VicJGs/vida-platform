// ============================================================================
// services/knowledge — the Journal contribution (mod-knowledge #50 ① · S8)
//
// KNO-38/39 consumed-by: knowledge registers ONE JournalContribution into the Journals-owned registry —
// `summary(date)` feeds the daily recap with the day's objects-created + reviews-recorded counts. This is the
// PULL path (ADR-004 §3.2.5:84 — the Journal is pull-aggregated at render); the domain events `object.created`
// / `review.recorded` reach the dashboard here, not via a rail push. A no-activity day returns a well-formed
// `state:'empty'` SectionData, never a throw (the per-section degrade is the dashboard's). Reuses the
// TerminalState canon BY TYPE (state from the live digest, not deriveTerminalState — the habits/finance/gamification
// precedent). Knowledge is an effect PRODUCER, not a handler owner → NO registerKnowledgeEffects.
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { KnowledgeService } from './types'

// The recap data points knowledge advertises (JR-4 — the user's per-module selection).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'objects_created', label: 'Objects added' },
  { id: 'reviews_recorded', label: 'Reviews' },
]

/** KNO-38/39 (BR-KN-S8-5) — the knowledge Journal contribution (summary recap: objects added + reviews recorded
 *  for the day; no `dueIn` agenda — `getDue` is a study surface, not a daily-agenda primitive). */
export function createKnowledgeJournalContribution(svc: KnowledgeService): JournalContribution {
  return {
    module: 'knowledge',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayKnowledgeDigest(date)
      // BR-KN-S8-5 — any activity (an object added OR a review recorded) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState = digest.objectsCreated + digest.reviewsRecorded > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'knowledge',
        dataPoints: DATA_POINTS,
        state,
        items: [{ objectsCreated: digest.objectsCreated, reviewsRecorded: digest.reviewsRecorded }],
      }
    },
  }
}

/** Register the knowledge contribution into the Journals registry (the register-helper pattern). */
export function registerKnowledgeJournal(registry: JournalRegistry, svc: KnowledgeService): void {
  registry.register(createKnowledgeJournalContribution(svc))
}
