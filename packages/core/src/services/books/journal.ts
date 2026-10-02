// ============================================================================
// services/books — the Journal contribution (mod-books #51 ① · S10)
//
// BOO-30 consumed-by: Books registers ONE JournalContribution into the Journals-owned registry — `summary(date)` feeds
// the daily recap with the day's pages-read + reading-sessions-logged counts (the Journal `/summary` block,
// parts/books.md:40). This is the PULL path (ADR-004 §3.2.5 — the Journal is pull-aggregated at render); the
// reading-session activity reaches the dashboard here, not via a rail push (the S10 effect fan-out is measurement-only,
// C-E2 — no Journal projection). A no-activity day returns a well-formed `state:'empty'` SectionData, never a throw (the
// per-section degrade is the dashboard's). Reuses the TerminalState canon BY TYPE (state from the live digest, not
// deriveTerminalState — the knowledge/habits/finance precedent). The registry dedups by `module`, so Books ('books')
// coexists with knowledge ('knowledge') under the shared `sectionKey:'summary'`.
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { BooksService } from './types'

// The recap data points Books advertises (JR-4 — the user's per-module selection).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'pages_read', label: 'Pages read' },
  { id: 'sessions_logged', label: 'Reading sessions' },
]

/** BOO-30 (BR-BK-S10-5) — the books Journal contribution (summary recap: pages read + reading sessions logged for the
 *  day). No `dueIn` agenda — today's quotas are a Reading-Hub surface, not a daily-agenda primitive at M1. */
export function createBooksJournalContribution(svc: BooksService): JournalContribution {
  return {
    module: 'books',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayBooksDigest(date)
      // BR-BK-S10-5 — any activity (a page read OR a session logged) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState =
        digest.pagesRead + digest.sessionsLogged > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'books',
        dataPoints: DATA_POINTS,
        state,
        items: [
          {
            pagesRead: digest.pagesRead,
            sessionsLogged: digest.sessionsLogged,
            onPace: digest.onPace,
            behind: digest.behind,
          },
        ],
      }
    },
  }
}

/** Register the books contribution into the Journals registry (the register-helper pattern). */
export function registerBooksJournal(registry: JournalRegistry, svc: BooksService): void {
  registry.register(createBooksJournalContribution(svc))
}
