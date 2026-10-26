// ============================================================================
// services/routines — the Journal contribution + the SS-7 DueProvider registration (mod-routines #64 ① · S9, the closer)
//
// Routines registers TWO provider lanes (the tasks/purposes/relationships two-lane aggregator pattern — names no consumer):
//  · a `JournalContribution` into the Journals-owned registry — `summary(date)` feeds the daily recap with each routine's
//    completions for the date (title · completed/skipped · duration, cross-module-integration §2 :69) + its evaluation
//    (RT-5 — the partial record, surfaced positively). PULL path, never a rail push.
//  · a `DueProvider` into the sessions SS-7 due-work lane — `getDueReminders(range)` surfaces the routine-days still due.
//    ONE due registration (SS-7 "aggregator, never duplicator"): no `JournalContribution.dueIn`, which would double-list
//    routines once the journals agenda reads Sessions (the journals→Sessions bridge is journals' contract, :32).
//
// The registry handles are PARAMS (not service deps). Shipped, NOT called: composition-root wiring is the fe-routines
// entity close (N5). This file imports ONLY the journals/sessions barrels + `./types` (the S9 structural gate).
// ============================================================================

import type { JournalContribution, JournalRegistry, SectionData } from '../journals'
import type { SessionsService } from '../sessions'
import { ROUTINES_DATA_POINTS, type RoutinesService } from './types'

/** The Routines Journal contribution — summary-only (the due-work agenda rides the sessions lane below). */
export function createRoutinesJournalContribution(svc: RoutinesService): JournalContribution {
  return {
    module: 'routines',
    sectionKey: 'summary',
    dataPoints: ROUTINES_DATA_POINTS,
    summary: (date: string): Promise<SectionData> => svc.summary(date),
  }
}

/** Register the Routines contribution into the Journals registry (overwrite-dedup by module). */
export function registerRoutinesJournal(registry: JournalRegistry, svc: RoutinesService): void {
  registry.register(createRoutinesJournalContribution(svc))
}

/** Register the routines due-work lane into the sessions SS-7 seam — the ONE lane through which the Calendar, the Journals
 *  agenda and the planner read routines; at M1 no composition root calls it (N5). */
export function registerRoutinesDueProvider(sessions: SessionsService, svc: RoutinesService): void {
  sessions.registerDueProvider({ module: 'routines', fetch: (range) => svc.getDueReminders(range) })
}
