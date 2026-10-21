// ============================================================================
// services/tasks — the Journal contribution + the SS-7 DueProvider registration (mod-tasks #65 ① · S9, the closer)
//
// Tasks registers TWO provider lanes (the purposes/relationships two-lane aggregator pattern — names no consumer):
//  · a `JournalContribution` into the Journals-owned registry — `summary(date)` feeds the daily recap with the day's
//    journal SET: every task due OR scheduled OR completed on the date, with title · status · priority (the governing
//    `cross-module-integration.md` §2 row; TAS-19 `surface_journal`). PULL path (ADR-004 §3.2.5 — a projection effect
//    "writes no row; pull-aggregated at render"), NOT a rail push: S3's completion catalogue never pushes it.
//  · a `DueProvider` into the sessions SS-7 due-work lane — `getDueReminders(range)` surfaces OPEN tasks due or
//    scheduled in the window as canonical `DueItem`s (`hard_deadline` = the due date). ONE registration, on Sessions:
//    the Journals agenda reads the shared `dueIn()` primitive (JR-5 / journals contract.md:32) and SS-7 is "aggregator,
//    never duplicator" — a second registration as `JournalContribution.dueIn` would double-list tasks once the journals
//    agenda reads Sessions. (Consequence in M1: `buildDashboard().agenda` carries no tasks section — the built engine
//    reads only `JournalContribution.dueIn`; the journals→Sessions bridge is journals' contract, not tasks'.)
//
// The registry handles are PARAMS to these helpers (not service deps — the projects/purposes precedent), so the
// service holds no unused registry field. A no-activity day returns a well-formed `state:'empty'` SectionData, never
// a throw. `state` reuses the TerminalState canon BY TYPE through `SectionData['state']` — this file imports ONLY the
// journals/sessions barrels + `./types` (the S9 structural gate), and the journals barrel does not re-export the canon.
// ============================================================================

import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { SessionsService } from '../sessions'
import type { TasksService } from './types'

// The recap data points Tasks advertises (JR-4 — the user's per-module selection): the two §2 memberships.
// snake_case ids = the shipped 10-module convention; the UX-6 `'due-today'` fixture is resolver test data, not a contract.
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'completed_today', label: 'Completed' },
  { id: 'due_today', label: 'Due today' },
]

/** The Tasks Journal contribution (summary recap: the day's journal set). Summary-only — the due-work agenda rides the
 *  sessions DueProvider lane (below), not `JournalContribution.dueIn` (SS-7: one registration). */
export function createTasksJournalContribution(svc: TasksService): JournalContribution {
  return {
    module: 'tasks',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const items = await svc.getDayTasksSummary(date)
      // Any member (completed, due or scheduled on the date) ⇒ success; a genuinely idle day ⇒ empty.
      const state: SectionData['state'] = items.length > 0 ? 'success' : 'empty'
      return { sectionKey: 'summary', module: 'tasks', dataPoints: DATA_POINTS, state, items }
    },
  }
}

/** Register the Tasks contribution into the Journals registry (the register-helper pattern; overwrite-dedup by module). */
export function registerTasksJournal(registry: JournalRegistry, svc: TasksService): void {
  registry.register(createTasksJournalContribution(svc))
}

/** Register the tasks due-work lane into the sessions SS-7 seam (the `getDueReminders` producer) — the ONE lane through
 *  which the Calendar, the Journals agenda and the planner will read tasks (SS-7); at M1 no composition root calls it. */
export function registerTasksDueProvider(sessions: SessionsService, svc: TasksService): void {
  sessions.registerDueProvider({ module: 'tasks', fetch: (range) => svc.getDueReminders(range) })
}
