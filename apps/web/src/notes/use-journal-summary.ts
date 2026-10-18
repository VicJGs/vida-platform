// ============================================================================
// useJournalSummary — the `/summary` block DATA seam (fe-notes-and-pages #27, S5).
// Consumes the MOD-journals ENGINE (`buildDashboard(date).summary`) — the aggregation
// + per-section degrade is engine-side (per-provider try/catch → {state:'error'});
// fe-notes RENDERS the resulting SectionData[] (NOT-32/34). Same stub discipline as
// useNoteEntity/useBacklinks: M1 DEFAULT = empty (no live apps/web journals composition
// root; D-S5-5 / S1-D2). `?sample` (DEV) → a MIXED-state section set for the gate.
//
// Live swap (zero signature change):
//   const d = await journals.buildDashboard(date, selection)   // createJournalsService
//   return { sections: d.summary, state: d.summary.length ? 'populated' : 'empty' }
//   // reject → 'error'; in-flight → 'loading'. RQ key ['journal','summary',date].
// The inline editor `/summary` block NODE-VIEW (E5 real body) is ui-3/#31 (F-S5-1), not here.
// ============================================================================
import type { SectionData } from '@vida/core'

export type SummaryState = 'loading' | 'error' | 'empty' | 'populated'
export interface JournalSummaryResult {
  sections: readonly SectionData[]
  state: SummaryState
}

// --- DEV/gate sample (NOT live data) — a MIXED-state set so EC-9 "degrade that section only" is visible (R1). ---
const SAMPLE_SECTIONS: readonly SectionData[] = [
  {
    sectionKey: 'summary',
    module: 'habits',
    dataPoints: [
      { id: 'h-done', label: '3 of 4 habits done' },
      { id: 'h-streak', label: 'Longest streak: 12 days' },
    ],
    state: 'success',
  },
  { sectionKey: 'summary', module: 'tasks', dataPoints: [], state: 'empty' },
  { sectionKey: 'summary', module: 'finance', dataPoints: [{ id: 'f-net', label: 'Net today' }], state: 'error' },
]

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** M1 default (empty) + the DEV/gate sample. `_date` is unused in the stub; the live swap un-prefixes it for
 *  `buildDashboard(date, …)` + the `['journal','summary',date]` key (call site unchanged — the S3/S4 convention). */
export function useJournalSummary(_date: string | null): JournalSummaryResult {
  if (devSampleActive()) return { sections: SAMPLE_SECTIONS, state: 'populated' }
  return { sections: [], state: 'empty' }
}
