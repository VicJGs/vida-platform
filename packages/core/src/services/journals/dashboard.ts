// ============================================================================
// services/journals — the dashboard engine (mod-journals #39 · Slice 2)
//
// Assemble a day's dashboard from the S1 registry: the backward SUMMARY (each
// module's summary(date), filtered by the user's selection) + the forward
// AGENDA (each module's dueIn(today)). Per-section degrade (IR-d): a failing
// provider degrades ONLY its section — never a blank journal (JR-1 fail-loud).
// Pure over the in-memory registry — no db, no Preferences wiring (the selection
// storage is a seam, N-3). The S3 service wraps buildDashboard as a method.
// ============================================================================

import type { JournalRegistry } from './registry'
import type {
  DashboardData,
  HomeSectionKey,
  JournalContribution,
  JournalSelection,
  SectionData,
} from './types'

/** A section that failed to resolve — degraded in place (BR-S2-2 / IR-d). */
function degraded(module: string, sectionKey: HomeSectionKey): SectionData {
  return { sectionKey, module, dataPoints: [], state: 'error' }
}

/** Keep only the data points enabled for `module` in `selection`; no selection
 *  (or module absent) → all advertised points shown (BR-S2-4). */
function filterDataPoints(section: SectionData, selection?: JournalSelection): SectionData {
  const enabled = selection?.[section.module]
  if (!enabled) return section
  const set = new Set(enabled)
  return { ...section, dataPoints: section.dataPoints.filter((p) => set.has(p.id)) }
}

/**
 * Assemble the daily dashboard. Iterates `registry.list()` (deterministic,
 * BR-S1-2); each provider call is isolated (BR-S2-2) and its result normalized
 * to the section it belongs to by the producing method (BR-S2-5). Never throws
 * for a provider failure. `[FACT: journals/contract.md:17-18; business-rules.md:23-24,42-43]`
 */
export async function buildDashboard(
  registry: JournalRegistry,
  date: string,
  selection?: JournalSelection,
): Promise<DashboardData> {
  const summary: SectionData[] = []
  const agenda: SectionData[] = []

  for (const c of registry.list()) {
    summary.push(await resolveSection(c, 'summary', () => c.summary(date), selection))
    if (c.dueIn) {
      const dueIn = c.dueIn
      agenda.push(await resolveSection(c, 'agenda', () => dueIn({ from: date, to: date })))
    }
  }
  return { summary, agenda }
}

/** Resolve one provider call into a section, normalizing its sectionKey by the
 *  producing method and degrading on throw. Selection filtering applies to the
 *  summary recap only (agenda is the shared dueIn surface, BR-S2-5). */
async function resolveSection(
  c: JournalContribution,
  sectionKey: HomeSectionKey,
  call: () => SectionData | Promise<SectionData>,
  selection?: JournalSelection,
): Promise<SectionData> {
  try {
    const raw = await call()
    const normalized: SectionData = { ...raw, sectionKey, module: c.module }
    return selection ? filterDataPoints(normalized, selection) : normalized
  } catch {
    return degraded(c.module, sectionKey)
  }
}

/**
 * True when at least one section resolved to a non-error state — the journal
 * still renders (anti-blank, BR-3). Blank only if EVERY section errored. Lifted
 * from apps/web/src/home/section-state.ts. `[FACT: journals/business-rules.md:60]`
 */
export function journalStillRenders(sections: readonly SectionData[]): boolean {
  return sections.some((section) => section.state !== 'error')
}
