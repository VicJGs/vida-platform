// ============================================================================
// services/projects — the Journal contribution (mod-projects #54 ① · S9)
//
// Projects registers ONE JournalContribution into the Journals-owned registry — `summary(date)` feeds the daily
// recap with the day's active projects + due milestones (the Journal `/summary` block, contract.md). PULL path
// (ADR-004 §3.2.5 — the Journal is pull-aggregated at render); project activity reaches the dashboard here, NOT via
// a rail push (the S9 completion fan-out is measurement-only, C-E2 — no Journal projection). A no-activity day
// returns a well-formed `state:'empty'` SectionData, never a throw. Reuses the TerminalState canon BY TYPE (state
// from the live digest, not deriveTerminalState — the learning-education/books precedent). The registry dedups by
// `module`, so Projects coexists with the other modules under the shared `sectionKey:'summary'`.
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { ProjectsService } from './types'

// The recap data points Projects advertises (active projects + milestones due that day).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'active_projects', label: 'Active projects' },
  { id: 'due_milestones', label: 'Due milestones' },
]

/** The Projects Journal contribution (summary recap: active projects + due milestones for the day). Summary-only —
 *  no `dueIn` agenda (No-Guessing; the learning-education summary-only precedent). */
export function createProjectsJournalContribution(svc: ProjectsService): JournalContribution {
  return {
    module: 'projects',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      const digest = await svc.getDayProjectsDigest(date)
      // Any activity (an active project OR a milestone due today) ⇒ success; a genuinely idle day ⇒ empty.
      const state: TerminalState = digest.activeProjects + digest.dueMilestones > 0 ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'projects',
        dataPoints: DATA_POINTS,
        state,
        items: [{ activeProjects: digest.activeProjects, dueMilestones: digest.dueMilestones }],
      }
    },
  }
}

/** Register the Projects contribution into the Journals registry (the register-helper pattern). */
export function registerProjectsJournal(registry: JournalRegistry, svc: ProjectsService): void {
  registry.register(createProjectsJournalContribution(svc))
}
