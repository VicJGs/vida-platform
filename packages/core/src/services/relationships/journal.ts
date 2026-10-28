// ============================================================================
// services/relationships — the Journal contribution + the SS-7 DueProvider registration (#56 ① · S9)
//
// Relationships registers TWO provider lanes (the purposes-S9 aggregator pattern — names no consumer):
//  · a `JournalContribution` into the Journals-owned registry — `summary(date)` feeds the daily recap with the day's
//    interactions + events + due reminders (the Journal `/summary` block). PULL path (ADR-004 §3.2.5 — the Journal is
//    pull-aggregated at render), NOT a rail push (relationships has NO measurement C1 / NO economy C2 → no PUSH).
//  · a `DueProvider` into the sessions SS-7 due-work lane — `getDueReminders(range)` (S4) surfaces due reminders /
//    stay-in-touch nudges / group fires as canonical `DueItem`s. The registry handles are PARAMS to these helpers
//    (not service deps — the projects/purposes precedent), so the service holds no unused registry field.
//
// A no-activity day returns a well-formed `state:'empty'` SectionData, never a throw. Reuses the TerminalState canon
// BY TYPE (state from the live digest, not deriveTerminalState — the purposes/projects precedent).
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { SessionsService } from '../sessions'
import type { RelationshipsService } from './types'

// The recap data points Relationships advertises (interactions + events + reminders due that day).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'interactions_today', label: 'Interactions' },
  { id: 'events_today', label: 'Events' },
  { id: 'reminders_due', label: 'Reminders due' },
]

/** The Relationships Journal contribution (summary recap: the day's interactions + events + due reminders). */
export function createRelationshipsJournalContribution(svc: RelationshipsService): JournalContribution {
  return {
    module: 'relationships',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const d = await svc.getDayRelationshipsDigest(date)
      // Any activity (an interaction, an event, or a reminder due today) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState = d.interactionsToday + d.eventsToday + d.remindersDue > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'relationships',
        dataPoints: DATA_POINTS,
        state,
        items: [{ interactionsToday: d.interactionsToday, eventsToday: d.eventsToday, remindersDue: d.remindersDue }],
      }
    },
  }
}

/** Register the Relationships contribution into the Journals registry (the register-helper pattern). */
export function registerRelationshipsJournal(registry: JournalRegistry, svc: RelationshipsService): void {
  registry.register(createRelationshipsJournalContribution(svc))
}

/** Register the relationships due-work lane into the sessions SS-7 seam (the `getDueReminders` R7 producer, S4). */
export function registerRelationshipsDueProvider(sessions: SessionsService, svc: RelationshipsService): void {
  sessions.registerDueProvider({ module: 'relationships', fetch: (range) => svc.getDueReminders(range) })
}
