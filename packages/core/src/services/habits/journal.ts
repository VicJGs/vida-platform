// ============================================================================
// services/habits — the Journal contribution (mod-habits #49 ① · S5)
//
// HB-6 / HAB-16 consumed-by: habits registers ONE JournalContribution into the Journals-owned registry —
// `summary(date)` feeds the daily recap with the day's due-habit count + how many are done. A no-due day
// returns a well-formed `state:'empty'` SectionData, never a throw (the per-section degrade is the
// dashboard's). Reuses the TerminalState canon BY TYPE (state from the live digest, not deriveTerminalState
// — the gamification/UX-4 precedent). Habits is an effect PRODUCER, not a handler owner → NO registerHabitsEffects.
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { HabitsService } from './types'

const DATA_POINTS: readonly DataPoint[] = [
  { id: 'due', label: 'Habits due' },
  { id: 'done', label: 'Completed' },
]

/** HB-6 — the habits Journal contribution (summary recap: due + done for the day; no `dueIn` agenda). */
export function createHabitsJournalContribution(svc: HabitsService): JournalContribution {
  return {
    module: 'habits',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayCompletionDigest(date)
      // BR-S5-7 — due-count>0 ⇒ success (a due-but-not-done day still HAS data to show); no due → empty.
      const state: TerminalState = digest.due > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'habits',
        dataPoints: DATA_POINTS,
        state,
        items: [{ due: digest.due, done: digest.done }],
      }
    },
  }
}

/** Register the habits contribution into the Journals registry (the register-helper pattern). */
export function registerHabitsJournal(registry: JournalRegistry, svc: HabitsService): void {
  registry.register(createHabitsJournalContribution(svc))
}
