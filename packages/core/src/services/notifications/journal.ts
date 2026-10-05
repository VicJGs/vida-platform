// ============================================================================
// services/notifications — the Journal contribution (mod-notifications #53 ① · S5)
//
// OQ-3: notifications registers ONE JournalContribution into the Journals-owned registry —
// `summary(date)` feeds the daily recap with the inbox badge (unread + the 3 attention types).
// This is the PULL path (ADR-004 §3.2.5 — the Journal is pull-aggregated at render). Notifications
// CONSUMES the Sessions `dueIn` agenda (S4 dispatcher); it is NOT an agenda provider → NO `dueIn`
// lane here (the gamification/knowledge summary-only precedent). A no-unread day returns a well-formed
// `state:'empty'` SectionData, never a throw (the per-section degrade is the dashboard's). Reuses the
// TerminalState canon BY TYPE (state from the live `unreadCounts`, not deriveTerminalState).
//
// NB (M1 scope): the recap is the CURRENT unread badge snapshot (what's unread now) — `date` is accepted
// for the contract but a per-day "received on `date`" delta is a documented refinement (the gamification
// snapshot precedent; would need a created_at-on-date query + TZ).
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { NotificationsService } from './types'

// The recap data points notifications advertises (JR-4 — the user's per-module selection).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'unread', label: 'Unread' },
  { id: 'error', label: 'Alerts' },
  { id: 'warning', label: 'Warnings' },
  { id: 'reminder', label: 'Reminders' },
]

/** OQ-3 (BR-NT-S5-1/2) — the notifications Journal contribution (summary recap: the current unread badge
 *  by attention type; no `dueIn` agenda — notifications consumes dueIn, it is not an agenda provider). */
export function createNotificationsJournalContribution(svc: NotificationsService): JournalContribution {
  return {
    module: 'notifications',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      // Snapshot recap: the current unread badge. `date` is accepted for the contract; a per-day
      // "received on `date`" delta is a documented refinement (the gamification snapshot precedent).
      void date
      const c = await svc.unreadCounts()
      const state: TerminalState = c.unread > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'notifications',
        dataPoints: DATA_POINTS,
        state,
        items: [{ unread: c.unread, error: c.error, warning: c.warning, reminder: c.reminder }],
      }
    },
  }
}

/** Register the notifications contribution into the Journals registry (the register-helper pattern). */
export function registerNotificationsJournal(registry: JournalRegistry, svc: NotificationsService): void {
  registry.register(createNotificationsJournalContribution(svc))
}
